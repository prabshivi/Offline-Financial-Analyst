/**
 * Multi-Page Routing & Canonical URL Navigation System
 * Designed for offlinefiniancialvault.com with full HTML5 History API and deep-linking.
 */

export interface RouteDefinition {
  id: string;
  canonicalPath: string;
  aliases: string[];
  title: string;
  metaDescription: string;
  category: 'core' | 'planning' | 'data' | 'security';
}

export const DOMAIN_NAME = 'offlinefiniancialvault.com';

export const ROUTES: RouteDefinition[] = [
  {
    id: 'dashboard',
    canonicalPath: '/dashboard',
    aliases: ['/', '/dashboard', '/overview', '/home'],
    title: "Financial Vault Dashboard — Zack's Doghouse",
    metaDescription: 'Real-time financial overview, spending breakdowns, mascot mood, and savings analytics.',
    category: 'core'
  },
  {
    id: 'budget',
    canonicalPath: '/householdbudget',
    aliases: ['/householdbudget', '/budget', '/budgets', '/household-budget', '/spending-plan'],
    title: 'Household Budget Tracker — Food Bowl Budgets',
    metaDescription: 'Zero-based envelope budgeting, monthly expense targets, rollover balances, and spending radar.',
    category: 'planning'
  },
  {
    id: 'subscriptions',
    canonicalPath: '/subscriptions',
    aliases: ['/subscriptions', '/recurring', '/bills', '/recurring-expenses'],
    title: 'Recurring Subscriptions & Fixed Commitments',
    metaDescription: 'Automated 3-cycle recurring charge audit, subscription renewal tracker, and cost projection.',
    category: 'planning'
  },
  {
    id: 'debt-payoff',
    canonicalPath: '/debtpayoff',
    aliases: ['/debtpayoff', '/debt-payoff', '/debt', '/bone-burier', '/calculator'],
    title: 'Debt Payoff Engine & Loan Amortization — Bone Burier',
    metaDescription: 'Snowball vs. Avalanche payoff calculators, mortgage amortization schedules, and interest savings.',
    category: 'planning'
  },
  {
    id: 'ingestion',
    canonicalPath: '/bank-statements',
    aliases: ['/bank-statements', '/ingestion', '/fetch', '/upload', '/statements', '/import'],
    title: 'Bank Statement Ingestion & Multimodal Vision AI',
    metaDescription: 'Zero-cloud local statement parser supporting PDF, CSV, OFX, and QBO with automatic PII redaction.',
    category: 'data'
  },
  {
    id: 'ledger',
    canonicalPath: '/ledger',
    aliases: ['/ledger', '/transactions', '/history', '/master-ledger', '/all-transactions'],
    title: 'Master Golden Ledger — Encrypted Transaction History',
    metaDescription: 'Comprehensive searchable, filterable, and editable ledger stored in encrypted SQLite.',
    category: 'data'
  },
  {
    id: 'rules',
    canonicalPath: '/rules',
    aliases: ['/rules', '/tricks', '/categorization', '/auto-rules'],
    title: "Auto-Categorization Rules — Zack's Learned Tricks",
    metaDescription: 'Deterministic pattern matching and regex rules for 100% automated transaction categorization.',
    category: 'data'
  },
  {
    id: 'security',
    canonicalPath: '/security',
    aliases: ['/security', '/vault-settings', '/settings', '/encryption', '/privacy'],
    title: 'Guard Dog Vault Settings & AES-256 Encryption',
    metaDescription: 'Local SQLCipher security configuration, emergency passphrases, exportable backups, and wipe controls.',
    category: 'security'
  },
  {
    id: 'nightly',
    canonicalPath: '/security-audit',
    aliases: ['/security-audit', '/nightly', '/audit', '/peace-of-mind'],
    title: 'Peace of Mind Security Audit & Verification Engine',
    metaDescription: 'Zero-cloud leak inspection, cryptographic integrity tests, and compliance validation.',
    category: 'security'
  }
];

/**
 * Resolves current pathname or hash to active tab ID
 */
export function getTabFromLocation(): string {
  if (typeof window === 'undefined') return 'dashboard';

  let path = window.location.pathname.toLowerCase().trim();
  
  // Also check hash for iframe / static hosting compatibility if pathname is root
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    path = window.location.hash.slice(1).toLowerCase().trim();
  }

  // Remove trailing slashes (except root '/')
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  for (const route of ROUTES) {
    if (route.aliases.includes(path) || route.canonicalPath === path) {
      return route.id;
    }
  }

  return 'dashboard';
}

/**
 * Returns canonical route definition for a given tab ID
 */
export function getRouteByTab(tabId: string): RouteDefinition {
  const found = ROUTES.find(r => r.id === tabId);
  return found || ROUTES[0];
}

/**
 * Pushes updated route into browser history without reloading
 */
export function syncRouteToHistory(tabId: string): void {
  if (typeof window === 'undefined') return;

  const route = getRouteByTab(tabId);
  const currentPath = window.location.pathname;

  // Update document title dynamically
  document.title = `${route.title} | ${DOMAIN_NAME}`;

  if (currentPath !== route.canonicalPath && !route.aliases.includes(currentPath)) {
    try {
      window.history.pushState({ tab: tabId }, route.title, route.canonicalPath);
    } catch (e) {
      // Fallback for sandboxed iframes where pushState might be restricted
      try {
        window.location.hash = `#${route.canonicalPath}`;
      } catch (_) {}
    }
  }
}

/**
 * Constructs clean domain URL for copying / sharing
 */
export function getFullDomainUrl(tabId: string, customDomain = DOMAIN_NAME): string {
  const route = getRouteByTab(tabId);
  return `https://${customDomain}${route.canonicalPath}`;
}
