// The main navigation. Pure data with no imports, so tests can read it with plain Node.
// `account` marks the pages that belong to the account (they carry the coloured square and name the client).

export type NavKey = 'home' | 'start' | 'library' | 'share' | 'security' | 'roadmap';

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  account: boolean;
}

export const nav: NavItem[] = [
  { key: 'home', label: 'Home', href: '/', account: false },
  { key: 'start', label: 'Get started', href: '/get-started/', account: false },
  { key: 'library', label: 'Library', href: '/skills/', account: true },
  { key: 'share', label: 'Share', href: '/share/', account: false },
  { key: 'security', label: 'Security', href: '/security/', account: false },
  { key: 'roadmap', label: 'Roadmap', href: '/roadmap/', account: true },
];
