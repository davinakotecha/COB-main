# notes-only example

Demonstrates the `diff-summariser` skill's fallback path: no before/after
flow export exists, only a freeform note from whoever made the change.

- [`sample-notes.txt`](sample-notes.txt) — the raw note (fictional, Northwind Bank universe).
- [`sample-notes.json`](sample-notes.json) — the structured output, produced with:

```bash
python3 skills/diff-summariser/scripts/summarise_notes.py \
  --flow "Northwind Bank - Card Replacement - Inbound Call" \
  --journey "Card Replacement" \
  --task "Collect Account Number" \
  --category added \
  --summary "Added a check for an in-progress replacement card request, so the flow reports its status instead of issuing a duplicate." \
  --json > examples/diff-summariser/notes/sample-notes.json
```

Note the result: `source` is `"notes"`, `confidence` is `"best_effort"`, and
the `summary` text has a `(from notes, not verified against a flow export)`
caveat appended automatically — this is the signal `playback-deck`'s
`group_changes_for_slide.py` uses to flag the bullet as unconfirmed rather
than treating it the same as a verified structural diff.
