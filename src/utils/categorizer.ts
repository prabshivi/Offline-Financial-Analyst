import { Rule } from '../types';

export const STANDARD_CATEGORIES = [
  { name: 'Income', color: '#10B981', icon: 'TrendingUp', type: 'inflow' },
  { name: 'Groceries', color: '#3B82F6', icon: 'ShoppingCart', type: 'outflow' },
  { name: 'Dining Out', color: '#F59E0B', icon: 'Utensils', type: 'outflow' },
  { name: 'Coffee & Drinks', color: '#8B5CF6', icon: 'Coffee', type: 'outflow' },
  { name: 'Shopping', color: '#EC4899', icon: 'ShoppingBag', type: 'outflow' },
  { name: 'Transportation', color: '#06B6D4', icon: 'Car', type: 'outflow' },
  { name: 'Gas & Fuel', color: '#F97316', icon: 'Fuel', type: 'outflow' },
  { name: 'Entertainment & Subscriptions', color: '#6366F1', icon: 'Tv', type: 'outflow' },
  { name: 'Utilities & Bills', color: '#64748B', icon: 'Zap', type: 'outflow' },
  { name: 'Rent & Housing', color: '#14B8A6', icon: 'Home', type: 'outflow' },
  { name: 'Health & Pharmacy', color: '#EF4444', icon: 'HeartPulse', type: 'outflow' },
  { name: 'Fitness & Wellness', color: '#84CC16', icon: 'Activity', type: 'outflow' },
  { name: 'Travel & Lodging', color: '#A855F7', icon: 'Plane', type: 'outflow' },
  { name: 'Investments', color: '#059669', icon: 'PieChart', type: 'outflow' },
  { name: 'Education', color: '#38BDF8', icon: 'GraduationCap', type: 'outflow' },
  { name: 'Miscellaneous', color: '#94A3B8', icon: 'Tag', type: 'outflow' },
];

export const DEFAULT_RULES: Rule[] = [
  { id: 'rule-1', pattern: 'PAYROLL|SALARY|DIRECT DEP|EMPLOYER|GUSTO|ADP|WORKDAY|TREASURY', category: 'Income', clean_merchant: 'Salary & Payroll', priority: 10 },
  { id: 'rule-2', pattern: 'WHOLEFDS|TRADER JOE|SAFEWAY|KROGER|ALDI|WEGMANS|SPROUTS|HEB|PUBLIX|COSTCO|MARKET BASKET', category: 'Groceries', clean_merchant: 'Grocery Store', priority: 5 },
  { id: 'rule-3', pattern: 'STARBUCKS|DUNKIN|PEETS|BLUE BOTTLE|PHILZ|COFFEE|CAFE|DUTCH BROS', category: 'Coffee & Drinks', clean_merchant: 'Coffee Shop', priority: 5 },
  { id: 'rule-4', pattern: 'UBER|LYFT|CAB|TAXI|METRO|MTA|BART|TRANSIT|CALTRAIN|PARKING|SP PLUS', category: 'Transportation', clean_merchant: 'Rideshare & Transit', priority: 5 },
  { id: 'rule-5', pattern: 'AMZN|AMAZON|PRIME|TARGET|WALMART|BEST BUY|EBAY|ETSY', category: 'Shopping', clean_merchant: 'Retail & Shopping', priority: 4 },
  { id: 'rule-6', pattern: 'NETFLIX|SPOTIFY|HULU|DISNEY|APPLE\\.COM|YOUTUBE|HBO|MAX|PARAMOUNT|AUDIBLE|NYTIMES', category: 'Entertainment & Subscriptions', clean_merchant: 'Streaming & Media', priority: 5 },
  { id: 'rule-7', pattern: 'DOORDASH|UBER EATS|GRUBHUB|CHIPOTLE|SWEETGREEN|MCDONALD|SHAKE SHACK|PANERA|CAVA|IN-N-OUT|PIZZA|RESTAURANT|SUSHI|DINER', category: 'Dining Out', clean_merchant: 'Restaurant / Dining', priority: 5 },
  { id: 'rule-8', pattern: 'SHELL|CHEVRON|EXXON|BP|MOBIL|\\bGAS\\b|SUNOCO|VALERO|SPEEDWAY|76 GAS|GASOLINE', category: 'Gas & Fuel', clean_merchant: 'Gas Station', priority: 5 },
  { id: 'rule-9', pattern: 'CVS|WALGREENS|RITE AID|PHARMACY|DUANE READE|WALGREENS', category: 'Health & Pharmacy', clean_merchant: 'Pharmacy & Health', priority: 5 },
  { id: 'rule-10', pattern: 'PG&E|PG AND E|PGE|PACIFIC GAS|CONED|ELECTRIC|WATER|NATIONAL GRID|VERIZON|AT&T|T-MOBILE|COMCAST|XFINITY|SPECTRUM|HYDRO|ENBRIDGE', category: 'Utilities & Bills', clean_merchant: 'Utility Provider', priority: 7 },
  { id: 'rule-11', pattern: 'FIDELITY|VANGUARD|SCHWAB|ROBINHOOD|COINBASE|WEALTHFRONT|BETTERMENT', category: 'Investments', clean_merchant: 'Investment / Brokerage', priority: 6 },
  { id: 'rule-12', pattern: 'EQUINOX|PLANET FITNESS|GYM|YOGA|CROSSFIT|ORANGETHEORY|SOULCYCLE|PELOTON', category: 'Fitness & Wellness', clean_merchant: 'Fitness & Gym', priority: 5 },
  { id: 'rule-13', pattern: 'RENT|LEASING|APARTMENT|PROPERTY MGMT|AVALON|EQUITY RES', category: 'Rent & Housing', clean_merchant: 'Housing / Rent', priority: 8 },
  { id: 'rule-14', pattern: 'AIRBNB|HOTEL|DELTA|UNITED|AMERICAN AIR|MARRIOTT|HILTON|HYATT|SOUTHWEST', category: 'Travel & Lodging', clean_merchant: 'Travel & Airlines', priority: 5 },
];

