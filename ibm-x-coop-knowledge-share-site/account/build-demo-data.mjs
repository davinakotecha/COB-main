// This account's worked-example data for the diff-summariser page.
// It runs the repo's own scripts on examples/ and captures their real output, so nothing
// on the page is retyped. Called by site/scripts/prep.mjs. The core's WorkedExample
// component only knows the shape returned here, not these skills.
import fs from 'node:fs';
import path from 'node:path';
// Imported from the core, not from the `diff` package: Node resolves packages from this folder
// upwards, which never reaches site/node_modules.
import { lineDiff } from '../site/scripts/lib/line-diff.mjs';
import { runPython } from '../site/scripts/lib/run-python.mjs';

const DIFF = 'skills/diff-summariser/scripts';
const FLOW = 'Northwind Bank - Card Replacement - Inbound Call';
const NOTE_SUMMARY =
  'Added a check for an in-progress replacement card request, so the flow reports its status instead of issuing a duplicate.';

/** Parses group_changes_for_slide.py's markdown outline into groups of bullets. */
function parseOutline(md) {
  const groups = [];
  let group = null;
  let category = null;
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      group = { name: h[1], items: [] };
      groups.push(group);
      continue;
    }
    const c = /^\*\*(Added|Changed|Removed)\*\*$/.exec(line);
    if (c) {
      category = c[1].toLowerCase();
      continue;
    }
    const b = /^-\s+(.+)$/.exec(line);
    if (b && group && category) {
      const text = b[1];
      group.items.push({
        category,
        text: text.replace(/\s*\(from notes[^)]*\)\s*$/, ''),
        unconfirmed: /\(from notes/.test(text),
      });
    }
  }
  return groups;
}

export default async function buildDemoData({ repoRoot }) {
  // The skills' scripts exit 0 on success. Anything else fails the build rather than ship stale output.
  const run = (args) => runPython(args, { cwd: repoRoot });
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

  const arch = {
    before: 'examples/diff-summariser/architect-json/flow-before.json',
    after: 'examples/diff-summariser/architect-json/flow-after.json',
  };
  const archy = {
    before: 'examples/diff-summariser/archy-yaml/flow-before.yaml',
    after: 'examples/diff-summariser/archy-yaml/flow-after.yaml',
  };

  const three = (script, a) => ({
    human: run([`${DIFF}/${script}`, a.before, a.after]),
    terse: run([`${DIFF}/${script}`, a.before, a.after, '--terse']),
    json: run([`${DIFF}/${script}`, a.before, a.after, '--json']),
  });
  const noteArgs = ['--flow', FLOW, '--journey', 'Card Replacement', '--task', 'Collect Account Number', '--category', 'added', '--summary', NOTE_SUMMARY];
  const notes = {
    human: run([`${DIFF}/summarise_notes.py`, ...noteArgs]),
    terse: run([`${DIFF}/summarise_notes.py`, ...noteArgs, '--terse']),
    json: run([`${DIFF}/summarise_notes.py`, ...noteArgs, '--json']),
  };

  const outline = run(['skills/playback-deck/scripts/group_changes_for_slide.py', 'examples/playback-deck/sample-changes-for-slide.json', '--by', 'journey']);
  const sampleOutline = read('examples/playback-deck/sample-outline.md').trim();
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  if (norm(outline) !== norm(sampleOutline)) {
    console.warn('  ! group_changes_for_slide.py output differs from examples/playback-deck/sample-outline.md. Check the skill.');
  }

  const archyDiffText = lineDiff(read(archy.before), read(archy.after));
  const archDiffText = lineDiff(read(arch.before), read(arch.after));

  const slideNext = { title: 'Planned next iteration', body: 'Written by the team. A diff can’t produce it.' };

  return {
    examples: {
      // playback-deck has no live script output: it shows the slide mock only, as an illustration.
      'playback-deck': {
        intro:
          'Give it a list of this fortnight’s changes and it fills the “Built this iteration” slide inside your own template. The “Planned next iteration” column stays yours to write.',
        scenarios: [],
        slide: {
          title: 'Built this iteration',
          groups: parseOutline(outline),
          next: slideNext,
          caption: 'Illustration with made-up data. Bullets written from a note, not a checked export, are marked Unconfirmed.',
        },
        illustrationNote:
          'Illustration with made-up data. Bullets written from a note, not a checked export, are marked Unconfirmed. Everything here is made up. Never paste real flow exports or client data into any web page.',
      },
      'diff-summariser': {
        intro: 'Pick a kind of change and follow it from the source to the slide. Everything here is made up and was produced by the scripts in this repo.',
        scenarios: [
          {
            id: 'archy',
            label: 'Archy YAML',
            confidence: 'verified',
            changeNote: 'Before and after of two Archy YAML files.',
            summaryNote: 'Verified: the script compared two real files.',
            change: { kind: 'diff', fileLabel: 'flow-before.yaml to flow-after.yaml', rows: archyDiffText },
            outputs: three('diff_archy_yaml.py', archy),
          },
          {
            id: 'architect',
            label: 'Architect JSON export',
            confidence: 'verified',
            changeNote: 'Before and after of two native flow exports. Generated IDs are ignored.',
            summaryNote: 'Verified: the script compared two real files.',
            change: { kind: 'diff', fileLabel: 'flow-before.json to flow-after.json', rows: archDiffText },
            outputs: three('diff_architect_json.py', arch),
          },
          {
            id: 'notes',
            label: 'Notes only',
            confidence: 'best_effort',
            changeNote: 'No export available, so the skill works from a note.',
            summaryNote: 'Best effort: written from a note, not a diff.',
            change: { kind: 'note', text: read('examples/diff-summariser/notes/sample-notes.txt').replace(/\r\n/g, '\n').trim() },
            outputs: notes,
          },
        ],
        slide: {
          title: 'Built this iteration',
          groups: parseOutline(outline),
          next: slideNext,
          caption:
            'Everything here is made up and was produced by the scripts in this repo. The slide is built from the repo’s sample changes file, which has the same shape the summariser emits. Bullets written from a note get a dashed outline and the label Unconfirmed. Never paste real flow exports or client data into any web page.',
        },
      },
    },
  };
}
