#!/usr/bin/env python3
"""Group a diff-summariser changes[] array into a markdown outline for the
"built this iteration vs planned next iteration" playback-deck slide.

See ../../diff-summariser/references/output-contract.md for the input shape.
Works on output from the diff-summariser skill or hand-written JSON in the
same shape -- this script has no dependency on that skill being installed.
"""
import argparse
import json
import sys
from collections import OrderedDict

CATEGORY_ORDER = ["added", "changed", "removed"]
CATEGORY_LABELS = {"added": "Added", "changed": "Changed", "removed": "Removed"}


def load_changes(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "changes" in data:
        changes = data["changes"]
    elif isinstance(data, list):
        changes = data
    else:
        raise ValueError(
            f"{path}: expected a changes[] array, or an object with a "
            "'changes' key (see diff-summariser/references/output-contract.md)"
        )
    if not isinstance(changes, list):
        raise ValueError(f"{path}: 'changes' must be an array")
    return changes


def group_key(change, by):
    if by == "journey":
        return change.get("journey") or change.get("flow") or "(ungrouped)"
    return change.get("flow") or "(ungrouped)"


def build_outline(changes, by, exclude_removed):
    groups = OrderedDict()
    for change in changes:
        if exclude_removed and change.get("category") == "removed":
            continue
        key = group_key(change, by)
        groups.setdefault(key, []).append(change)

    lines = []
    for group_name, items in groups.items():
        lines.append(f"## {group_name}")
        lines.append("")
        by_category = OrderedDict((c, []) for c in CATEGORY_ORDER)
        for item in items:
            by_category.setdefault(item.get("category", "changed"), []).append(item)
        for category, cat_items in by_category.items():
            if not cat_items:
                continue
            lines.append(f"**{CATEGORY_LABELS.get(category, category.title())}**")
            for item in cat_items:
                summary = item.get("summary", "(no summary provided)")
                suffix = ""
                if item.get("confidence") == "best_effort" and "from notes" not in summary:
                    suffix = " _(unconfirmed — from notes, not a verified flow diff)_"
                lines.append(f"- {summary}{suffix}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "changes_file",
        help='Path to a changes.json (array, or {"changes": [...]})',
    )
    parser.add_argument(
        "--by",
        choices=["journey", "flow"],
        default="journey",
        help="Grouping key (default: journey, falling back to flow when journey is absent)",
    )
    parser.add_argument(
        "--exclude-removed",
        action="store_true",
        help="Drop category=removed items from the outline",
    )
    parser.add_argument("-o", "--output", help="Write outline to this file instead of stdout")
    args = parser.parse_args()

    try:
        changes = load_changes(args.changes_file)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

    outline = build_outline(changes, args.by, args.exclude_removed)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(outline)
    else:
        sys.stdout.write(outline)


if __name__ == "__main__":
    main()