/**
 * Computes deterministic ID hash for deduplication
 * Hash of Date + Raw_Description + Amount + Institution
 */
export function generateTransactionId(date: string, rawDescription: string, amount: number, institution: string): string {
  const raw = `${date.trim()}|${rawDescription.trim().toUpperCase()}|${Number(amount).toFixed(2)}|${institution.trim().toUpperCase()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Hex string padded
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Secondary hash pass for collision resistance
  let hash2 = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash2 = (hash2 * 33) ^ raw.charCodeAt(i);
  }
  const hex2 = Math.abs(hash2 >>> 0).toString(16).padStart(8, '0');

  return `${hex1}${hex2}`;
}

export function categorizeTransaction(rawDescription: string, customRules: Rule[] = []): string {
  const rules = [...customRules, ...DEFAULT_RULES].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const upper = rawDescription.toUpperCase();

  for (const r of rules) {
    if (!r.pattern) continue;
    try {
      const regex = new RegExp(r.pattern, 'i');
      if (regex.test(upper)) {
        return r.category;
      }
    } catch {
      if (upper.includes(r.pattern.toUpperCase())) {
        return r.category;
      }
    }
  }

  return 'Miscellaneous';
}

export function cleanMerchantName(rawDescription: string, customRules: Rule[] = []): string {
  const rules = [...customRules, ...DEFAULT_RULES].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const upper = rawDescription.toUpperCase();

  for (const r of rules) {
    if (r.clean_merchant && r.pattern) {
      try {
        const regex = new RegExp(r.pattern, 'i');
        if (regex.test(upper)) {
          return r.clean_merchant;
        }
      } catch {
        if (upper.includes(r.pattern.toUpperCase())) {
          return r.clean_merchant;
        }
      }
    }
  }

  // Generic heuristic cleanup
  let cleaned = rawDescription
    .replace(/^(POS DEBIT|CHECKCARD|DEBIT CARD PURCHASE|PURCHASE AUTHORIZED ON|SQ \*|TST\*|PAYPAL \*|RECURRING PAYMENT)/i, '')
    .replace(/(\.COM|STORE|#\d+|LLC|INC|CORP|\d{4,}).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Title case
  if (cleaned.length > 2) {
    return cleaned.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
  }

  return rawDescription;
}

export function getCategoryColor(categoryName: string): string {
  const found = STANDARD_CATEGORIES.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  return found?.color || '#94A3B8';
}
