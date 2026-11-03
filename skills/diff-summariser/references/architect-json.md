# Diffing native Architect JSON exports

## Why this path treats the export as an opaque tree

Genesys's own documentation describes a native Architect flow export
(`exportType: "architect"`, the default export format — flow files like
`i3InboundCallFlow`, `i3InQueueCallFlow`, etc.) as heavily-encoded JSON, not
intended to be read or edited as structured data. Archy YAML
(`exportType: "yaml"`) is Genesys's explicit human-readable alternative.

Practically, that means: don't assume you know what a given key means just
because it looks familiar, and don't build a schema-aware diff for this
format the way [`archy-yaml.md`](archy-yaml.md) does for Archy. Instead,
treat the export as a generic JSON tree and diff it structurally — report
exactly what changed, at what path, honestly labeled as structural rather
than semantic when the meaning isn't confidently knowable.

## Diff design

`scripts/diff_architect_json.py BEFORE.json AFTER.json [--flow-name NAME] [--json] [--terse] [-o OUTPUT.md]`

- **Recursive, schema-tolerant tree diff.** Walk both JSON trees in
  parallel. At each dict, compare keys as sets (order-independent — JSON
  object key order carries no meaning here) and recurse into shared keys.
- **Array alignment by signature, not position.** Arrays (e.g. a list of
  actions) are realigned by matching elements on a content signature
  (e.g. a hash of the element with any ID-shaped fields excluded) rather
  than by index — otherwise inserting one element in the middle of a list
  would misreport every element after it as "changed." An element whose
  signature appears in both arrays is matched and recursed into even if its
  index shifted; unmatched elements are reported as added/removed.
  Unresolved ties (duplicate signatures) break deterministically.
- **Possible cosmetic ID regeneration, bucketed separately.** Fields whose
  *only* difference matches a GUID/ID-like shape (e.g.
  `[0-9a-f]{8}-[0-9a-f]{4}-...`) are collected into a separate
  "possible cosmetic ID regeneration" bucket in the report rather than the
  main change list — since the export's schema isn't confirmed stable,
  treat this as a real uncertainty to surface, not noise to silently drop.
  The bucket is still present in `--json` output so a consumer can decide
  for itself whether to act on it.
- **Honest `kind` labeling.** When a real, located structural change can't
  be confidently mapped to one of the semantic `kind` values (see
  [`output-contract.md`](output-contract.md)), use
  `kind: "unknown_structural_change"` with the structural `path` populated
  (e.g. `flow.tasks[2].actions[5].config.value: "3" -> "5"`) rather than
  guessing at a more specific label.

## CLI

```
python3 scripts/diff_architect_json.py BEFORE.json AFTER.json [--flow-name NAME] [--json] [--terse] [-o OUTPUT.md]
```

- `--flow-name NAME` — overrides the flow name in the output (otherwise
  taken from the export itself, if findable).
- `--json` — emit the full [output-contract](output-contract.md) structure.
- `--terse` — one controlled-vocabulary line per change instead of full
  sentences.
- `-o OUTPUT.md` — write to a file instead of stdout.

Dependencies: Python stdlib only (`json`, `argparse`; no third-party
packages).
