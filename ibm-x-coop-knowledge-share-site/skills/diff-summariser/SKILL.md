---
name: diff-summariser
description: "Use whenever the user needs a plain-English, consistently-formatted summary of a change to a Genesys Cloud Architect conversational-AI / IVR flow — for a Jira ticket comment, a changelog entry, or content to feed into an Iteration Playback deck. Trigger on: a Genesys Architect flow export (JSON, e.g. an i3InboundCall or other i3<Type>Flow file), an Archy YAML / CX-as-Code flow file, phrases like 'what changed in this flow', comparing two flow versions or exports, summarizing a flow/config change for a ticket, or even just a freeform note describing a flow edit with no export available. Works with a before/after pair (preferred, most reliable) OR notes-only when no clean export exists — always produces a usable, same-shape summary either way, and never requires any other skill to be present."
---

# Diff Summariser

Turn a change to a Genesys Cloud Architect flow into a plain-English,
consistently-structured summary — for a Jira comment, a changelog entry, or
as input to the `playback-deck` skill's "built this iteration" slide. Always
produces output in the same shape (see
[`references/output-contract.md`](references/output-contract.md)) regardless
of which input variant below was used, so downstream consumers never need to
special-case the source.

## Pick the right variant

| You have | Use | Reference |
|---|---|---|
| Two Architect flow exports (JSON, e.g. `i3InboundCallFlow`) — before and after | `scripts/diff_architect_json.py` | [`references/architect-json.md`](references/architect-json.md) |
| Two Archy YAML (CX-as-Code) files — before and after | `scripts/diff_archy_yaml.py` | [`references/archy-yaml.md`](references/archy-yaml.md) |
| No export at all, just a description of what changed | `scripts/summarise_notes.py` | [`references/notes-fallback.md`](references/notes-fallback.md) |

If you have an export for one side but not the other (e.g. "after" only, or
a screenshot), treat it as the notes-only case — don't guess at a "before"
that wasn't actually exported.

## Evidence reliability

These three paths are not equally trustworthy, and the output says so via
the `confidence` field:

1. **A real before/after export diff** (`architect_json` or `archy_yaml`) —
   `confidence: "verified"`. The tool actually compared two real structural
   snapshots.
2. **Notes only** — `confidence: "best_effort"`, always. Even a precise,
   confident-sounding note is still a human description, not a verified
   diff — never upgrade its confidence based on how detailed it sounds.

When both an export diff and a note about the same change exist, prefer the
export diff's output; use the note only to fill gaps the export can't speak
to (e.g. *why* a value changed).

## Output contract

Every path emits the same two-tier shape, defined once in
[`references/output-contract.md`](references/output-contract.md):

- **Terse line** (`--terse`): a controlled-vocabulary one-liner per change,
  e.g. `action_added: Validate Sort Code (Collect Account Number)` — for
  quick scanning or a Jira comment that needs to stay short.
- **Human summary** (default): a full plain-English sentence per change —
  the `summary` field, written to be used directly as prose or a slide
  bullet.
- **`--json`**: the full structured array (all fields, including `path`,
  `detail`, `confidence`, `source`) — this is what `playback-deck` or any
  other downstream consumer should actually parse; don't scrape the
  human-readable text output.

All three scripts share this contract via `scripts/_common.py` — their
output shape cannot drift from each other because they build it through the
same function.

## Handoff to playback-deck

`--json` output (or `{"changes": [...]}`-wrapped output) is exactly the
input `playback-deck`'s `group_changes_for_slide.py` expects — see that
skill's [`references/slide-patterns.md`](../playback-deck/references/slide-patterns.md#6-built-this-iteration-vs-planned-next-iteration)
pattern 6. No special handling needed on either side.

## Confidentiality

Never seed this skill's examples or reference content with real client flow
names, real ticket keys, or real exported JSON/YAML. Use the Northwind Bank
fictional universe (see the repo's `CLAUDE.md`) for anything committed here.
Real exports being diffed during actual engagement work should live outside
this repo (e.g. in `local/`), passed to the scripts by path at run time —
never copied into this skill's tracked files.
