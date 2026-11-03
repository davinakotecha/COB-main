#!/usr/bin/env python3
"""Diff two native Genesys Architect JSON flow exports.

Treats both trees as a generic, schema-tolerant structure rather than
assuming field meanings -- see ../references/architect-json.md for why.

    python3 scripts/diff_architect_json.py BEFORE.json AFTER.json \\
        [--flow-name NAME] [--json] [--terse] [-o OUTPUT.md]
"""
import argparse
import json
import re
import sys

from _common import build_report, emit, make_change

GUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
ID_KEY_RE = re.compile(r"(^id$|Id$|^guid$|Guid$)", re.IGNORECASE)
ARRAY_SEGMENT_RE = re.compile(r"(\w+)\[\d+\]")
PATH_SEG_RE = re.compile(r"([^.\[\]]+)|\[(\d+)\]")
IDENTITY_KEYS = ("name", "refId", "target", "key", "type")

_ABSENT = object()  # marks "this side doesn't have it" in a (path, before, after) tuple


def looks_like_guid(value):
    return isinstance(value, str) and bool(GUID_RE.match(value))


def signature(value):
    """Content signature for array alignment: equal iff identical except
    for ID/GUID-shaped fields anywhere inside."""
    if isinstance(value, dict):
        items = tuple(
            (k, signature(value[k]))
            for k in sorted(value.keys())
            if not (ID_KEY_RE.search(k) or looks_like_guid(value[k]))
        )
        return ("dict", items)
    if isinstance(value, list):
        return ("list", tuple(signature(v) for v in value))
    return ("scalar", value)


def identity_signature(value):
    """A looser 'this is probably the same thing' key, for elements whose
    full signature differs because something genuinely changed."""
    if isinstance(value, dict):
        for k in IDENTITY_KEYS:
            if k in value and isinstance(value[k], (str, int, float, bool)):
                return (k, value[k])
    return None


def find_flow_name(tree):
    if isinstance(tree, dict):
        for key in ("name", "flowName"):
            value = tree.get(key)
            if isinstance(value, str):
                return value
    return None


def diff_values(before, after, path, changes, id_churn):
    if type(before) is not type(after):
        changes.append((path, before, after))
        return
    if isinstance(before, dict):
        diff_dicts(before, after, path, changes, id_churn)
    elif isinstance(before, list):
        diff_lists(before, after, path, changes, id_churn)
    elif before != after:
        changes.append((path, before, after))


def diff_dicts(before, after, path, changes, id_churn):
    before_keys, after_keys = set(before.keys()), set(after.keys())
    for key in sorted(before_keys - after_keys):
        changes.append((f"{path}.{key}" if path else key, before[key], _ABSENT))
    for key in sorted(after_keys - before_keys):
        changes.append((f"{path}.{key}" if path else key, _ABSENT, after[key]))
    for key in sorted(before_keys & after_keys):
        b, a = before[key], after[key]
        if b == a:
            continue
        sub_path = f"{path}.{key}" if path else key
        if (ID_KEY_RE.search(key) or (looks_like_guid(b) and looks_like_guid(a))) and type(b) is type(a):
            id_churn.append((sub_path, b, a))
            continue
        diff_values(b, a, sub_path, changes, id_churn)


def diff_lists(before, after, path, changes, id_churn):
    b_unmatched = set(range(len(before)))
    a_unmatched = set(range(len(after)))
    pairs = []

    # Pass 1: exact content signature (ID-shaped fields excluded) -- catches
    # identical elements, including ones that only differ by GUID churn.
    b_sig = {i: signature(before[i]) for i in b_unmatched}
    a_sig = {i: signature(after[i]) for i in a_unmatched}
    for bi in sorted(b_unmatched):
        match = next((ai for ai in sorted(a_unmatched) if a_sig[ai] == b_sig[bi]), None)
        if match is not None:
            pairs.append((bi, match))
            a_unmatched.discard(match)
    b_unmatched -= {bi for bi, _ in pairs}

    # Pass 2: identity signature (name/refId/target/key/type) -- catches
    # elements that are "the same thing" but have a genuine content change.
    b_id = {i: identity_signature(before[i]) for i in b_unmatched}
    a_id = {i: identity_signature(after[i]) for i in a_unmatched}
    pass2 = []
    for bi in sorted(b_unmatched):
        if b_id[bi] is None:
            continue
        match = next((ai for ai in sorted(a_unmatched) if a_id[ai] == b_id[bi]), None)
        if match is not None:
            pass2.append((bi, match))
            a_unmatched.discard(match)
    pairs.extend(pass2)
    b_unmatched -= {bi for bi, _ in pass2}

    # Pass 3: positional best-effort pairing of whatever's left.
    pass3 = list(zip(sorted(b_unmatched), sorted(a_unmatched)))
    pairs.extend(pass3)
    b_unmatched -= {bi for bi, _ in pass3}
    a_unmatched -= {ai for _, ai in pass3}

    for bi, ai in pairs:
        diff_values(before[bi], after[ai], f"{path}[{bi}]", changes, id_churn)
    for bi in sorted(b_unmatched):
        changes.append((f"{path}[{bi}]", before[bi], _ABSENT))
    for ai in sorted(a_unmatched):
        changes.append((f"{path}[{ai}]", _ABSENT, after[ai]))


