#!/usr/bin/env python3
"""Shared output-contract helpers for the diff-summariser scripts.

Not run directly. See ../references/output-contract.md for the schema this
module exists to enforce -- diff_architect_json.py, diff_archy_yaml.py, and
summarise_notes.py all build their output through make_change()/
build_report()/emit() so their output shape cannot drift from each other.
"""
import json
import sys
from datetime import datetime, timezone

VALID_CATEGORIES = {"added", "changed", "removed"}
VALID_CONFIDENCE = {"verified", "best_effort"}
VALID_SOURCES = {"architect_json", "archy_yaml", "notes"}
VALID_KINDS = {
    "action_added",
    "action_removed",
    "action_changed",
    "task_added",
    "task_removed",
    "menu_choice_changed",
    "ref_target_changed",
    "flow_renamed",
    "unknown_structural_change",
}


def make_change(
    category,
    flow,
    kind,
    summary,
    journey=None,
    task=None,
    element=None,
    detail=None,
    path=None,
    confidence=None,
):
    if category not in VALID_CATEGORIES:
        raise ValueError(f"invalid category: {category!r} (expected one of {sorted(VALID_CATEGORIES)})")
    if kind not in VALID_KINDS:
        raise ValueError(f"invalid kind: {kind!r} (expected one of {sorted(VALID_KINDS)})")
    if confidence is not None and confidence not in VALID_CONFIDENCE:
        raise ValueError(f"invalid confidence: {confidence!r} (expected one of {sorted(VALID_CONFIDENCE)})")

    change = {"category": category, "flow": flow, "kind": kind, "summary": summary}
    if journey is not None:
        change["journey"] = journey
    if task is not None:
        change["task"] = task
    if element is not None:
        change["element"] = element
    if detail is not None:
        change["detail"] = detail
    if path is not None:
        change["path"] = path
    if confidence is not None:
        change["confidence"] = confidence
    return change


def build_report(source, confidence, changes, flow=None):
    if source not in VALID_SOURCES:
        raise ValueError(f"invalid source: {source!r} (expected one of {sorted(VALID_SOURCES)})")
    if confidence not in VALID_CONFIDENCE:
        raise ValueError(f"invalid confidence: {confidence!r} (expected one of {sorted(VALID_CONFIDENCE)})")
    report = {
        "source": source,
        "confidence": confidence,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "changes": changes,
    }
    if flow is not None:
        report["flow"] = flow
    return report


def load_existing_report(path, source, confidence):
    """Load a report from `path` if it exists, else start a fresh one.

    Used by summarise_notes.py's --append-to. Accepts either a bare
    changes[] array or a full {"source": ..., "changes": [...]} object.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return build_report(source, confidence, [])
    if isinstance(data, list):
        return build_report(source, confidence, data)
    if isinstance(data, dict) and "changes" in data:
        return data
    raise ValueError(f"{path}: expected a changes[] array or an object with a 'changes' key")


def terse_line(change):
    label = change.get("element") or change.get("task") or change.get("flow") or ""
    scope = f" ({change['task']})" if change.get("task") and change.get("element") else ""
    return f"{change['kind']}: {label}{scope}".strip()


def human_line(change):
    summary = change.get("summary") or "(no summary provided)"
    if change.get("confidence") == "best_effort" and "(from notes" not in summary:
        summary = f"{summary} (from notes, not verified against a flow export)"
    return summary


def render_report(report, terse=False):
    lines = [terse_line(c) if terse else human_line(c) for c in report.get("changes", [])]
    return "\n".join(lines) + ("\n" if lines else "")


def emit(report, as_json=False, terse=False, out_path=None):
    text = (json.dumps(report, indent=2) + "\n") if as_json else render_report(report, terse=terse)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        sys.stdout.write(text)
