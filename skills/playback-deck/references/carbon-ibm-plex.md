# Visual system: Carbon-style theme + IBM Plex Sans

This is a **fallback palette**, for the rare case where a Playback deck needs
a visual decision and there's no existing template slide to copy from. It is
not a substitute for the real template — always prefer the actual
`ppt/theme/themeN.xml` and existing slides when a template is in hand.

## Invented placeholder theme roles

The hex values below are **invented placeholders**, structurally similar in
character (navy/blue, financial-services) to a Carbon-themed deck, but they
are not any real client's actual theme values. Do not treat them as
authoritative — they exist so a slide isn't left unstyled, not to define the
brand.

| Role | Hex | Typical use |
|---|---|---|
| dk1 | `0A0A0A` | Primary body text |
| lt1 | `FFFFFF` | Slide background / light surfaces |
| dk2 | `0B1E40` | Headers, title text, dark surfaces |
| accent1 | `13294B` | Primary brand accent (dark navy) |
| accent2 | `1C78C0` | Secondary accent (mid blue) |
| accent3 | `EAF4FC` | Light tint — table row backgrounds, callout fills |
| accent4 | `F4F6F5` | Neutral light surface / card backgrounds |
| accent5 | `2E6BFF` | Interactive/highlight accent |
| accent6 | `7A7A7A` | Muted text, captions, secondary labels |

For status color-coding (build-status tables, defect severity, KPI
pass/fail), use clearly distinct hues rather than shades of one color —
e.g. a green family for "done/pass", an amber/yellow family for
"in progress/at risk", a red family for "blocked/fail/not started" — picked
from the real Carbon ramps below, not the placeholder roles above.

## Real Carbon color ramps — source accurately, don't hand-type

IBM's actual Carbon Design System ships full 10-step ramps (grades 10-100)
for `gray`, `blue`, `cyan`, `red`, `magenta`, `purple`, `teal`, `green`, and
`yellow` (plus `cool-gray`, `warm-gray`, `black`, `white`). These are genuine
public design tokens — not confidential — so when you need one, pull the
exact hex from the source rather than guessing or recalling from memory:

- The `@carbon/colors` npm package (`packages/colors/docs/sass.md` /
  `color-palette.json` in the [carbon-design-system/carbon](https://github.com/carbon-design-system/carbon)
  repo), or
- [carbondesignsystem.com](https://carbondesignsystem.com)'s color guidance
  pages.

As a worked, verified example, the **blue** ramp (Carbon v11) is:

| Grade | Hex |
|---|---|
| 10 | `#edf5ff` |
| 20 | `#d0e2ff` |
| 30 | `#a6c8ff` |
| 40 | `#78a9ff` |
| 50 | `#4589ff` |
| 60 | `#0f62fe` |
| 70 | `#0043ce` |
| 80 | `#002d9c` |
| 90 | `#001d6c` |
| 100 | `#001141` |

Grade 60 is typically the primary "interactive" shade for a given hue family;
grades 10-20 work as light tints/backgrounds, 70-100 as dark text-safe
shades. Apply that same grade logic to whichever other ramp a slide needs,
fetched fresh rather than copied from an uncertain source.

## IBM Plex Sans pairing

Typical pairing seen in Carbon-themed decks (confirm against the real
template's actual fonts before assuming):

- **IBM Plex Sans Light** — body text, table cells, captions.
- **IBM Plex Sans** (regular/medium) or **IBM Plex Sans SemiBold** — titles,
  stat-tile numbers, section headers.

### Rendering caveat

If previewing or rendering via LibreOffice (e.g. for a thumbnail grid) and
IBM Plex Sans isn't installed on the rendering machine, LibreOffice will
silently substitute a fallback font. Line-wrap and spacing in the preview may
not match what PowerPoint itself renders — treat such a preview as a
structural check (are elements present/positioned/filled in), not a
pixel-accurate proof of final appearance.
