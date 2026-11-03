// "Add it to Claude": three routes (Claude Code on macOS or Linux, Claude Code on Windows, claude.ai).
// The repo link and folder name come from the account config, passed in as props.
import { useState } from 'preact/hooks';
import { onTabKey } from '../lib/tabs';
import { copyText } from '../lib/copy';

interface Props {
  slug: string;
  repoUrl: string;
  repoName: string;
  zipHref: string;
}

type Route = 'nix' | 'win' | 'web';
const ROUTES: { id: Route; label: string }[] = [
  { id: 'nix', label: 'Claude Code: macOS or Linux' },
  { id: 'win', label: 'Claude Code: Windows' },
  { id: 'web', label: 'claude.ai' },
];

export function commands(route: Route, p: Props): string {
  const clone = `git clone ${p.repoUrl}.git`;
  if (route === 'nix') {
    return [clone, 'mkdir -p ~/.claude/skills', `cp -r ${p.repoName}/skills/${p.slug} ~/.claude/skills/`].join('\n');
  }
  if (route === 'win') {
    return [
      clone,
      'New-Item -ItemType Directory -Force "$env:USERPROFILE\\.claude\\skills" | Out-Null',
      `Copy-Item -Recurse ${p.repoName}\\skills\\${p.slug} "$env:USERPROFILE\\.claude\\skills\\"`,
    ].join('\n');
  }
  return [
    `# 1. Download ${p.slug}.zip from this page`,
    '# 2. In claude.ai, open Settings > Features and upload the zip',
    '# 3. Each teammate uploads their own copy',
  ].join('\n');
}

const NOTES: Record<Route, string> = {
  nix: 'Personal skills live in ~/.claude/skills. To share with a whole repo, copy the folder into .claude/skills in that repo and commit it, so everyone who clones it gets the skill.',
  win: 'Personal skills live in .claude\\skills inside your user folder. To share with a whole repo, copy the folder into .claude\\skills in that repo and commit it.',
  web: 'Needs a Pro, Max, Team or Enterprise plan with code execution on. Uploaded skills belong to one person and do not sync to Claude Code, so each teammate uploads their own. The menu wording may differ in the app.',
};

export default function InstallPanel(props: Props) {
  const [route, setRoute] = useState<Route>('nix');
  const ids = ROUTES.map((r) => r.id);
  const text = commands(route, props);

  return (
    <div>
      <div class="tabs" role="tablist" aria-label="Where to add the skill">
        {ROUTES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            id={`in-${r.id}`}
            data-tab={r.id}
            aria-selected={r.id === route}
            aria-controls="in-panel"
            tabIndex={r.id === route ? 0 : -1}
            onClick={() => setRoute(r.id)}
            onKeyDown={(e) => onTabKey(e, ids, route, (id) => setRoute(id as Route))}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div class="cmd" id="in-panel" role="tabpanel" aria-labelledby={`in-${route}`}>
        <pre key={route} class="swap" tabIndex={0}>
          {text}
        </pre>
        <button class="cp" type="button" aria-label="Copy the commands" onClick={() => copyText(text, route === 'web' ? 'Steps copied' : 'Install commands copied')}>
          Copy
        </button>
      </div>
      <p class="how">{NOTES[route]}</p>
      {route === 'web' && (
        <p class="how">
          <a href={props.zipHref} download>
            Download {props.slug}.zip
          </a>
        </p>
      )}
      <p class="how">
        Then ask Claude for the job in plain words, or type <code>/{props.slug}</code>.
      </p>
      <p class="which">
        <strong>Which route?</strong> Claude Code users take the first two: personal, or project so the whole team gets it. claude.ai users take the zip.
      </p>
    </div>
  );
}
