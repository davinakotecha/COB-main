// The skill generator. A Preact island that runs entirely in the browser and makes no network calls.
// The rules live in lib/skill-rules.ts so they can be tested without a browser.
import { useMemo, useState } from 'preact/hooks';
import { zipSync, strToU8 } from 'fflate';
import {
  DESC_MAX,
  buildSkillMd,
  checkDraft,
  folderTree,
  nextSteps,
  readmeRow,
  roadmapEntry,
  titleCase,
  zipFiles,
  type SkillDraft,
} from '../lib/skill-rules';
import { copyText, toast } from '../lib/copy';
import { inlineCode } from '../lib/text';
import { onTabKey } from '../lib/tabs';

interface Props {
  ticketPrefix: string;
  fictionalName: string;
}

const START: SkillDraft = {
  name: 'status-update-writer',
  title: 'Status update writer',
  summary: "Turns a week of workshop notes into the team's standard status update.",
  description:
    "Write the weekly status update from workshop notes, in the team's standard format. Use when the user asks for a status update, a weekly summary, or to write up their notes. Trigger on mentions of status update, weekly report, or workshop notes.",
  inputs: 'The workshop notes, pasted in\nThe reporting week',
  recipe: 'Read the notes and pick out progress, risks and next steps\nWrite each as one line in the standard format\nMark anything the notes do not confirm as unconfirmed',
  outOfScope: 'Naming owners or dates that are not in the notes',
  scripts: false,
  references: true,
};

type Tab = 'skill' | 'readme' | 'roadmap';

export default function Generator({ ticketPrefix, fictionalName }: Props) {
  const [d, setD] = useState<SkillDraft>(START);
  const [tab, setTab] = useState<Tab>('skill');
  const set = (patch: Partial<SkillDraft>) => setD((prev) => ({ ...prev, ...patch }));

  const checks = useMemo(() => checkDraft(d, ticketPrefix), [d, ticketPrefix]);
  const md = useMemo(() => buildSkillMd(d), [d]);
  const preview: Record<Tab, string> = { skill: md, readme: readmeRow(d), roadmap: roadmapEntry(d) };
  const blocked = checks.some((c) => c.level === 'bad');
  const label = { ok: 'Passed', warn: 'Check', bad: 'Fix' } as const;

  const onName = (v: string) => {
    // Keep the title in step with the name until someone writes their own.
    const auto = d.title === titleCase(d.name) || d.title === '';
    set({ name: v, ...(auto ? { title: titleCase(v) } : {}) });
  };

  function downloadZip() {
    if (blocked) {
      toast('Fix the checks marked Fix before downloading');
      return;
    }
    const files: Record<string, Uint8Array> = {};
    for (const [path, text] of Object.entries(zipFiles(d))) files[path] = strToU8(text);
    const blob = new Blob([zipSync(files, { level: 9 }) as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.name || 'new-skill'}-draft.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Zip downloaded');
  }

  const tabs: [Tab, string][] = [
    ['skill', 'SKILL.md'],
    ['readme', 'README row'],
    ['roadmap', 'Roadmap entry'],
  ];
  const copyLabel = { skill: 'Copy SKILL.md', readme: 'Copy row', roadmap: 'Copy entry' }[tab];

  return (
    <div class="gen">
      <div class="form">
        <label class="fld">
          Name
          <input type="text" value={d.name} onInput={(e) => onName((e.target as HTMLInputElement).value.trim())} autocomplete="off" spellcheck={false} />
          <span class="hint">Lowercase letters, numbers and single hyphens, up to 64 characters.</span>
        </label>
        <label class="fld">
          Title
          <input type="text" value={d.title} onInput={(e) => set({ title: (e.target as HTMLInputElement).value })} autocomplete="off" />
        </label>
        <label class="fld">
          One-line summary
          <input type="text" value={d.summary} onInput={(e) => set({ summary: (e.target as HTMLInputElement).value })} autocomplete="off" />
        </label>
        <label class="fld">
          Description
          <textarea class="tall" value={d.description} onInput={(e) => set({ description: (e.target as HTMLTextAreaElement).value })} spellcheck />
          <span class="count" aria-live="off">
            {d.description.length} / {DESC_MAX}
          </span>
          <span class="hint">Say what the skill does and when Claude should use it.</span>
        </label>
        <label class="fld">
          Inputs it accepts (one per line)
          <textarea value={d.inputs} onInput={(e) => set({ inputs: (e.target as HTMLTextAreaElement).value })} />
        </label>
        <label class="fld">
          Recipe steps (one per line)
          <textarea value={d.recipe} onInput={(e) => set({ recipe: (e.target as HTMLTextAreaElement).value })} />
        </label>
        <label class="fld">
          Out of scope (one per line)
          <textarea value={d.outOfScope} onInput={(e) => set({ outOfScope: (e.target as HTMLTextAreaElement).value })} />
        </label>
        <div class="chk">
          <label>
            <input type="checkbox" checked={d.references} onChange={(e) => set({ references: (e.target as HTMLInputElement).checked })} /> Add a references/ stub
          </label>
          <label>
            <input type="checkbox" checked={d.scripts} onChange={(e) => set({ scripts: (e.target as HTMLInputElement).checked })} /> Add a scripts/ stub
          </label>
        </div>
        <ul class="checks" aria-live="polite" aria-label="Checks">
          {checks.map((c) => (
            <li key={c.message} class={c.level}>
              <span class="st">{label[c.level]}</span>
              <span>{c.message}</span>
            </li>
          ))}
        </ul>
        <p class="hint">
          Examples use the made-up bank {fictionalName} and ticket prefix {ticketPrefix}-. Nothing you type leaves this page.
        </p>
      </div>

      <div>
        <div class="prev-h">
          <span>Preview</span>
          <span class="btns">
            <button class="btn sec sm" type="button" onClick={() => copyText(preview[tab], `${copyLabel.replace('Copy ', '')} copied`)}>
              {copyLabel}
            </button>
            <button class="btn pri sm" type="button" onClick={downloadZip} aria-disabled={blocked ? 'true' : undefined}>
              Download zip
            </button>
          </span>
        </div>
        <pre class="gtree">{folderTree(d)}</pre>
        <div class="tabs" role="tablist" aria-label="Generated files">
          {tabs.map(([id, text]) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`gt-${id}`}
              data-tab={id}
              aria-selected={tab === id}
              aria-controls="gprev"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) =>
                onTabKey(
                  e,
                  tabs.map(([t]) => t),
                  tab,
                  (next) => setTab(next as Tab),
                )
              }
            >
              {text}
            </button>
          ))}
        </div>
        <pre class="prev" id="gprev" role="tabpanel" aria-labelledby={`gt-${tab}`} tabIndex={0}>
          {preview[tab]}
        </pre>
        <h3 style="font-size:16px;font-weight:600;margin:16px 0 4px">Next steps</h3>
        <ol class="next-steps">
          {nextSteps(d).map((s) => (
            <li key={s} dangerouslySetInnerHTML={{ __html: inlineCode(s) }} />
          ))}
        </ol>
      </div>
    </div>
  );
}
