# Slide patterns

Table of contents: [1. Agenda](#1-agenda) · [2. Section divider](#2-section-divider) ·
[3. Journey/feature build-status table](#3-journeyfeature-build-status-table) ·
[4. Test KPI stat-tiles + results table](#4-test-kpi-stat-tiles--results-table) ·
[5. Defect/bug status report](#5-defectbug-status-report) ·
[6. Built this iteration vs planned next iteration](#6-built-this-iteration-vs-planned-next-iteration) ·
[7. Round N / N+1 and exit criteria](#7-round-n--n1-and-exit-criteria) ·
[Out of scope](#out-of-scope)

Each pattern below assumes a matching slide already exists somewhere in the
template (this or a previous iteration's deck) to duplicate. If genuinely
none exists, instantiate the closest layout instead and expect to do more
manual formatting.

## 1. Agenda

One row per section of the deck, each with a rough time allocation (e.g.
"5 min", "10 min"). When updating for a new iteration:

- Keep the section list in the same order the deck actually presents them.
- Update time-boxes only if the user gives you new ones — don't rebalance
  them yourself.
- If a section was added/removed this iteration (e.g. a new journey demo),
  add/remove its agenda row to match.

## 2. Section divider

A large title-only slide marking the start of a section (e.g. "Journey
Demos", "Testing & Quality", "What's Next"). **Instantiate the divider
layout directly rather than duplicating and stripping a content slide** —
content slides carry placeholders/tables that are easy to leave in
half-deleted, and dividers usually sit on a visually distinct layout anyway
(different background treatment, centered title block).

## 3. Journey/feature build-status table

One row per journey or feature, typically with columns like: Journey/Feature
name, Status, % complete or build state, Notes. Status is usually
color-coded (e.g. green = done, amber = in progress, red = blocked/not
started, grey = not started).

- When this iteration has a **different number of journeys** than the
  template's existing table: **duplicate or delete whole rows**, don't just
  overtype text into a fixed row count and leave extras blank, or delete
  cells without removing the row. A stray empty row reads as a mistake.
  Duplicating a row (not the whole slide) preserves its per-cell formatting
  better than retyping into a differently-formatted row.
- Status colors should come from the Carbon ramp guidance in
  [`carbon-ibm-plex.md`](carbon-ibm-plex.md), or — preferably — by copying
  the exact fill already used for that status elsewhere in the template.
- Never invent a status or % complete — if the user hasn't given you one for
  a journey that's in scope this iteration, ask rather than guess.

## 4. Test KPI stat-tiles + results table

A row of large-number "stat tiles" (e.g. test cases run, pass rate, defects
found) above or beside a more detailed results table (e.g. per-journey pass/
fail counts).

- Stat-tile numbers are usually the heaviest-weight text on the slide — keep
  that visual hierarchy when editing (don't shrink the number to fit longer
  text; shorten the label instead).
- Cross-check: the results table's numbers should be consistent with the
  stat tiles above them (e.g. tile "pass rate: 92%" should match what the
  table's pass/fail counts actually compute to). Flag a mismatch to the user
  rather than silently reconciling it one way or the other.

## 5. Defect/bug status report

Typically a chart (bar/donut by severity or by status) plus a short table or
callout of notable defects.

- **Prefer editing the chart's underlying data** over replacing the chart
  with a pasted image or screenshot — a native chart stays editable and
  on-theme; an image doesn't and tends to look visibly out of place at
  presentation resolution.
- If the chart's data lives in an embedded worksheet, edit that; don't try to
  redraw the chart's visual shape manually.
- Severity/status labels and colors should match whatever convention the
  template already uses — don't introduce a new severity scheme.

## 6. Built this iteration vs planned next iteration

The integration point with the `diff-summariser` skill. Typically a
two-column slide: left column "What we built this iteration", right column
"What's planned next iteration".

**Left column**, when a `changes[]` array (from `diff-summariser`, or
hand-written in the same shape — see
[`../../diff-summariser/references/output-contract.md`](../../diff-summariser/references/output-contract.md))
is available:

1. Group items by `journey` (fall back to `flow` when `journey` is absent)
   — this matches how stakeholders think about the work, not how the flows
   are technically structured.
2. Within a journey group, lead with `category: "added"` items, since
   "what's new" is usually what the audience cares about most; `changed` and
   `removed` follow.
3. Use each item's `summary` field directly as the bullet text — it's
   already written as a plain-English sentence.
4. Any item with `confidence: "best_effort"` must be visibly flagged as
   unverified on the slide (e.g. a small "unconfirmed" tag or distinct
   bullet styling) — don't present notes-derived content with the same
   visual confidence as a verified flow diff.
5. [`../scripts/group_changes_for_slide.py`](../scripts/group_changes_for_slide.py)
   automates steps 1-2 into a ready-to-use markdown outline:
   `python3 scripts/group_changes_for_slide.py changes.json --by journey -o outline.md`.

**Right column** ("planned next iteration") is manual-only — it reflects
upcoming plans, not anything a diff tool can derive. Ask the user, or carry
forward from the previous deck's "next iteration" column if nothing new was
given.

## 7. Round N / N+1 and exit criteria

A callout or small table tracking which testing/UAT round the project is in,
what's needed to exit the current round, and when the next round starts.

- **Increment from the previous deck's actual numbers** — read the last
  deck's Round N value and move forward from there. Never guess a round
  number from scratch.
- Exit criteria text should carry forward unchanged unless the user
  explicitly says it changed.

## Out of scope

Do not generate or restructure these, even if asked to "tidy up" the whole
deck — flag them to the user instead:

- **Architecture diagrams** — these encode real technical decisions that
  need an engineer's review, not a slide-formatting pass.
- **Methodology/process deep-dive slides** — bespoke per audience and
  typically reused verbatim across many iterations.
- **Colleague Training section** — content ownership sits outside the
  Playback deck's usual update cycle.
