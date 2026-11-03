#!/usr/bin/env python3
"""Diff two Archy YAML (CX-as-Code) flow files.

Unlike the Architect-JSON path, Archy's shape is documented, so this script
walks it schema-aware -- see ../references/archy-yaml.md for the design.

    python3 scripts/diff_archy_yaml.py BEFORE.yaml AFTER.yaml \\
        [--resolve-refs] [--json] [--terse] [-o OUTPUT.md]
"""
import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "diff_archy_yaml.py requires PyYAML, which isn't installed.\n\n"
        "    pip install pyyaml\n\n"
    )
    sys.exit(1)

from _common import build_report, emit, make_change

ARRAY_SECTIONS = ("menus", "tasks", "states")
ACTION_SECTIONS = ("actions", "choices")
SECTION_WORD = {"menus": "menu", "tasks": "task", "states": "state", "actions": "action", "choices": "choice"}
ADDED_KIND = {"menus": "task_added", "tasks": "task_added", "states": "task_added",
              "actions": "action_added", "choices": "menu_choice_changed"}
REMOVED_KIND = {"menus": "task_removed", "tasks": "task_removed", "states": "task_removed",
                "actions": "action_removed", "choices": "menu_choice_changed"}

REF_FRAGMENT_RE = re.compile(r"^(?P<file>[^#]*)#(?P<pointer>.+)$")
BRACKET_RE = re.compile(r"^([^\[\]]+)\[([^\[\]]+)\]$")


