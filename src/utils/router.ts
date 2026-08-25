/**
 * Multi-Page Routing & Canonical URL Navigation System
 * Designed for www.offlinefinancevault.com with full HTML5 History API and deep-linking.
 */

import { getAppDomain, isPageEnabled } from './envConfig';

export interface RouteDefinition {
  id: string;
  canonicalPath: string;
  aliases: string[];
  title: string;
  metaDescription: string;
  category: 'core' | 'planning' | 'data' | 'security' | 'advanced';
}

export const DOMAIN_NAME = getAppDomain();

export const ROUTES: RouteDefinition[] = [
  {
    id: 'dashboard',
    canonicalPath: '/dashboard',
    aliases: ['/', '/dashboard', '/overview', '/home'],
    title: 'Financial Vault Dashboard & Telemetry',
    metaDescription: 'Real-time financial overview, spending velocity, cashflow telemetry, and savings analytics.',
    category: 'core'
  },
  {
    id: 'budget',
    canonicalPath: '/householdbudget',
    aliases: ['/householdbudget', '/budget', '/budgets', '/household-budget', '/spending-plan'],
    title: 'Target Budgets & Envelopes',
    metaDescription: 'Zero-based envelope budgeting, monthly expense targets, rollover balances, and spending radar.',
    category: 'planning'
  },
  {
    id: 'subscriptions',
    canonicalPath: '/subscriptions',
    aliases: ['/subscriptions', '/recurring', '/bills', '/recurring-expenses'],
    title: 'Recurring Subscriptions & Fixed Commitments',
    metaDescription: 'Automated recurring charge audit, subscription renewal tracker, and cost projection.',
    category: 'planning'
  },
  {
    id: 'debt-payoff',
    canonicalPath: '/debtpayoff',
    aliases: ['/debtpayoff', '/debt-payoff', '/debt', '/calculator'],
    title: 'Debt Payoff Engine & Loan Amortization',
    metaDescription: 'Snowball vs. Avalanche payoff calculators, mortgage amortization schedules, and interest savings.',
    category: 'planning'
  },
  {
    id: 'ingestion',
    canonicalPath: '/bank-statements',
    aliases: ['/bank-statements', '/ingestion', '/fetch', '/upload', '/statements', '/import'],
    title: 'Statement Ingestion & AI Document Parser',
    metaDescription: 'Zero-cloud local statement parser supporting PDF, CSV, OFX, and QBO with automatic PII redaction.',
    category: 'data'
  },
  {
    id: 'ledger',
    canonicalPath: '/ledger',
    aliases: ['/ledger', '/transactions', '/history', '/master-ledger', '/all-transactions'],
    title: 'Master Encrypted Ledger',
    metaDescription: 'Comprehensive searchable, filterable, and editable ledger stored in encrypted SQLite.',
    category: 'data'
  },
  {
    id: 'rules',
    canonicalPath: '/rules',
    aliases: ['/rules', '/tricks', '/categorization', '/auto-rules'],
    title: 'Auto-Categorization Rules & Logic',
    metaDescription: 'Deterministic pattern matching and regex rules for 100% automated transaction categorization.',
    category: 'data'
  },
  {
    id: 'reports',
    canonicalPath: '/reports',
    aliases: ['/reports', '/analytics', '/trends', '/annual-summary'],
    title: 'Financial Analytics & Net Worth Reports',
    metaDescription: 'Multi-period cashflow analytics, category spending trends, and annual net worth evolution.',
    category: 'advanced'
  },
  {
    id: 'tax-planner',
    canonicalPath: '/tax-planner',
    aliases: ['/tax-planner', '/taxes', '/deductions', '/writeoffs'],
    title: 'Tax Deduction Hub & Write-Off Center',
    metaDescription: 'Track eligible business write-offs, deductible expenses, charitable donations, and tax categories.',
    category: 'advanced'
  },
  {
    id: 'auto-fetch',
    canonicalPath: '/auto-fetch',
    aliases: ['/auto-fetch', '/dropzone', '/sync', '/webhooks'],
    title: 'Auto-Sync & Statement Dropzone Watcher',
    metaDescription: 'Background statement watch daemon, automated dropzone scanner, and ingestion webhooks.',
    category: 'data'
  },
  {
    id: 'nightly',
    canonicalPath: '/security-audit',
    aliases: ['/security-audit', '/nightly', '/audit', '/peace-of-mind'],
    title: 'Peace of Mind Security Audit & Verification',
    metaDescription: 'Zero-cloud leak inspection, cryptographic integrity tests, and compliance validation.',
    category: 'security'
  },
  {
    id: 'security',
    canonicalPath: '/security',
    aliases: ['/security', '/vault-settings', '/settings', '/encryption', '/privacy'],
    title: 'Vault Security & Encryption Settings',
    metaDescription: 'Local AES-256 security configuration, emergency passphrases, exportable backups, and wipe controls.',
    category: 'security'
  },
  {
    id: 'domain-settings',
    canonicalPath: '/domain-config',
    aliases: ['/domain-config', '/domain', '/site-settings', '/environment'],
    title: 'Domain & Site Engine Configuration',
    metaDescription: 'Configure active custom domain, site enablement status, and dynamic page routing.',
    category: 'advanced'
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
      // If the route is enabled, return it
      if (isPageEnabled(route.id)) {
        return route.id;
      }
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
  const activeDomain = getAppDomain();
  const currentPath = window.location.pathname;

  // Update document title dynamically
  document.title = `${route.title} | ${activeDomain}`;

  if (currentPath !== route.canonicalPath && !route.aliases.includes(currentPath)) {
    try {
      window.history.pushState({ tab: tabId }, route.title, route.canonicalPath);
    } catch {
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
export function getFullDomainUrl(tabId: string, customDomain = getAppDomain()): string {
  const route = getRouteByTab(tabId);
  return `https://${customDomain}${route.canonicalPath}`;
}

