# Summarising from notes only

Use this path when there's no before/after export to diff — just a
description of what changed (a verbal explanation, a quick note, a Jira
ticket's own description text).

## Rules

- Every item this path produces is tagged `confidence: "best_effort"` and
  `source: "notes"` — always, regardless of how detailed or confident the
  note sounds. A human description is not a verified structural diff, and
  the output must never claim otherwise.
- The human-readable `summary` line gets a visible caveat suffix, e.g.:
  `Added a sort-code validation step to the Collect Account Number task.
  (from notes, not verified against a flow export)` — so anyone reading the
  summary downstream (a Jira comment, a slide) sees the caveat in place,
  not just in the JSON metadata.
- **Ask, don't guess**, when the note doesn't name a flow, journey, or task.
  A best-effort summary of an identified change is useful; a best-effort
  guess at *which flow* changed is not — get that from the user rather than
  inferring it from context that might be wrong.
- If a `category` (`added`/`changed`/`removed`) isn't obvious from the
  note's wording, ask rather than defaulting silently — `changed` is an
  easy wrong default for something that was actually `added`.

## CLI

```
python3 scripts/summarise_notes.py --flow NAME [--journey NAME] [--task NAME] --category {added,changed,removed} --summary "TEXT" [--kind KIND] [--detail "TEXT"] [--json] [--terse] [--append-to FILE.json]
```

- `--flow`, `--category`, `--summary` are required — everything else is
  optional context.
- `--kind` — one of the controlled-vocabulary values in
  [`output-contract.md`](output-contract.md); if omitted, defaults to a
  generic kind derived from `--category` (e.g. `action_changed` for
  `changed`) — supply it explicitly when you know the more specific value.
- `--append-to FILE.json` — read `FILE.json` if it exists (or start a new
  `changes[]` array if not), append this item, and write it back. This is
  how several notes-derived items get accumulated into one combined
  `changes[]` array without hand-editing JSON.

Dependencies: Python stdlib only.