def load_yaml(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def top_level_flow(doc):
    if isinstance(doc, dict) and len(doc) == 1:
        ((k, v),) = doc.items()
        return k, v
    return None, None


def typed_item(obj):
    """Archy nests each array element as {typeName: {...}}; unwrap it."""
    if isinstance(obj, dict) and len(obj) == 1:
        ((type_name, inner),) = obj.items()
        if isinstance(inner, dict):
            return type_name, inner
    return None, obj


def refid_of(obj):
    _, inner = typed_item(obj)
    return inner.get("refId") if isinstance(inner, dict) else None


def signature(value):
    if isinstance(value, dict):
        return ("dict", tuple(sorted((k, signature(v)) for k, v in value.items())))
    if isinstance(value, list):
        return ("list", tuple(signature(v) for v in value))
    return ("scalar", value)


def describe_item(item):
    """Best-effort (label, type_name) for a list element, ref/refArray-aware."""
    type_name, inner = typed_item(item)
    if isinstance(inner, dict) and isinstance(inner.get("name"), str):
        return inner["name"], type_name
    if isinstance(item, dict) and len(item) == 1:
        ((k, v),) = item.items()
        if k in ("ref", "refArray") and isinstance(v, str):
            return v, k
    return None, type_name


def align(before_list, after_list):
    """Returns (pairs, added_after_indices, removed_before_indices)."""
    b_unmatched = set(range(len(before_list)))
    a_unmatched = set(range(len(after_list)))
    pairs = []

    # Pass 1: refId -- the stable identifier Archy actually gives us.
    b_refid = {i: refid_of(before_list[i]) for i in b_unmatched}
    a_refid = {i: refid_of(after_list[i]) for i in a_unmatched}
    for bi in sorted(b_unmatched):
        if b_refid[bi] is None:
            continue
        match = next((ai for ai in sorted(a_unmatched) if a_refid[ai] == b_refid[bi]), None)
        if match is not None:
            pairs.append((bi, match))
            a_unmatched.discard(match)
    b_unmatched -= {bi for bi, _ in pairs}

    # Pass 2: exact content signature -- catches identical elements with no refId.
    b_sig = {i: signature(before_list[i]) for i in b_unmatched}
    a_sig = {i: signature(after_list[i]) for i in a_unmatched}
    sig_pairs = []
    for bi in sorted(b_unmatched):
        match = next((ai for ai in sorted(a_unmatched) if a_sig[ai] == b_sig[bi]), None)
        if match is not None:
            sig_pairs.append((bi, match))
            a_unmatched.discard(match)
    pairs.extend(sig_pairs)
    b_unmatched -= {bi for bi, _ in sig_pairs}

    # Pass 3: same `name`, no refId, content genuinely changed (e.g. a changed
    # dtmf digit on a menu choice that kept its name).
    b_name = {i: (typed_item(before_list[i])[1] or {}).get("name") for i in b_unmatched}
    a_name = {i: (typed_item(after_list[i])[1] or {}).get("name") for i in a_unmatched}
    name_pairs = []
    for bi in sorted(b_unmatched):
        if not b_name[bi]:
            continue
        match = next((ai for ai in sorted(a_unmatched) if a_name[ai] == b_name[bi]), None)
        if match is not None:
            name_pairs.append((bi, match))
            a_unmatched.discard(match)
    pairs.extend(name_pairs)
    b_unmatched -= {bi for bi, _ in name_pairs}

    # Pass 4: positional best-effort pairing of whatever's left -- notably,
    # bare `ref:`/`refArray:` entries have neither refId nor name, so a
    # changed pointer string is exactly what should land here rather than
    # being reported as an unrelated add+remove.
    pos_pairs = list(zip(sorted(b_unmatched), sorted(a_unmatched)))
    pairs.extend(pos_pairs)
    b_unmatched -= {bi for bi, _ in pos_pairs}
    a_unmatched -= {ai for _, ai in pos_pairs}

    return pairs, sorted(a_unmatched), sorted(b_unmatched)


def parse_ref(ref_str, base_dir):
    m = REF_FRAGMENT_RE.match(ref_str)
    if not m:
        return None, None
    file_part, pointer = m.group("file"), m.group("pointer")
    file_path = (base_dir / file_part) if file_part else None
    return file_path, [s for s in pointer.split("/") if s]


def resolve_pointer(tree, segments):
    node = tree
    for seg in segments:
        bm = BRACKET_RE.match(seg)
        if bm:
            key, refid = bm.group(1), bm.group(2)
            if not isinstance(node, list):
                return None
            match = next(
                (item for item in node
                 if typed_item(item)[0] == key
                 and isinstance(typed_item(item)[1], dict)
                 and (typed_item(item)[1].get("refId") == refid or typed_item(item)[1].get("name") == refid)),
                None,
            )
            # Unwrap -- node must land on the inner dict (e.g. the task's own
            # fields), not the {typeName: {...}} wrapper, or the next segment's
            # lookup (e.g. "actions") silently misses against the wrapper's
            # single `key` field and resolution fails even on a real match.
            node = typed_item(match)[1] if match is not None else None
        elif isinstance(node, dict):
            node = node.get(seg)
        elif isinstance(node, list):
            try:
                node = node[int(seg)]
            except (ValueError, IndexError):
                return None
        else:
            return None
        if node is None:
            return None
    return node


def resolve_ref(ref_str, base_dir):
    file_path, segments = parse_ref(ref_str, base_dir)
    if file_path is None or not file_path.exists():
        return None
    try:
        return resolve_pointer(load_yaml(file_path), segments)
    except (OSError, yaml.YAMLError):
        return None


def diff_scalar_fields(before_inner, after_inner, flow_name, task_label, changes, skip):
    for key in sorted(set(before_inner) | set(after_inner)):
        if key in skip:
            continue
        b, a = before_inner.get(key), after_inner.get(key)
        if b == a or isinstance(b, (dict, list)) or isinstance(a, (dict, list)):
            continue
        changes.append(make_change(
            category="changed", flow=flow_name, kind="unknown_structural_change",
            task=task_label, element=key,
            summary=f"Changed '{key}' on '{task_label}' from {b!r} to {a!r}.",
        ))


def diff_action_item(b_type, b_inner, a_type, a_inner, flow_name, task_label, label, base_dir, resolve_refs, changes):
    # Bare ref:/refArray: entries have neither a name nor a refId, so `label`
    # is often None for them -- fall back to the enclosing task so the
    # summary still names something.
    where = f"'{label}'" if label else (f"'{task_label}'" if task_label else None)

    for key in sorted(set(b_inner) | set(a_inner)):
        bv, av = b_inner.get(key), a_inner.get(key)
        if bv == av or isinstance(bv, (dict, list)) or isinstance(av, (dict, list)):
            continue

        if a_type == "menuChoice" or b_type == "menuChoice":
            changes.append(make_change(
                category="changed", flow=flow_name, kind="menu_choice_changed",
                task=task_label, element=label,
                summary=f"Changed menu choice '{label}': {key} changed from {bv!r} to {av!r}.",
            ))
        elif key in ("targetRef", "ref", "refArray"):
            note = ""
            if resolve_refs and isinstance(av, str):
                note = " (resolved; no further diff available for the fragment itself in this run)" \
                    if resolve_ref(av, base_dir) is not None else " (could not resolve the new target to diff into it)"
            if label:
                summary = f"Changed the '{key}' target of '{label}' from {bv!r} to {av!r}.{note}"
            elif where:
                summary = f"Changed a '{key}' target in {where} from {bv!r} to {av!r}.{note}"
            else:
                summary = f"Changed a '{key}' target from {bv!r} to {av!r}.{note}"
            changes.append(make_change(
                category="changed", flow=flow_name, kind="ref_target_changed",
                task=task_label, element=label,
                summary=summary,
            ))
        else:
            subject = f"action '{label}'" if label else "an action"
            summary = f"Changed '{key}' on {subject} from {bv!r} to {av!r}."
            if not label and task_label:
                summary = f"Changed '{key}' on {subject} in '{task_label}' from {bv!r} to {av!r}."
            changes.append(make_change(
                category="changed", flow=flow_name, kind="action_changed",
                task=task_label, element=label,
                summary=summary,
            ))


def diff_item(before_item, after_item, section, flow_name, parent_task, base_dir, resolve_refs, changes):
    b_type, b_inner = typed_item(before_item)
    a_type, a_inner = typed_item(after_item)

    if not isinstance(b_inner, dict) or not isinstance(a_inner, dict):
        if before_item != after_item:
            changes.append(make_change(
                category="changed", flow=flow_name, kind="unknown_structural_change",
                task=parent_task, summary=f"Changed an entry in '{section}'" + (f" of '{parent_task}'." if parent_task else "."),
            ))
        return

    label = a_inner.get("name") or a_inner.get("refId") or b_inner.get("name") or b_inner.get("refId")

    if b_type != a_type:
        changes.append(make_change(
            category="changed", flow=flow_name, kind="unknown_structural_change",
            task=parent_task, element=label,
            summary=f"Changed the type of '{label}' from '{b_type}' to '{a_type}'.",
        ))
        return

    if section in ARRAY_SECTIONS:
        task_label = label or parent_task
        for sub in ACTION_SECTIONS:
            diff_named_array(b_inner.get(sub) or [], a_inner.get(sub) or [], sub, flow_name, task_label, base_dir, resolve_refs, changes)
        diff_scalar_fields(b_inner, a_inner, flow_name, task_label, changes, skip=set(ACTION_SECTIONS) | {"refId"})
    else:
        diff_action_item(b_type, b_inner, a_type, a_inner, flow_name, parent_task, label, base_dir, resolve_refs, changes)


def diff_named_array(before_list, after_list, section, flow_name, parent_task, base_dir, resolve_refs, changes):
    pairs, added, removed = align(before_list, after_list)

    for bi, ai in pairs:
        diff_item(before_list[bi], after_list[ai], section, flow_name, parent_task, base_dir, resolve_refs, changes)

    for ai in added:
        label, type_name = describe_item(after_list[ai])
        if type_name in ("ref", "refArray"):
            summary = f"Added a {type_name} pointing to '{label}'" + (f" in '{parent_task}'." if parent_task else ".")
        else:
            summary = f"Added {SECTION_WORD.get(section, section)} '{label or ai}'" + (f" to '{parent_task}'." if parent_task else ".")
        changes.append(make_change(
            category="added", flow=flow_name, kind=ADDED_KIND.get(section, "unknown_structural_change"),
            task=parent_task, element=label, summary=summary,
        ))

    for bi in removed:
        label, type_name = describe_item(before_list[bi])
        if type_name in ("ref", "refArray"):
            summary = f"Removed a {type_name} pointing to '{label}'" + (f" from '{parent_task}'." if parent_task else ".")
        else:
            summary = f"Removed {SECTION_WORD.get(section, section)} '{label or bi}'" + (f" from '{parent_task}'." if parent_task else ".")
        changes.append(make_change(
            category="removed", flow=flow_name, kind=REMOVED_KIND.get(section, "unknown_structural_change"),
            task=parent_task, element=label, summary=summary,
        ))


def diff_flow(before, after, flow_name, base_dir, resolve_refs, changes):
    b_name, a_name = before.get("name"), after.get("name")
    if b_name != a_name:
        changes.append(make_change(
            category="changed", flow=flow_name, kind="flow_renamed",
            summary=f"Renamed the flow from '{b_name}' to '{a_name}'.",
        ))
    for section in ARRAY_SECTIONS:
        diff_named_array(before.get(section) or [], after.get(section) or [], section, flow_name, None, base_dir, resolve_refs, changes)


def main():
    parser = argparse.ArgumentParser(description="Diff two Archy YAML (CX-as-Code) flow files.")
    parser.add_argument("before", help="Path to the 'before' Archy YAML file.")
    parser.add_argument("after", help="Path to the 'after' Archy YAML file.")
    parser.add_argument("--resolve-refs", action="store_true", help="Follow ref:/refArray: pointers when diffing.")
    parser.add_argument("--json", action="store_true", help="Emit the full output-contract JSON structure.")
    parser.add_argument("--terse", action="store_true", help="One controlled-vocabulary line per change.")
    parser.add_argument("-o", "--output", help="Write to a file instead of stdout.")
    args = parser.parse_args()

    before_path, after_path = Path(args.before), Path(args.after)
    before_type, before_flow = top_level_flow(load_yaml(before_path))
    after_type, after_flow = top_level_flow(load_yaml(after_path))
    before_flow, after_flow = before_flow or {}, after_flow or {}

    flow_name = after_flow.get("name") or before_flow.get("name")

    changes = []
    if before_type != after_type:
        changes.append(make_change(
            category="changed", flow=flow_name, kind="unknown_structural_change",
            summary=f"Flow type changed from '{before_type}' to '{after_type}'.",
        ))
    diff_flow(before_flow, after_flow, flow_name, after_path.parent, args.resolve_refs, changes)

    report = build_report(source="archy_yaml", confidence="verified", changes=changes, flow=flow_name)
    emit(report, as_json=args.json, terse=args.terse, out_path=args.output)


if __name__ == "__main__":
    main()
