// Where each coding agent looks for skills, and the commands that add one. Pure data and functions with no
// imports, so tests can run them with plain Node. Used by the skill page's install panel and the Get started table,
// so the two cannot disagree.
//
// Sources: GitHub Docs "About agent skills" (Copilot) and the OpenAI Codex skills docs, both read on 6 Nov 2026.
// The Claude Code folders carry over from the earlier version of this site and were not re-read on that date.
// All three tools read skills in the open Agent Skills format (https://agentskills.io). Other tools are not listed
// because their folders have not been checked. Re-check these before relying on them: vendors change them.

export type ToolId = 'claude-code' | 'copilot' | 'codex' | 'web';
export type Platform = 'nix' | 'win';

export interface Tool {
  id: ToolId;
  label: string;
  /** Where a personal skill goes (all your projects). Null when the tool has no folder. */
  personal: string | null;
  personalAlso: string[];
  /** Where a project skill goes (shared through the repository). */
  project: string | null;
  projectAlso: string[];
  /** One sentence on how to use an added skill. `{name}` stands for the skill's name. */
  use: string;
  /** A note shown under the commands. */
  note: string;
}

export const STANDARD_URL = 'https://agentskills.io';

export const TOOLS: Tool[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    personal: '~/.claude/skills',
    personalAlso: [],
    project: '.claude/skills',
    projectAlso: [],
    use: 'Ask for the job in plain words, or type /{name}.',
    note: 'To share a skill with everyone who uses a repository, copy the folder into .claude/skills in that repository and commit it.',
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    personal: '~/.copilot/skills',
    personalAlso: ['~/.agents/skills'],
    project: '.github/skills',
    projectAlso: ['.claude/skills', '.agents/skills'],
    use: 'Ask for the job in plain words. The agent picks the skill that fits.',
    note: 'Which folders count depends on where you use Copilot (the command line, your editor or the cloud agent), so check its setup guide too. To share a skill through a repository, copy the folder into .github/skills there and commit it.',
  },
  {
    id: 'codex',
    label: 'Codex',
    personal: '~/.agents/skills',
    personalAlso: [],
    project: '.agents/skills',
    projectAlso: [],
    use: 'Ask for the job in plain words, or type $ before the skill name.',
    note: 'Codex looks in .agents/skills in the folder you start it in, in each folder up to the repository root, and in ~/.agents/skills. To share a skill through a repository, copy the folder into .agents/skills there and commit it.',
  },
  {
    id: 'web',
    label: 'claude.ai',
    personal: null,
    personalAlso: [],
    project: null,
    projectAlso: [],
    use: 'Ask for the job in plain words.',
    note: 'Needs a Pro, Max, Team or Enterprise plan with code execution on. Uploaded skills belong to one person and do not sync to Claude Code, so each teammate uploads their own. The menu wording may differ in the app.',
  },
];

export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id) as Tool;

/** "~/.claude/skills" becomes "$env:USERPROFILE\.claude\skills" for PowerShell. */
export function winPath(p: string): string {
  const rest = p.startsWith('~/') ? p.slice(2) : p;
  return (p.startsWith('~/') ? '$env:USERPROFILE\\' : '') + rest.replace(/\//g, '\\');
}

/** How to use an added skill, with the skill's name filled in (or a stand-in when it is not known). */
export const useText = (tool: Tool, name = 'skill-name') => tool.use.replace('{name}', name);

export interface InstallInput {
  slug: string;
  repoUrl: string;
  repoName: string;
}

/** The commands (or steps, for claude.ai) that add one skill for one tool on one platform. */
export function commands(toolId: ToolId, platform: Platform, p: InstallInput): string {
  const tool = toolById(toolId);
  if (tool.personal === null) {
    return [
      `# 1. Download ${p.slug}.zip from this page`,
      '# 2. In claude.ai, open Settings > Features and upload the zip',
      '# 3. Each teammate uploads their own copy',
    ].join('\n');
  }
  const clone = `git clone ${p.repoUrl}.git`;
  if (platform === 'win') {
    const dest = winPath(tool.personal);
    return [
      clone,
      `New-Item -ItemType Directory -Force "${dest}" | Out-Null`,
      `Copy-Item -Recurse ${p.repoName}\\skills\\${p.slug} "${dest}\\"`,
    ].join('\n');
  }
  return [clone, `mkdir -p ${tool.personal}`, `cp -r ${p.repoName}/skills/${p.slug} ${tool.personal}/`].join('\n');
}
