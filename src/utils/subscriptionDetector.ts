import { Transaction, SubscriptionCadence, SubscriptionStatus, RecurringSubscription, SubscriptionAuditSummary } from '../types';
import { getCategoryColor } from './categorizer';

// Known subscription patterns for accurate categorization & matching
const KNOWN_SUBSCRIPTIONS: {
  pattern: RegExp;
  merchant: string;
  category: string;
  defaultCadence: SubscriptionCadence;
  color: string;
}[] = [
  { pattern: /netflix/i, merchant: 'Netflix', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#E50914' },
  { pattern: /spotify/i, merchant: 'Spotify', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#1DB954' },
  { pattern: /apple\.com|apple\s*music|icloud|apple\s*services/i, merchant: 'Apple Services (iCloud/Music)', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#A2AAAD' },
  { pattern: /disney\+|disney\s*plus/i, merchant: 'Disney+', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#113CCF' },
  { pattern: /amazon\s*prime|prime\s*video|amzn\s*prime/i, merchant: 'Amazon Prime', category: 'Shopping', defaultCadence: 'annual', color: '#FF9900' },
  { pattern: /hulu/i, merchant: 'Hulu', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#1CE783' },
  { pattern: /youtube\s*premium|google\s*youtube/i, merchant: 'YouTube Premium', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#FF0000' },
  { pattern: /chatgpt|openai/i, merchant: 'ChatGPT Plus (OpenAI)', category: 'Software & Technology', defaultCadence: 'monthly', color: '#10A37F' },
  { pattern: /github/i, merchant: 'GitHub', category: 'Software & Technology', defaultCadence: 'monthly', color: '#24292E' },
  { pattern: /google\s*storage|google\s*one/i, merchant: 'Google One', category: 'Software & Technology', defaultCadence: 'monthly', color: '#4285F4' },
  { pattern: /aws|amazon\s*web\s*services/i, merchant: 'Amazon Web Services', category: 'Software & Technology', defaultCadence: 'monthly', color: '#FF9900' },
  { pattern: /equinox/i, merchant: 'Equinox Fitness', category: 'Fitness & Wellness', defaultCadence: 'monthly', color: '#111827' },
  { pattern: /planet\s*fitness/i, merchant: 'Planet Fitness', category: 'Fitness & Wellness', defaultCadence: 'monthly', color: '#7C3AED' },
  { pattern: /gym|fitness|la\s*fitness|crossfit|orange\s*theory/i, merchant: 'Fitness Membership', category: 'Fitness & Wellness', defaultCadence: 'monthly', color: '#059669' },
  { pattern: /pg&e|pacific\s*gas|hydro\s*one|electric|water\s*dept|coned|utilities/i, merchant: 'Utility & Energy Bill', category: 'Utilities & Bills', defaultCadence: 'monthly', color: '#D97706' },
  { pattern: /comcast|xfinity|verizon|at&t|t-mobile|spectrum|charter/i, merchant: 'Internet & Telecom', category: 'Utilities & Bills', defaultCadence: 'monthly', color: '#2563EB' },
  { pattern: /geico|progressive|state\s*farm|allstate|liberty\s*mutual|insurance/i, merchant: 'Insurance Policy', category: 'Insurance & Protection', defaultCadence: 'monthly', color: '#0284C7' },
  { pattern: /property\s*management|rent\s*payment|luxury\s*apts|landlord|mortgage/i, merchant: 'Rent / Housing', category: 'Rent & Housing', defaultCadence: 'monthly', color: '#4F46E5' },
  { pattern: /nytimes|new\s*york\s*times|wsj|wall\s*street\s*journal|bloomberg/i, merchant: 'News & Media Subscription', category: 'Entertainment & Subscriptions', defaultCadence: 'monthly', color: '#1E293B' },
  { pattern: /adobe|creative\s*cloud/i, merchant: 'Adobe Creative Cloud', category: 'Software & Technology', defaultCadence: 'monthly', color: '#FF0000' },
  { pattern: /dropbox/i, merchant: 'Dropbox', category: 'Software & Technology', defaultCadence: 'annual', color: '#0061FF' },
  { pattern: /nordvpn|expressvpn|surfshark/i, merchant: 'VPN Security', category: 'Software & Technology', defaultCadence: 'annual', color: '#06B6D4' }
];

/**
 * Normalizes a merchant name or description into a clean cluster key.
 */
export function normalizeMerchantKey(raw: string, clean: string): string {
  const target = (clean || raw || '').toUpperCase().trim();
  
  // Check known patterns first
  for (const sub of KNOWN_SUBSCRIPTIONS) {
    if (sub.pattern.test(target)) {
      return sub.merchant;
    }
  }

  // Generic cleaning
  let cleaned = target
    .replace(/^(POS DEBIT|CHECKCARD|DEBIT CARD PURCHASE|PURCHASE AUTHORIZED ON|SQ \*|TST\*|PAYPAL \*|RECURRING PAYMENT TO)\s*/i, '')
    .replace(/#\d+.*$/, '')
    .replace(/\s+\d{3,}.*$/, '')
    .replace(/\s+(CA|NY|WA|TX|FL|ON|BC|QC|USA|CAN)\b.*$/i, '')
    .replace(/\.COM.*$/i, '')
    .trim();

  // Title case
  if (cleaned.length > 2) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return cleaned || clean || raw || 'Unknown Service';
}

/**
 * Computes difference in days between two YYYY-MM-DD date strings.
 */
function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Adds days or months to a date string.
 */
function addCadenceToDate(dateStr: string, cadence: SubscriptionCadence): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];

  if (cadence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (cadence === 'annual') {
    d.setFullYear(d.getFullYear() + 1);
  } else if (cadence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (cadence === 'bi_weekly') {
    d.setDate(d.getDate() + 14);
  } else if (cadence === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (cadence === 'semi_annual') {
    d.setMonth(d.getMonth() + 6);
  }

  return d.toISOString().split('T')[0];
}

/**
 * Calculates days remaining from current reference date to target date.
 */
export function calculateDaysUntil(targetDateStr: string, refDate: Date = new Date()): number {
  const target = new Date(targetDateStr);
  const now = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  if (isNaN(target.getTime())) return 0;
  const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetOnly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Main Algorithm: Sniffs, clusters, and calculates recurring subscription patterns
 * from the transaction history.
 */
export function detectRecurringSubscriptions(
  transactions: Transaction[],
  manualSubscriptions: Partial<RecurringSubscription>[] = [],
  currentDateRef: Date = new Date()
): { subscriptions: RecurringSubscription[]; summary: SubscriptionAuditSummary } {
  // Only inspect outflows/expenses
  const outflows = transactions.filter(t => {
    const amt = Number(t.amount);
    return amt < 0 || t.type === 'outflow';
  });

  // Group outflows by merchant key
  const groups = new Map<string, Transaction[]>();

  for (const tx of outflows) {
    const key = normalizeMerchantKey(tx.raw_description, tx.clean_merchant);
    const existing = groups.get(key) || [];
    existing.push(tx);
    groups.set(key, existing);
  }

  const detectedList: RecurringSubscription[] = [];

  for (const [merchantKey, txList] of groups.entries()) {
    // Sort chronological ascending
    const sorted = [...txList].sort((a, b) => a.date.localeCompare(b.date));
    const count = sorted.length;
    const amounts = sorted.map(t => Math.abs(Number(t.amount)));
    const latestTx = sorted[sorted.length - 1];
    const latestAmt = amounts[amounts.length - 1];
    const firstTx = sorted[0];

    // Check if this merchant matches a known subscription template
    const knownMatch = KNOWN_SUBSCRIPTIONS.find(k => k.merchant.toLowerCase() === merchantKey.toLowerCase() || k.pattern.test(latestTx.raw_description));

    // Determine Cadence & Confidence
    let detectedCadence: SubscriptionCadence = knownMatch ? knownMatch.defaultCadence : 'monthly';
    let confidence = 50;
    let isRecurring = false;
    let reason = '';

    if (count >= 2) {
      // Calculate intervals between consecutive occurrences
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push(daysBetween(sorted[i - 1].date, sorted[i].date));
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Check amount consistency
      const maxAmt = Math.max(...amounts);
      const minAmt = Math.min(...amounts);
      const amtSpread = maxAmt - minAmt;
      const isFixedAmount = amtSpread < (maxAmt * 0.15) || amtSpread < 2.0; // Within 15% or $2

      if (avgInterval >= 24 && avgInterval <= 36) {
        detectedCadence = 'monthly';
        isRecurring = true;
        confidence = isFixedAmount ? 95 : 82;
        reason = `Detected ${count} monthly cycles (avg interval ${Math.round(avgInterval)} days).`;
      } else if (avgInterval >= 320 && avgInterval <= 410) {
        detectedCadence = 'annual';
        isRecurring = true;
        confidence = isFixedAmount ? 92 : 80;
        reason = `Detected ${count} annual cycles (~${Math.round(avgInterval)} days interval).`;
      } else if (avgInterval >= 11 && avgInterval <= 18) {
        detectedCadence = 'bi_weekly';
        isRecurring = true;
        confidence = isFixedAmount ? 90 : 75;
        reason = `Detected bi-weekly schedule (${Math.round(avgInterval)} days interval).`;
      } else if (avgInterval >= 5 && avgInterval <= 9) {
        detectedCadence = 'weekly';
        isRecurring = true;
        confidence = isFixedAmount ? 88 : 70;
        reason = `Detected weekly recurring schedule (${Math.round(avgInterval)} days interval).`;
      } else if (avgInterval >= 75 && avgInterval <= 110) {
        detectedCadence = 'quarterly';
        isRecurring = true;
        confidence = isFixedAmount ? 86 : 72;
        reason = `Detected quarterly cycle (~${Math.round(avgInterval)} days).`;
      } else if (knownMatch) {
        // Known subscription even if irregular intervals
        isRecurring = true;
        detectedCadence = knownMatch.defaultCadence;
        confidence = 78;
        reason = `Matches verified subscription signature: ${knownMatch.merchant}`;
      }
    } else if (count === 1 && knownMatch) {
      // Single transaction matching known subscription service (e.g. Netflix, Equinox, Spotify, Apple Services)
      isRecurring = true;
      detectedCadence = knownMatch.defaultCadence;
      confidence = 75;
      reason = `Recognized subscription service '${knownMatch.merchant}'`;
    }

    if (!isRecurring) continue;

    // Check for price changes
    let hasPriceHike = false;
    let priceDiff = 0;
    let prevAmt = latestAmt;
    if (amounts.length >= 2) {
      prevAmt = amounts[amounts.length - 2];
      priceDiff = latestAmt - prevAmt;
      if (priceDiff >= 0.50) {
        hasPriceHike = true;
      }
    }

    // Average amount calculation
    const avgAmount = Math.round((amounts.reduce((a, b) => a + b, 0) / amounts.length) * 100) / 100;

    // Next Due Date calculation
    let nextDueDate = addCadenceToDate(latestTx.date, detectedCadence);
    
    // If calculated next due date is already in the far past, project forward to upcoming cycle
    let daysUntil = calculateDaysUntil(nextDueDate, currentDateRef);
    while (daysUntil < -20) {
      nextDueDate = addCadenceToDate(nextDueDate, detectedCadence);
      daysUntil = calculateDaysUntil(nextDueDate, currentDateRef);
    }

    // Annual & Monthly cost normalization
    let monthlyCost = latestAmt;
    let annualCost = latestAmt * 12;

    if (detectedCadence === 'annual') {
      monthlyCost = Math.round((latestAmt / 12) * 100) / 100;
      annualCost = latestAmt;
    } else if (detectedCadence === 'weekly') {
      monthlyCost = Math.round((latestAmt * 52 / 12) * 100) / 100;
      annualCost = latestAmt * 52;
    } else if (detectedCadence === 'bi_weekly') {
      monthlyCost = Math.round((latestAmt * 26 / 12) * 100) / 100;
      annualCost = latestAmt * 26;
    } else if (detectedCadence === 'quarterly') {
      monthlyCost = Math.round((latestAmt / 3) * 100) / 100;
      annualCost = latestAmt * 4;
    }

    // Determine status
    let status: SubscriptionStatus = 'active';
    if (hasPriceHike) {
      status = 'price_hike';
    } else if (daysUntil >= 0 && daysUntil <= 7) {
      status = 'upcoming_soon';
    } else if (daysUntil < 0 && daysUntil >= -14) {
      status = 'overdue';
    } else if (detectedCadence === 'annual' && daysUntil <= 30 && daysUntil >= 0) {
      status = 'annual_renewal';
    }

    const itemCategory = latestTx.category || (knownMatch ? knownMatch.category : 'Entertainment & Subscriptions');
    const occurrences = sorted.map(t => ({
      date: t.date,
      amount: Math.abs(Number(t.amount)),
      raw_description: t.raw_description,
      institution: t.institution,
      transactionId: t.id
    }));

    detectedList.push({
      id: `sub-${merchantKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      merchant: merchantKey,
      rawDescription: latestTx.raw_description,
      category: itemCategory,
      institution: latestTx.institution || 'Primary Card',
      cadence: detectedCadence,
      averageAmount: avgAmount,
      lastAmount: latestAmt,
      previousAmount: prevAmt,
      priceDifference: priceDiff,
      hasPriceHike,
      lastChargedDate: latestTx.date,
      nextDueDate,
      daysUntilDue: daysUntil,
      status,
      annualCost,
      monthlyCost,
      confidenceScore: confidence,
      detectionReason: reason,
      occurrences,
      color: knownMatch ? knownMatch.color : getCategoryColor(itemCategory)
    });
  }

  // Merge manual subscriptions
  for (const m of manualSubscriptions) {
    if (!m.merchant || !m.lastAmount) continue;
    const existingIndex = detectedList.findIndex(d => d.merchant.toLowerCase() === m.merchant?.toLowerCase());
    const monthlyCost = m.cadence === 'annual' ? (m.lastAmount / 12) : (m.lastAmount || 0);
    const annualCost = m.cadence === 'annual' ? (m.lastAmount || 0) : ((m.lastAmount || 0) * 12);
    const nextDate = m.nextDueDate || addCadenceToDate(m.lastChargedDate || new Date().toISOString().split('T')[0], m.cadence || 'monthly');
    const daysUntil = calculateDaysUntil(nextDate, currentDateRef);

    const manualItem: RecurringSubscription = {
      id: m.id || `manual-sub-${Date.now()}`,
      merchant: m.merchant,
      rawDescription: m.rawDescription || m.merchant,
      category: m.category || 'Entertainment & Subscriptions',
      institution: m.institution || 'Manual Track',
      cadence: m.cadence || 'monthly',
      averageAmount: m.lastAmount,
      lastAmount: m.lastAmount,
      hasPriceHike: false,
      lastChargedDate: m.lastChargedDate || new Date().toISOString().split('T')[0],
      nextDueDate: nextDate,
      daysUntilDue: daysUntil,
      status: daysUntil >= 0 && daysUntil <= 7 ? 'upcoming_soon' : 'active',
      annualCost,
      monthlyCost,
      confidenceScore: 100,
      detectionReason: 'Manually logged by user',
      occurrences: [],
      isManual: true,
      color: getCategoryColor(m.category || 'Entertainment & Subscriptions')
    };

    if (existingIndex >= 0) {
      detectedList[existingIndex] = { ...detectedList[existingIndex], ...manualItem, isManual: false };
    } else {
      detectedList.push(manualItem);
    }
  }

  // Sort by upcoming due date (closest first)
  detectedList.sort((a, b) => {
    // Upcoming first, then by monthly cost descending
    if (a.daysUntilDue >= 0 && b.daysUntilDue >= 0) {
      return a.daysUntilDue - b.daysUntilDue;
    }
    if (a.daysUntilDue >= 0) return -1;
    if (b.daysUntilDue >= 0) return 1;
    return b.monthlyCost - a.monthlyCost;
  });

  // Calculate Summary Statistics
  let totalMonthly = 0;
  let totalAnnual = 0;
  let upcomingCount7d = 0;
  let upcomingAmount7d = 0;
  let priceHikes = 0;
  const catMap = new Map<string, { amount: number; count: number }>();
  const cadenceMap = new Map<SubscriptionCadence, { count: number; monthly: number }>();

  let highestSub: RecurringSubscription | null = null;
  let nextRenewal: RecurringSubscription | null = null;

  for (const sub of detectedList) {
    totalMonthly += sub.monthlyCost;
    totalAnnual += sub.annualCost;

    if (sub.daysUntilDue >= 0 && sub.daysUntilDue <= 7) {
      upcomingCount7d++;
      upcomingAmount7d += sub.lastAmount;
    }

    if (sub.hasPriceHike) {
      priceHikes++;
    }

    if (!highestSub || sub.monthlyCost > highestSub.monthlyCost) {
      highestSub = sub;
    }

    if (sub.daysUntilDue >= 0) {
      if (!nextRenewal || sub.daysUntilDue < nextRenewal.daysUntilDue) {
        nextRenewal = sub;
      }
    }

    // Category breakdown
    const cat = sub.category || 'Other';
    const cData = catMap.get(cat) || { amount: 0, count: 0 };
    cData.amount += sub.monthlyCost;
    cData.count++;
    catMap.set(cat, cData);

    // Cadence breakdown
    const cad = sub.cadence;
    const cadData = cadenceMap.get(cad) || { count: 0, monthly: 0 };
    cadData.count++;
    cadData.monthly += sub.monthlyCost;
    cadenceMap.set(cad, cadData);
  }

  const categoryBreakdown = Array.from(catMap.entries()).map(([category, val]) => ({
    category,
    amount: Math.round(val.amount * 100) / 100,
    percentage: totalMonthly > 0 ? (val.amount / totalMonthly) * 100 : 0,
    count: val.count,
    color: getCategoryColor(category)
  })).sort((a, b) => b.amount - a.amount);

  const cadenceLabels: Record<SubscriptionCadence, string> = {
    monthly: 'Monthly Charges',
    annual: 'Annual Renewals',
    weekly: 'Weekly Charges',
    bi_weekly: 'Bi-Weekly Charges',
    quarterly: 'Quarterly Charges',
    semi_annual: 'Semi-Annual Charges'
  };

  const cadenceBreakdown = Array.from(cadenceMap.entries()).map(([cadence, val]) => ({
    cadence,
    label: cadenceLabels[cadence] || cadence,
    count: val.count,
    monthlyEquivalent: Math.round(val.monthly * 100) / 100
  }));

  const summary: SubscriptionAuditSummary = {
    totalMonthlyCommitment: Math.round(totalMonthly * 100) / 100,
    totalAnnualCommitment: Math.round(totalAnnual * 100) / 100,
    activeCount: detectedList.length,
    upcomingCount7Days: upcomingCount7d,
    upcomingAmount7Days: Math.round(upcomingAmount7d * 100) / 100,
    priceHikesCount: priceHikes,
    highestSubscription: highestSub ? { merchant: highestSub.merchant, amount: highestSub.lastAmount, cadence: highestSub.cadence } : null,
    nextRenewal: nextRenewal ? { merchant: nextRenewal.merchant, amount: nextRenewal.lastAmount, nextDueDate: nextRenewal.nextDueDate, daysUntilDue: nextRenewal.daysUntilDue } : null,
    categoryBreakdown,
    cadenceBreakdown
  };

  return {
    subscriptions: detectedList,
    summary
  };
}