def nearest_array_name(path):
    matches = ARRAY_SEGMENT_RE.findall(path)
    return matches[-1] if matches else None


def named_ancestors(tree, path, limit=2):
    """Walk from `tree` down `path`, returning up to `limit` names found on
    dicts along the way (nearest first) -- best-effort human labels for an
    opaque-tree change."""
    nodes = [tree]
    cur = tree
    for key, idx in PATH_SEG_RE.findall(path):
        if key:
            cur = cur.get(key) if isinstance(cur, dict) else None
        else:
            i = int(idx)
            cur = cur[i] if isinstance(cur, list) and 0 <= i < len(cur) else None
        nodes.append(cur)
    names = []
    for node in reversed(nodes):
        if isinstance(node, dict) and isinstance(node.get("name"), str):
            names.append(node["name"])
            if len(names) >= limit:
                break
    return names


def classify(path, before_val, after_val):
    array_name = nearest_array_name(path)
    added = before_val is _ABSENT
    removed = after_val is _ABSENT
    category = "added" if added else "removed" if removed else "changed"

    if array_name == "actions":
        kind = {"added": "action_added", "removed": "action_removed", "changed": "action_changed"}[category]
    elif array_name == "tasks":
        kind = {"added": "task_added", "removed": "task_removed", "changed": "unknown_structural_change"}[category]
    elif array_name in ("choices", "menus"):
        kind = "menu_choice_changed"
    else:
        kind = "unknown_structural_change"
    return category, kind


def describe_value(v):
    if v is _ABSENT:
        return "nothing"
    if isinstance(v, (dict, list)):
        text = json.dumps(v, sort_keys=True)
        return text if len(text) <= 80 else text[:77] + "..."
    return repr(v)


def build_change_dict(flow_name, path, before_val, after_val, before_tree, after_tree):
    category, kind = classify(path, before_val, after_val)
    ref_tree = before_tree if category == "removed" else after_tree
    names = named_ancestors(ref_tree, path)
    element = names[0] if names else None
    task = names[1] if len(names) > 1 else None

    if kind == "action_added":
        summary = f"Added action '{element}'" + (f" to task '{task}'." if task else f" at '{path}'.")
    elif kind == "action_removed":
        summary = f"Removed action '{element}'" + (f" from task '{task}'." if task else f" at '{path}'.")
    elif kind == "action_changed":
        summary = f"Changed action '{element}'" + (f" in task '{task}'" if task else "") + f" ({path})."
    elif kind == "task_added":
        summary = f"Added task '{element}'." if element else f"Added a task at '{path}'."
    elif kind == "task_removed":
        summary = f"Removed task '{element}'." if element else f"Removed the task at '{path}'."
    elif kind == "menu_choice_changed":
        summary = f"Changed menu choice '{element}'." if element else f"Changed a menu/choice at '{path}'."
    else:
        bv, av = describe_value(before_val), describe_value(after_val)
        if category == "changed":
            summary = f"Changed '{path}' from {bv} to {av}."
        elif category == "added":
            summary = f"Added '{path}' ({av})."
        else:
            summary = f"Removed '{path}' (was {bv})."

    return make_change(
        category=category,
        flow=flow_name,
        kind=kind,
        summary=summary,
        task=task,
        element=element,
        path=path,
    )


def main():
    parser = argparse.ArgumentParser(description="Diff two native Genesys Architect JSON flow exports.")
    parser.add_argument("before", help="Path to the 'before' export JSON file.")
    parser.add_argument("after", help="Path to the 'after' export JSON file.")
    parser.add_argument("--flow-name", help="Override the flow name in the output.")
    parser.add_argument("--json", action="store_true", help="Emit the full output-contract JSON structure.")
    parser.add_argument("--terse", action="store_true", help="One controlled-vocabulary line per change.")
    parser.add_argument("-o", "--output", help="Write to a file instead of stdout.")
    args = parser.parse_args()

    with open(args.before, "r", encoding="utf-8") as f:
        before_tree = json.load(f)
    with open(args.after, "r", encoding="utf-8") as f:
        after_tree = json.load(f)

    flow_name = args.flow_name or find_flow_name(after_tree) or find_flow_name(before_tree)

    raw_changes = []
    id_churn = []
    diff_values(before_tree, after_tree, "", raw_changes, id_churn)

    changes = [
        build_change_dict(flow_name, path, b, a, before_tree, after_tree)
        for path, b, a in raw_changes
    ]

    report = build_report(source="architect_json", confidence="verified", changes=changes, flow=flow_name)
    report["possible_cosmetic_id_changes"] = [
        {"path": p, "before": b, "after": a} for p, b, a in id_churn
    ]

    emit(report, as_json=args.json, terse=args.terse, out_path=args.output)

    if not args.json and id_churn:
        footer = (
            f"\n({len(id_churn)} ID/GUID-only change(s) omitted as likely cosmetic "
            "regeneration -- rerun with --json to see them.)\n"
        )
        if args.output:
            with open(args.output, "a", encoding="utf-8") as f:
                f.write(footer)
        else:
            sys.stdout.write(footer)


if __name__ == "__main__":
    main()
