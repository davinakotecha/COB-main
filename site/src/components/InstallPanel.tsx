// "Add it to your coding agent": one tab per tool, and a macOS/Linux or Windows switch for the tools that
// use a folder. The folders and commands come from lib/tools.ts, which the Get started table reads too.
// The repo link and folder name come from the account config, passed in as props.
import { useState } from 'preact/hooks';
import { onTabKey } from '../lib/tabs';
import { copyText } from '../lib/copy';
import { TOOLS, commands, useText, toolById, STANDARD_URL } from '../lib/tools';
import type { Platform, ToolId } from '../lib/tools';

interface Props {
  slug: string;
  repoUrl: string;
  repoName: string;
  zipHref: string;
  /** Link to the Security page, where the approved-tools question is answered. */
  securityHref: string;
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'nix', label: 'macOS or Linux' },
  { id: 'win', label: 'Windows' },
];

export default function InstallPanel(props: Props) {
  const [toolId, setToolId] = useState<ToolId>('claude-code');
  const [platform, setPlatform] = useState<Platform>('nix');
  const tool = toolById(toolId);
  const ids = TOOLS.map((t) => t.id);
  const text = commands(toolId, platform, props);
  const isWeb = tool.personal === null;

  return (
    <div>
      <div class="tabs" role="tablist" aria-label="Which coding agent">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`in-${t.id}`}
            data-tab={t.id}
            aria-selected={t.id === toolId}
            aria-controls="in-panel"
            tabIndex={t.id === toolId ? 0 : -1}
            onClick={() => setToolId(t.id)}
            onKeyDown={(e) => onTabKey(e, ids, toolId, (id) => setToolId(id as ToolId))}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!isWeb && (
        <div class="mini-tabs" role="group" aria-label="Your computer">
          {PLATFORMS.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === platform} onClick={() => setPlatform(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div class="cmd" id="in-panel" role="tabpanel" aria-labelledby={`in-${toolId}`}>
        <pre key={`${toolId}-${platform}`} class="swap" tabIndex={0}>
          {text}
        </pre>
        <button class="cp" type="button" aria-label="Copy the commands" onClick={() => copyText(text, isWeb ? 'Steps copied' : 'Install commands copied')}>
          Copy
        </button>
      </div>

      <p class="how">{tool.note}</p>
      {isWeb && (
        <p class="how">
          <a href={props.zipHref} download>
            Download {props.slug}.zip
          </a>
        </p>
      )}
      <p class="how">{useText(tool, props.slug)}</p>
      <p class="which">
        <strong>Using another tool?</strong> Any coding agent that supports the open{' '}
        <a href={STANDARD_URL} target="_blank" rel="noopener noreferrer">
          Agent Skills
        </a>{' '}
        format can use this skill. Use only the tools approved for your account: see <a href={props.securityHref}>Security</a>.
      </p>
    </div>
  );
}
