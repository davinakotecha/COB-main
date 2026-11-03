#!/usr/bin/env python3
"""Build one change item from a freeform note -- no flow export available.

See ../references/notes-fallback.md for the rules this script exists to
enforce: every item is tagged confidence=best_effort, source=notes, and the
summary always carries a visible "(from notes...)" caveat baked into the
text itself (not left to render-time formatting) so it survives --json too.

"Ask, don't guess" about --flow/--category when a note doesn't say -- that's
an agent-level rule, structurally backed here by --flow/--category/--summary
all being required with no silent default.

    python3 scripts/summarise_notes.py --flow NAME [--journey NAME] [--task NAME] \\
        --category {added,changed,removed} --summary "TEXT" [--kind KIND] \\
        [--detail "TEXT"] [--json] [--terse] [--append-to FILE.json]
"""
import argparse
import json
from datetime import datetime, timezone

from _common import build_report, emit, load_existing_report, make_change

CAVEAT = "(from notes, not verified against a flow export)"

DEFAULT_KIND = {
    "added": "action_added",
    "changed": "action_changed",
    "removed": "action_removed",
}


def with_caveat(summary):
    return summary if "(from notes" in summary else f"{summary} {CAVEAT}"


def main():
    parser = argparse.ArgumentParser(
        description="Summarise a flow change from a note, with no export to diff against."
    )
    parser.add_argument("--flow", required=True, help="Flow name this change belongs to.")
    parser.add_argument("--journey", help="Business journey grouping (e.g. 'Card Replacement'). Falls back to --flow if omitted.")
    parser.add_argument("--task", help="Task name within the flow, if known.")
    parser.add_argument("--category", required=True, choices=sorted(("added", "changed", "removed")))
    parser.add_argument("--summary", required=True, help="Plain-English sentence describing the change.")
    parser.add_argument("--kind", help="Controlled-vocabulary kind (see references/output-contract.md). Defaults based on --category.")
    parser.add_argument("--detail", help="Optional extra detail beyond the one-line summary.")
    parser.add_argument("--json", action="store_true", help="Emit the full output-contract JSON structure.")
    parser.add_argument("--terse", action="store_true", help="One controlled-vocabulary line.")
    parser.add_argument("--append-to", help="Read FILE.json if it exists, append this item, and write it back.")
    args = parser.parse_args()

    kind = args.kind or DEFAULT_KIND[args.category]

    change = make_change(
        category=args.category,
        flow=args.flow,
        kind=kind,
        summary=with_caveat(args.summary),
        journey=args.journey,
        task=args.task,
        detail=args.detail,
        confidence="best_effort",
    )

    if args.append_to:
        report = load_existing_report(args.append_to, source="notes", confidence="best_effort")
        report["changes"].append(change)
        report["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(args.append_to, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
            f.write("\n")

        if args.json:
            emit(report, as_json=True)
        else:
            emit(build_report(source="notes", confidence="best_effort", changes=[change]), terse=args.terse)
    else:
        report = build_report(source="notes", confidence="best_effort", changes=[change], flow=args.flow)
        emit(report, as_json=args.json, terse=args.terse)


if __name__ == "__main__":
    main()
