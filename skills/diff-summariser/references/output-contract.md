# Output contract

This is the canonical schema every `diff-summariser` script produces, and
the shape `playback-deck/scripts/group_changes_for_slide.py` expects as
input. If you ever change this shape, update both skills' references to
this file together — this is the one place the two skills' behavior must
stay in sync.

## Top-level shape

```json
{
  "source": "architect_json",
  "confidence": "verified",
  "flow": "Card Replacement - Inbound Call",
  "generated_at": "2026-10-22T00:00:00Z",
  "changes": [
    {
      "category": "added",
      "flow": "Card Replacement - Inbound Call",
      "journey": "Card Replacement",
      "task": "Collect Account Number",
      "kind": "action_added",
      "element": "Validate Sort Code",
      "summary": "Added action 'Validate Sort Code' to task 'Collect Account Number'.",
      "detail": "New callData action calling 'ValidateSortCode'; no downstream task changes.",
      "path": "tasks[3].actions[5]"
    }
  ]
}
```

A bare `changes[]` array (no wrapping object) is also accepted by consumers
— both shapes must be supported by anything that reads this contract.

## Top-level fields

| Field | Type | Meaning |
|---|---|---|
| `source` | string | `architect_json` \| `archy_yaml` \| `notes` — which script produced this |
| `confidence` | string | `verified` \| `best_effort` — overall confidence for this run (see per-item override below) |
| `flow` | string | The flow name this diff/summary is about, when known |
| `generated_at` | string | ISO-8601 timestamp, when known |
| `changes` | array | The actual list of changes — see below |

## Per-change fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `category` | string | yes | `added` \| `changed` \| `removed` — the grouping axis `playback-deck` pattern 6 uses directly |
| `flow` | string | yes | Flow this change belongs to |
| `journey` | string | no | Business-level grouping (e.g. "Card Replacement"). Falls back to `flow` when absent — consumers should never treat a missing `journey` as an error |
| `task` | string | no | The task/state/menu this change is inside, when applicable |
| `kind` | string | yes | Controlled vocabulary, see below |
| `element` | string | no | The specific thing that changed (action name, choice label, etc.) |
| `summary` | string | yes | One plain-English sentence. This is what renders directly as a slide bullet or Jira comment line — write it as finished prose, not a code-style diff description |
| `detail` | string | no | Extra context beyond the one-line summary, when useful |
| `path` | string | no | Structural pointer into the source tree (mainly populated on the Architect-JSON path, where field names can't always be mapped to a semantic label) |
| `confidence` | string | no | Overrides the top-level `confidence` for this one item. Always present and set to `best_effort` on notes-derived items, even within an otherwise `verified` run |

## `kind` controlled vocabulary

- `action_added`, `action_removed`, `action_changed`
- `task_added`, `task_removed`
- `menu_choice_changed`
- `ref_target_changed`
- `flow_renamed`
- `unknown_structural_change` — the honest escape hatch for the Architect-JSON
  path: used when a structural change is real and located (there's a `path`)
  but can't be confidently labeled as one of the above given the export's
  opaque, unconfirmed schema. Prefer this over guessing a specific `kind`
  that implies more semantic certainty than the diff actually has.

Add new values here (not ad hoc in a script) if a genuinely new category of
change shows up — keeping the vocabulary centralized is what makes `--terse`
output and any future automated handling of `kind` reliable.

## Why `confidence` exists at both levels

A single run is usually uniform (a real export diff is `verified`
throughout; a notes-only run is `best_effort` throughout) — the top-level
field covers that common case cheaply. The per-item override exists for
mixed cases, e.g. a mostly-verified export diff where one item had to fall
back to a best-effort guess. Consumers should always check the per-item
field first and only fall back to the top-level value when the item doesn't
set its own.
