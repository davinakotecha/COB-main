# Editing a .pptx without a dedicated skill

This is an independent fallback, written from general OOXML (ECMA-376 /
ISO-29500) knowledge, for environments where no dedicated PowerPoint-editing
skill is available. It's slower and less rigorous — prefer a dedicated skill
when you have one. This file does not reproduce any such skill's code or
text; it describes the underlying file format directly.

## What a .pptx actually is

A `.pptx` is a ZIP archive of XML parts. The ones that matter for slide-level
structural edits:

- **`[Content_Types].xml`** (root) — declares content types for parts.
  Has `Default` entries (by file extension, e.g. all `.xml` parts get a
  generic default) and `Override` entries (by exact part path, for parts
  that need a specific content type the extension-based default can't
  express — every slide part needs an `Override` naming the
  `presentationml.slide+xml` content type).
- **`ppt/presentation.xml`** — contains `<p:sldIdLst>`, an ordered list of
  `<p:sldId id="..." r:id="rIdN"/>` entries. This list's **order is the
  deck's actual slide order**, and each entry's `r:id` points to a
  relationship (not directly to a filename).
- **`ppt/_rels/presentation.xml.rels`** — maps each `rIdN` used above to an
  actual part path, e.g. `slides/slide7.xml`.
- **`ppt/slides/slideN.xml`** plus **`ppt/slides/_rels/slideN.xml.rels`** —
  one pair per slide; the `.rels` file points at that slide's layout and any
  media/chart parts it embeds.
- **`ppt/slideLayouts/slideLayoutN.xml`** — layouts, each related to a
  **`ppt/slideMasters/slideMasterN.xml`**.
- **`ppt/theme/themeN.xml`** — color scheme (`<a:clrScheme>`: dk1, lt1, dk2,
  lt2, accent1-6, hlink, folHlink) and font scheme (`<a:fontScheme>`: major/
  minor Latin typeface).

Relevant namespace prefixes: `p:` = presentationml, `a:` = drawingml,
`r:` = the relationships namespace used for `r:id` attributes.

## Duplicating a slide by hand

1. Pick the slide XML part closest to what you need, e.g.
   `ppt/slides/slide7.xml`, and its `.rels` file.
2. Copy both to new part names not already in use, e.g. `slide23.xml` and
   `slide23.xml.rels`. If the copied slide embeds its own media (images,
   charts) that should be independent of the original (not shared), copy
   those parts too and repoint the new `.rels` file's targets at the copies;
   if sharing is fine (e.g. a logo image), leave the `.rels` targets as-is.
3. Add a `<Override PartName="/ppt/slides/slide23.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
   entry to `[Content_Types].xml`.
4. Add a new relationship in `ppt/_rels/presentation.xml.rels`:
   `<Relationship Id="rIdNN" Type=".../relationships/slide" Target="slides/slide23.xml"/>`,
   using an `Id` not already used in that file.
5. Add a new `<p:sldId id="..." r:id="rIdNN"/>` entry to `<p:sldIdLst>` in
   `ppt/presentation.xml`, **in the position you want it in the deck** —
   list order is deck order. The `id` attribute must be a unique integer
   across the whole list (existing decks commonly start new ids above 255;
   just pick the next unused integer higher than every existing `id`).

   **If you build this element with `minidom`'s DOM API** (rather than by
   string templating), set the two attributes carefully:
   `createElement("p:sldId")` followed by `setAttribute("id", ...)` and
   `setAttribute("r:id", ...)`, in either order, silently drops the plain
   `id` attribute. minidom tracks attributes internally by
   `(namespaceURI, localName)` even when you never call a namespace-aware
   method, and it derives `localName` by naively splitting the attribute
   name on `:` — so a plain `id` attribute and *any* `*:id` attribute (not
   just `r:id`) resolve to the same `(None, "id")` key, and whichever
   `setAttribute` call runs second evicts the first. Use
   `setAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "r:id", ...)`
   instead of plain `setAttribute` for `r:id` — the real namespace URI keys
   it as `(R_NS, "id")`, which no longer collides. Both the broken and fixed
   versions serialize to XML that loads fine under `python-pptx`; only a
   real XSD validator catches the missing attribute (see "Validating
   without a dedicated checker" below).

## Deleting a slide by hand

1. Remove its `<p:sldId>` entry from `<p:sldIdLst>`.
2. Remove the corresponding relationship entry from
   `ppt/_rels/presentation.xml.rels`.
3. Delete the now-orphaned `ppt/slides/slideN.xml` and its `.rels` file, and
   any media/chart parts that were exclusively used by that slide (check
   whether other slides' `.rels` files reference the same media before
   deleting it — shared images/logos should survive).
4. Remove the slide's `Override` entry from `[Content_Types].xml`.

Leaving orphaned parts behind (skipping step 3/4) generally doesn't break
the file, but it bloats it and can confuse later edits — clean it up at the
same time you do the structural edit, not as an afterthought.

## Editing content safely

Parse slide XML with `xml.dom.minidom` (or its hardened wrapper,
`defusedxml.minidom`, which guards against entity-expansion attacks when
parsing untrusted XML — worth using on principle). **Avoid
`xml.etree.ElementTree`** for round-tripping OOXML parts: it doesn't
preserve the original namespace prefix bindings on serialization and tends
to rewrite them to auto-generated prefixes (`ns0:`, `ns1:`, ...). The result
can be semantically-equivalent XML that several real-world OOXML consumers
nonetheless fail to open correctly — minidom preserves prefixes as literally
written in the source, which is much safer here.

When editing text runs, tables, or chart data, change existing elements'
text content in place rather than restructuring the XML tree — this
preserves formatting (`<a:rPr>` run properties, table cell styles) that
lives in sibling/parent elements you're not touching.

## Rezipping

Repack the directory/part set back into a `.pptx` with Python's `zipfile`
module (or equivalent). Use forward slashes for all internal paths
regardless of host OS, and don't rely on any particular entry ordering —
treat the ZIP as a part store, not a sequential stream.

## Validating without a dedicated checker

No bundled schema validator means falling back to weaker but still useful
checks:

1. **Load-check**: open the result with `python-pptx`
   (`Presentation("out.pptx")`) — it will raise on serious structural
   corruption, though it's lenient and won't catch every schema violation a
   strict XSD validator would.
2. **Slide-count sanity check**: confirm the deck has exactly as many slides
   as you intended after the edit (a cheap, easy-to-automate positive
   control for off-by-one mistakes in `sldIdLst` edits).
3. **Visual render**, if LibreOffice is available:
   `soffice --headless --convert-to pdf out.pptx`, then optionally
   `pdftoppm` to images — inspect that new/duplicated slides actually show
   the expected content and layout, not just that the file opens.

This combination catches the common failure modes (broken relationship,
duplicate ID, orphaned reference) without a full schema validator, but it's
not a substitute for one — treat a clean result here as "probably fine," not
"guaranteed valid," and prefer a dedicated validation tool when one is
available.
