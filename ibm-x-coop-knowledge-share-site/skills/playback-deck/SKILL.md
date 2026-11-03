---
name: playback-deck
description: "Use whenever the user is creating, updating, or refreshing a biweekly 'Iteration Playback' deck, or any sprint/iteration review PowerPoint, for a Genesys Cloud Architect conversational-AI / chatbot delivery project. Trigger on mentions of: playback deck, iteration or sprint review slides, build-status slide, test KPIs or results slide, defect/bug status slide, 'what we built this iteration vs next iteration' slide, or turning Jira tickets / a changelog / a diff-summariser summary into slides. This is an EDITING workflow against the client's existing branded .pptx/.potx template, not a from-scratch deck build — trigger it any time an existing Playback template needs new or updated slides, even from something as short as 'update the deck' or 'add this iteration's slides', as long as an existing template/deck file is in play."
---

# Playback Deck

Build or update a fortnightly "Iteration Playback" deck by **editing the
client's existing branded `.pptx`/`.potx` template** — never by building a
deck from a blank presentation. The template already defines the theme,
layouts, fonts, and most of the slide structure; the job is to duplicate,
reorder, delete, and fill in slides within that structure, and leave
everything else untouched.

## Inputs this skill accepts

- The existing template/deck file (required — ask for it if not provided).
- What changed this iteration, as either:
  - Manual bullet points / a verbal description, or
  - A `changes[]` JSON array in the shape documented in
    [`diff-summariser`'s output contract](../diff-summariser/references/output-contract.md)
    (produced by the `diff-summariser` skill, or hand-written in the same
    shape — this skill doesn't require that skill to be installed).
- Test/KPI numbers, defect counts, and next-iteration plans, as given by the
  user — never invent these.

## The recipe

Follow this order. Steps 1-4 are structural; do them all before touching any
text or numbers, because adding/removing slides after content edits risks
clobbering work already done.

1. **Survey the template.** Render a labeled thumbnail grid of every slide
   and every layout so you know what already exists and which layout to
   instantiate for new content (see Mechanics below).
2. **Make all structural edits first**: duplicate a slide that's the closest
   match to what you need (preferred — it carries correct formatting), or
   instantiate a layout fresh for genuinely new slide types (e.g. a section
   divider). Reorder and delete as needed for this iteration's slide list.
3. **Clean up** orphaned slides/media/relationships left over from structural
   edits, once the slide order is finalized and before any content edit.
4. **Rezip** into a working `.pptx`.
5. **Edit content**: text, tables, chart data, stat tiles. Never leave a
   placeholder string unfilled, and never leave a stray duplicated row/column
   that wasn't deliberately repurposed.
6. **Validate** structurally against the original template as a baseline, so
   pre-existing template quirks aren't flagged as regressions you introduced.
7. **Sweep for leftover placeholders** (e.g. `Lorem ipsum`, `XX%`, `TBD`,
   copy-pasted names from a previous iteration) before calling it done.

## Mechanics

If the `pptx` skill is available in this environment, use it for every
structural/mechanical step above — it already handles the OOXML bookkeeping
(`[Content_Types].xml`, relationship IDs, slide ID lists) that's easy to get
wrong by hand:

- A thumbnail-rendering script for step 1.
- A slide-duplication/layout-instantiation script for step 2.
- A cleanup script for step 3.
- A structural validation script for step 6, run with a baseline/original
  comparison so existing template defects aren't reported as new ones.

Use `markitdown` (or equivalent content-extraction) for step 7's placeholder
sweep, and python-pptx (or direct XML inspection) for routine text/table/chart
edits in step 5.

**If the `pptx` skill is not available**, follow
[`references/pptx-editing-fallback.md`](references/pptx-editing-fallback.md)
instead — it covers the same structural steps using only general OOXML
knowledge and standard libraries. It's slower and less rigorous than the
dedicated skill, but sufficient.

## Slide patterns

Real Playback decks are ~70% a handful of recurring patterns. Full detail,
including exact table/column conventions and common pitfalls, is in
[`references/slide-patterns.md`](references/slide-patterns.md):

1. **Agenda**, with time-boxing per section.
2. **Section divider** — instantiate the divider layout directly; don't
   duplicate and strip a content slide.
3. **Journey/feature build-status table** — one row per journey/feature,
   color-coded status.
4. **Test KPI stat-tile row + results table.**
5. **Defect/bug status report** — prefer editing a native chart's underlying
   data over replacing it with a pasted image.
6. **"Built this iteration vs planned next iteration" split** — the
   integration point with `diff-summariser`'s output; see the reference for
   exactly how `changes[]` maps onto this slide's two columns.
7. **Round N / N+1 and exit-criteria callout** — increment from the previous
   deck's numbers; never guess them.

## Visual system

Use [`references/carbon-ibm-plex.md`](references/carbon-ibm-plex.md) for
color roles and type pairing *only* as a fallback or starting point. The
template's own theme (`ppt/theme/themeN.xml`) and existing slides are always
the source of truth when a real template is in hand — match what's already
there rather than imposing the reference palette over it.

## Out of scope — leave these alone

Don't attempt to generate or restructure:

- Architecture diagrams.
- Methodology/process deep-dive slides.
- The Colleague Training section.

These are genuinely bespoke per deck. Flag them to the user instead of
guessing at their content.

## Confidentiality

This skill and its reference material must never be seeded with real client
content. When creating examples, fixtures, or test decks, use the Northwind
Bank fictional universe (see the repo's `CLAUDE.md`). When working on a real
engagement deck, the real file lives outside this repo (e.g. in `local/`) —
never copy real slide content back into this skill's tracked files.

## Before calling it done

- [ ] Every new/duplicated slide uses a layout/format that already exists in
      the template — nothing freehand.
- [ ] No stray duplicated rows, placeholder text, or leftover previous-
      iteration content.
- [ ] Structural validation passes against the original-template baseline.
- [ ] Numbers (KPIs, defect counts, round numbers) came from the user, not
      invented.
- [ ] Architecture/methodology/Colleague Training slides were left untouched
      or explicitly flagged, not silently edited.
