// The kinds of asset the library can hold. Skills are live. The rest are placeholders: their pages say so.
// One source for the Home tiles, the tab bar, the placeholder pages and the Security page's risk table,
// so none of them can disagree. Pure data with no imports, so tests can read it with plain Node.
// Generic wording only: nothing here names an account, a client or a skill.

export type AssetKey = 'skills' | 'agents' | 'plugins' | 'connectors' | 'templates';
export type Risk = 'Low' | 'Medium' | 'High';

export interface Idea {
  title: string;
  body: string;
}

export interface AssetType {
  key: AssetKey;
  /** Tab and heading label. */
  label: string;
  href: string;
  live: boolean;
  /** One line for the Home tile. */
  blurb: string;
  /** The exact option text in the submission form's "Type of asset" dropdown. */
  formLabel: string;
  // Placeholder content (skills have their own pages).
  holds?: string;
  ideas?: Idea[];
  needs?: string[];
  more?: string;
  risk?: Risk;
  riskWhy?: string;
}

export const assetTypes: AssetType[] = [
  {
    key: 'skills',
    label: 'Skills',
    href: '/skills/',
    live: true,
    blurb: 'Written instructions that teach a coding agent how to do one job the way the team does it.',
    formLabel: 'Skill',
  },
  {
    key: 'agents',
    label: 'Agents',
    href: '/agents/',
    live: false,
    blurb: 'Ready-made helpers for a repeatable role, such as a reviewer or a test writer.',
    formLabel: 'Agent',
    holds:
      'An agent is a saved definition of a helper with one job: its instructions, the tools it may use and the way it reports back. Teams would share the ones that work well, so nobody has to build them again.',
    ideas: [
      { title: 'Code reviewer', body: "Checks a change against the team's standards and reports what it finds, without editing the code." },
      { title: 'Test writer', body: "Drafts tests for new code in the team's test style." },
      { title: 'Migration helper', body: 'Plans a repeatable change across many files, then checks that every file was covered.' },
      { title: 'Release notes drafter', body: 'Turns a list of changes into notes written for the people who will read them.' },
    ],
    needs: [
      'An agreed file format for each coding agent, since they differ',
      'A rule for which tools an agent may be given by default',
      'A review that checks what the agent is allowed to do, not only what it says',
    ],
    risk: 'Medium',
    riskWhy: 'An agent runs with its own instructions and its own tool access, so a reviewer must check what it is allowed to do.',
  },
  {
    key: 'plugins',
    label: 'Plugins',
    href: '/plugins/',
    live: false,
    blurb: 'Bundles of skills, agents and commands that a team installs in one step.',
    formLabel: 'Plugin',
    holds:
      'A plugin packages several assets together, and sometimes actions that run automatically, so a team installs one thing instead of many.',
    ideas: [
      { title: 'Starter kit for a new engagement', body: 'The skills and agents a new team needs on day one, in one bundle.' },
      { title: 'Documentation bundle', body: 'A set of skills and templates for writing and checking project documents.' },
      { title: 'Quality checks bundle', body: 'A reviewer agent and the skills it relies on, installed together.' },
    ],
    needs: [
      'A packaging format for each tool, because plugin formats are not shared between tools',
      'A review of every part of the bundle, including anything that runs automatically',
      'Version numbers, so a team can stay on a release it has already checked',
    ],
    more: 'Hooks and automations (actions that run when something happens in the coding agent) would also belong here, with the strictest review of all.',
    risk: 'High',
    riskWhy: 'A plugin bundles several assets and can include actions that run on their own, so every part needs review.',
  },
  {
    key: 'connectors',
    label: 'Connectors',
    href: '/connectors/',
    live: false,
    blurb: 'Approved links that let a coding agent reach other tools and data (MCP servers).',
    formLabel: 'MCP server or connector',
    holds:
      'An MCP server or connector gives a coding agent live access to another system, such as a ticketing tool or a document store. A shared list would record which links are approved and how to set each one up safely.',
    ideas: [
      { title: 'Ticket lookup', body: 'Lets an agent read tickets, with no ability to change them.' },
      { title: 'Knowledge base search', body: 'Lets an agent search approved internal documents.' },
      { title: 'Test results viewer', body: 'Lets an agent read the latest test run, so it can explain a failure.' },
    ],
    needs: [
      'Sign-off from the account security lead for every connector',
      'Credentials kept out of the repository, always',
      'Read-only access first, with anything that changes data agreed separately',
      'A named owner for each connector',
    ],
    risk: 'High',
    riskWhy: 'A connector gives the agent live access to a real system, so it can reach real data.',
  },
  {
    key: 'templates',
    label: 'Prompts and templates',
    href: '/templates/',
    live: false,
    blurb: 'Tested prompts, project instruction files and document templates.',
    formLabel: 'Prompt or template',
    holds:
      'Text assets that a team reuses: prompt packs, project instruction files that tell a coding agent how a codebase works, document templates, and sets of sample inputs used to test a skill.',
    ideas: [
      { title: 'Prompt pack', body: 'A tested set of prompts for common delivery tasks.' },
      { title: 'Project instruction file', body: 'A starter file that tells a coding agent how a codebase is laid out and what to avoid.' },
      { title: 'Document template', body: "A template that follows the team's standard structure." },
      { title: 'Evaluation set', body: 'Sample inputs and the answers expected, used to check that a skill still works after a change.' },
    ],
    needs: [
      'A simple file layout that every team can follow',
      'A check that nothing real appears in the examples',
      'Guidance on how to test a prompt before sharing it',
    ],
    risk: 'Low',
    riskWhy: 'These are text only, so the main risk is real data slipping into an example.',
  },
];

export const assetByKey = (key: AssetKey) => assetTypes.find((a) => a.key === key) as AssetType;

/** The Security page's risk table. Skills appear twice, because a script changes the risk. */
export interface RiskRow {
  asset: string;
  can: string;
  risk: Risk;
  review: string;
}

export const riskRows: RiskRow[] = [
  { asset: 'Prompt or template', can: 'Text only.', risk: 'Low', review: 'Read it, and check the examples for real data.' },
  { asset: 'Skill: instructions only', can: 'Steers what the coding agent does.', risk: 'Low', review: 'Read SKILL.md and every reference file.' },
  {
    asset: 'Skill with scripts',
    can: "Runs code on the user's machine, with the user's permissions.",
    risk: 'Medium',
    review: 'Read every script. Confirm it does only what the skill says, and that network access and file writes are declared.',
  },
  {
    asset: 'Agent',
    can: 'Works with its own instructions and tool access.',
    risk: 'Medium',
    review: 'Check which tools it can use and what it can change.',
  },
  {
    asset: 'Plugin',
    can: 'Bundles several assets, and may run actions on its own.',
    risk: 'High',
    review: 'Review every part. Use a second reviewer.',
  },
  {
    asset: 'MCP server or connector',
    can: 'Gives the agent live access to another system.',
    risk: 'High',
    review: 'Needs the security lead to sign it off. Read-only first, and no credentials in the repository.',
  },
];
