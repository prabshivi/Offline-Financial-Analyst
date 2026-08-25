/**
 * Dynamic Environment Configuration & Multi-Page / Custom Domain Manager
 * Manages runtime domain binding, site enablement status, and dynamic feature/page switches.
 */

export interface DynamicPageConfig {
  id: string;
  label: string;
  path: string;
  iconName: string;
  description: string;
  badge?: string;
  category: 'core' | 'planning' | 'data' | 'security' | 'advanced';
  defaultEnabled: boolean;
}

export const ALL_SYSTEM_PAGES: DynamicPageConfig[] = [
  {
    id: 'dashboard',
    label: 'Overview & Telemetry',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
    description: 'Personal wealth & cashflow telemetry',
    category: 'core',
    defaultEnabled: true
  },
  {
    id: 'budget',
    label: 'Target Budgets',
    path: '/householdbudget',
    iconName: 'Target',
    description: 'Monthly category budget caps & envelopes',
    badge: 'Targets',
    category: 'planning',
    defaultEnabled: true
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions & Bills',
    path: '/subscriptions',
    iconName: 'CalendarClock',
    description: 'Monthly & annual recurring commitments',
    badge: 'Audit',
    category: 'planning',
    defaultEnabled: true
  },
  {
    id: 'debt-payoff',
    label: 'Debt Payoff & Loans',
    path: '/debtpayoff',
    iconName: 'Calculator',
    description: 'Snowball, avalanche & mortgage payoff',
    badge: 'Payoff',
    category: 'planning',
    defaultEnabled: true
  },
  {
    id: 'ingestion',
    label: 'Statement Ingestion',
    path: '/bank-statements',
    iconName: 'UploadCloud',
    description: 'AI-assisted PDF & document extractor',
    badge: 'AI Vision',
    category: 'data',
    defaultEnabled: true
  },
  {
    id: 'ledger',
    label: 'Master Ledger',
    path: '/ledger',
    iconName: 'Receipt',
    description: 'Searchable, encrypted transaction records',
    category: 'data',
    defaultEnabled: true
  },
  {
    id: 'rules',
    label: 'Categorization Rules',
    path: '/rules',
    iconName: 'Sparkles',
    description: 'Automated merchant rules & logic',
    category: 'data',
    defaultEnabled: true
  },
  {
    id: 'reports',
    label: 'Analytics & Reports',
    path: '/reports',
    iconName: 'BarChart3',
    description: 'Cashflow trends, spending velocity & net worth',
    badge: 'Analytics',
    category: 'advanced',
    defaultEnabled: true
  },
  {
    id: 'tax-planner',
    label: 'Tax Deduction Hub',
    path: '/tax-planner',
    iconName: 'FileSpreadsheet',
    description: 'Deductible write-offs & tax categories',
    badge: 'Tax',
    category: 'advanced',
    defaultEnabled: true
  },
  {
    id: 'auto-fetch',
    label: 'Auto-Sync & Dropzone',
    path: '/auto-fetch',
    iconName: 'FolderSync',
    description: 'Background statement watch & webhooks',
    badge: 'Daemon',
    category: 'data',
    defaultEnabled: true
  },
  {
    id: 'nightly',
    label: 'Peace of Mind Audit',
    path: '/security-audit',
    iconName: 'ShieldCheck',
    description: 'Local verification & zero-cloud integrity',
    badge: 'Audit',
    category: 'security',
    defaultEnabled: true
  },
  {
    id: 'security',
    label: 'Vault Security',
    path: '/security',
    iconName: 'Lock',
    description: 'AES-256 keys, backups & master pass',
    category: 'security',
    defaultEnabled: true
  },
  {
    id: 'domain-settings',
    label: 'Domain & Site Engine',
    path: '/domain-config',
    iconName: 'Globe',
    description: 'Environment variables & custom domain binding',
    badge: 'Config',
    category: 'advanced',
    defaultEnabled: true
  }
];

const LOCAL_STORAGE_PAGES_KEY = 'vault_custom_enabled_pages';
const LOCAL_STORAGE_CUSTOM_DOMAIN_KEY = 'vault_custom_domain_override';

/**
 * Gets active custom domain configured via Environment Variables or runtime override
 */
export function getAppDomain(): string {
  // 1. Check client-side environment variable VITE_CUSTOM_DOMAIN or VITE_APP_DOMAIN
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  const envDomain = metaEnv.VITE_CUSTOM_DOMAIN || metaEnv.VITE_APP_DOMAIN || metaEnv.VITE_DOMAIN;

  if (envDomain && typeof envDomain === 'string' && envDomain.trim().length > 0) {
    return envDomain.trim();
  }

  // 2. Check local user preference override
  if (typeof window !== 'undefined') {
    const localOverride = localStorage.getItem(LOCAL_STORAGE_CUSTOM_DOMAIN_KEY);
    if (localOverride && localOverride.trim().length > 0) {
      return localOverride.trim();
    }
  }

  // 3. Fallback to current browser hostname if valid
  if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.hostname;
  }

  return 'www.offlinefinancevault.com';
}

/**
 * Sets a custom domain override in localStorage
 */
export function setCustomDomainOverride(domain: string): void {
  if (typeof window !== 'undefined') {
    if (!domain || domain.trim() === '') {
      localStorage.removeItem(LOCAL_STORAGE_CUSTOM_DOMAIN_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_DOMAIN_KEY, domain.trim());
    }
  }
}

/**
 * Checks whether the site is enabled via environment variable VITE_SITE_ENABLED
 */
export function isSiteEnabled(): boolean {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  if (metaEnv.VITE_SITE_ENABLED !== undefined) {
    const val = String(metaEnv.VITE_SITE_ENABLED).toLowerCase().trim();
    if (val === 'false' || val === '0' || val === 'disabled') {
      return false;
    }
  }
  return true;
}

/**
 * Resolves list of currently enabled page IDs based on:
 * 1. VITE_ENABLED_PAGES env variable (e.g. "dashboard,budget,subscriptions,debt-payoff,ingestion,ledger,rules,reports,tax-planner,auto-fetch,nightly,security,domain-settings")
 * 2. User localStorage toggles
 * 3. Default system page configuration
 */
export function getEnabledPageIds(): string[] {
  // 1. Check env variable
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};
  if (metaEnv.VITE_ENABLED_PAGES) {
    const raw = String(metaEnv.VITE_ENABLED_PAGES);
    const parsed = raw.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (parsed.length > 0) {
      // Always ensure core 'dashboard' and 'security' are present
      if (!parsed.includes('dashboard')) parsed.unshift('dashboard');
      if (!parsed.includes('security')) parsed.push('security');
      return parsed;
    }
  }

  // 2. Check localStorage override
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PAGES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes('dashboard')) parsed.unshift('dashboard');
          if (!parsed.includes('security')) parsed.push('security');
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Default to all system pages
  return ALL_SYSTEM_PAGES.filter((p) => p.defaultEnabled).map((p) => p.id);
}

/**
 * Checks if a specific page ID is currently enabled
 */
export function isPageEnabled(pageId: string): boolean {
  const enabledList = getEnabledPageIds();
  return enabledList.includes(pageId);
}

/**
 * Saves enabled pages to localStorage
 */
export function saveEnabledPageIds(pageIds: string[]): void {
  if (typeof window !== 'undefined') {
    // Ensure dashboard is always enabled
    const set = new Set(pageIds);
    set.add('dashboard');
    set.add('security');
    localStorage.setItem(LOCAL_STORAGE_PAGES_KEY, JSON.stringify(Array.from(set)));
  }
}
