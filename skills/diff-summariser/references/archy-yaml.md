# Diffing Archy YAML (CX-as-Code)

Unlike the native Architect JSON export, Archy's YAML structure is
documented and genuinely human-readable — this path can afford to be
schema-aware rather than treating everything as an opaque tree.

## Structure

A flow file's top-level key is the flow type (e.g. `inboundCall`), containing:

- `name`, `defaultLanguage`, `startUpRef`, optionally `initialGreeting`
- `menus:`, `tasks:`, `states:` — arrays, each element a single-key typed
  object (`menu:`, `task:`, `state:`) carrying at least `name` and `refId`,
  and nested `actions:` / `choices:` arrays of further typed action objects
  (`playAudio`, `disconnect`, `transferToGroup`, `menuDisconnect`,
  `callData`, etc.)

Worked example (Northwind Bank, fictional):

```yaml
inboundCall:
  name: Northwind Bank - Card Replacement
  defaultLanguage: en-us
  startUpRef: ./flow.yaml#/menus/menu[mainMenu]
  menus:
    - menu:
        name: Main Menu
        refId: mainMenu
        choices:
          - menuChoice:
              dtmf: "1"
              name: Card Replacement
              targetRef: ./flow.yaml#/tasks/task[collectAccountNumber]
  tasks:
    - task:
        name: Collect Account Number
        refId: collectAccountNumber
        actions:
          - callData:
              name: Validate Sort Code
              target: ValidateSortCode
```

### `ref:` / `refArray:`

External or internal fragments are pulled in with `ref:` (single) or
`refArray:` (multiple), pointing at a path plus a `refId` filter, e.g.:

```yaml
ref: ./common-fragment.yaml#/common/tasks/task[sharedGreeting]/actions
```

## Diff design

`scripts/diff_archy_yaml.py BEFORE.yaml AFTER.yaml [--resolve-refs] [--json] [--terse] [-o OUTPUT.md]`

- Load both files with PyYAML.
- Walk the known shape (`menus`/`tasks`/`states` → `actions`/`choices`) so
  changes get semantically labeled `kind` values (see
  [`output-contract.md`](output-contract.md)): `task_added`/`task_removed`,
  `action_added`/`action_removed`/`action_changed`,
  `menu_choice_changed` (e.g. a changed `dtmf` digit or `targetRef`),
  `ref_target_changed`, `flow_renamed`.
- **`ref:`/`refArray:` handling**: with `--resolve-refs`, load the
  referenced file (resolved relative to the file that references it) and
  diff into the resolved content, so a change hidden behind a shared
  fragment is still surfaced. Without that flag, or when the referenced
  file can't be found, still report a changed `ref:`/`refArray:` *target
  string itself* as a `ref_target_changed` item — don't silently skip it
  just because it wasn't followed.
- Match array elements (menu choices, actions, tasks) by `refId` when
  present (far more reliable than position — flows get reordered and
  `refId`s don't), falling back to a content signature when `refId` is
  absent.

## CLI

```
python3 scripts/diff_archy_yaml.py BEFORE.yaml AFTER.yaml [--resolve-refs] [--json] [--terse] [-o OUTPUT.md]
```

- `--resolve-refs` — follow `ref:`/`refArray:` pointers and diff into the
  resolved content, not just the pointer string.
- `--json` / `--terse` / `-o` — same as the Architect-JSON script.

Dependencies: **PyYAML** (not in the standard library). The script guards
the import and prints `pip install pyyaml` as the remedy on `ImportError`
rather than failing with a raw traceback.
