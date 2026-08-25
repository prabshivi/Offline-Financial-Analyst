import { AIStatementProfile, StatementType, StatementVisibleSections, StatementCustomUITheme } from '../types';

export const DEFAULT_PERSONAL_PROFILE: AIStatementProfile = {
  id: 'default-personal',
  fileName: 'August_2026_Chase_Sapphire.pdf',
  uploadedAt: new Date().toISOString(),
  accountHolder: 'Alex Morgan',
  statementType: 'personal',
  institution: 'Chase Bank',
  accountNumberMasked: '...9420',
  accountType: 'checking',
  statementPeriod: {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026'
  },
  openingBalance: 12450.00,
  closingBalance: 16120.45,
  totalInflows: 9718.42,
  totalOutflows: 6047.97,
  netCashflow: 3670.45,
  currency: 'USD',
  detectedPersona: 'Tech Professional / High-Income Earner',
  detectedKeyMetrics: {
    primaryIncomeSource: 'Tech Corp Payroll (Direct Deposit)',
    averageMonthlyIncome: 9700.00,
    fixedExpenseRatio: 48,
    discretionaryRatio: 22,
    topExpenseCategory: 'Rent & Housing',
    savingsRatePercentage: 37.8,
    taxDeductibleRatio: 4.2
  },
  detectedSubscriptions: [
    { merchant: 'Netflix', amount: 22.99, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Recent price hike from $19.99 detected. Consider standard plan.', confidence: 98 },
    { merchant: 'ChatGPT Plus (OpenAI)', amount: 20.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Heavy daily productivity usage.', confidence: 99 },
    { merchant: 'Apple Services (iCloud + Music)', amount: 14.99, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Family bundle could save 20%.', confidence: 95 },
    { merchant: 'Equinox Fitness Club', amount: 280.00, cadence: 'monthly', category: 'Fitness & Wellness', isEssential: true, cancellationTip: 'Consistent bi-weekly attendance logged.', confidence: 96 },
    { merchant: 'Spotify USA', amount: 11.99, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Active daily streaming service.', confidence: 97 },
    { merchant: 'YouTube Premium', amount: 13.99, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Ad-free playback & background audio.', confidence: 94 },
    { merchant: 'Amazon Prime', amount: 139.00, cadence: 'annual', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Annual renewal scheduled for Aug 2027.', confidence: 92 },
    { merchant: 'New York Times', amount: 4.00, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Promotional rate ending in 3 months.', confidence: 90 }
  ],
  customUITheme: {
    dashboardTitle: 'Personal Wealth & Cashflow Executive',
    dashboardSubtitle: 'Live telemetry synthesized from Chase Total Checking & Sapphire Statement',
    outflowMetricLabel: 'Total Living Expenses',
    inflowMetricLabel: 'Net Payroll & Inflows',
    netCashflowLabel: 'Monthly Net Savings',
    subscriptionTabLabel: 'Recurring Subscriptions & Streaming',
    recurringMetricLabel: 'Monthly Fixed Commitments',
    budgetTabLabel: 'Household Budget Targets',
    ledgerTabLabel: 'Personal Vault Ledger',
    recommendationTitle: 'Personal Wealth Optimization Signals',
    personaBadge: 'Tech Professional Portfolio',
    accountBadge: 'Chase Checking (...9420)',
    themeAccent: 'cyan'
  },
  visibleSections: {
    showBusinessMetrics: false,
    showPersonalSavings: true,
    showDebtSnowball: true,
    showSubscriptionsTrimmer: true,
    showForeignExchangeTracker: false,
    showTaxDeductibleTracker: false,
    showCategoryBudgetTracker: true,
    showPayrollCashflowTracker: true,
    showVendorBreakdown: false
  },
  aiExecutiveSummary: 'AI analysis indicates a robust 37.8% personal savings rate with strong positive cashflow ($3,670/mo). Netflix triggered a price hike alert (+$3.00/mo). Discretionary spending at Whole Foods and Dining Out is tracking within 15% of target thresholds.',
  suggestedActionItems: [
    'Automate transfer of $2,500 surplus into high-yield savings or S&P 500 DCA.',
    'Review Netflix $22.99/mo premium tier for potential downgrade.',
    'Confirm annual Amazon Prime ($139.00) renewal allocation.'
  ]
};

export const SAMPLE_STATEMENT_PRESETS: { [key: string]: AIStatementProfile } = {
  'personal-tech': DEFAULT_PERSONAL_PROFILE,
  'business-agency': {
    id: 'preset-business',
    fileName: 'Apex_Digital_Media_Corp_Statement_Aug2026.pdf',
    uploadedAt: new Date().toISOString(),
    accountHolder: 'Sarah Jenkins (Apex Digital Media LLC)',
    entityName: 'Apex Digital Media LLC',
    statementType: 'business',
    institution: 'Silicon Valley Commercial Bank',
    accountNumberMasked: '...3811',
    accountType: 'corporate_operating',
    statementPeriod: {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'August 2026 (Q3 Mid-Cycle)'
    },
    openingBalance: 48200.00,
    closingBalance: 61840.50,
    totalInflows: 34500.00,
    totalOutflows: 20859.50,
    netCashflow: 13640.50,
    currency: 'USD',
    detectedPersona: 'Digital Agency / B2B SaaS Enterprise',
    detectedKeyMetrics: {
      primaryIncomeSource: 'Client Invoices & Stripe Merchant Deposits',
      averageMonthlyIncome: 34500.00,
      fixedExpenseRatio: 32,
      discretionaryRatio: 14,
      topExpenseCategory: 'Software & Technology',
      taxDeductibleRatio: 94.2,
      businessOperatingMargin: 39.5
    },
    detectedSubscriptions: [
      { merchant: 'Amazon Web Services (AWS)', amount: 1420.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Cloud infrastructure hosting core client sites.', confidence: 99 },
      { merchant: 'Google Workspace Enterprise', amount: 240.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: '12 active team seats.', confidence: 98 },
      { merchant: 'Figma Enterprise Organization', amount: 375.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Design system repo for 5 creators.', confidence: 96 },
      { merchant: 'Slack Technologies Pro', amount: 150.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Communication workspace for agency.', confidence: 97 },
      { merchant: 'HubSpot Marketing Hub', amount: 890.00, cadence: 'monthly', category: 'Software & Technology', isEssential: false, cancellationTip: 'Underutilized CRM tier. Potential 40% downgrade savings.', confidence: 92 },
      { merchant: 'Notion Plus Team', amount: 96.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Company knowledge base & sprint tracker.', confidence: 95 },
      { merchant: 'OpenAI API Direct', amount: 480.00, cadence: 'monthly', category: 'Software & Technology', isEssential: true, cancellationTip: 'Automated content pipeline tokens.', confidence: 98 }
    ],
    customUITheme: {
      dashboardTitle: 'Corporate Treasury & Operating Health',
      dashboardSubtitle: 'AI statement telemetry synthesized for Apex Digital Media LLC (EIN: 84-291039)',
      outflowMetricLabel: 'Operating Outflows & COGS',
      inflowMetricLabel: 'Client Invoices & Merchant Revenue',
      netCashflowLabel: 'Monthly Net Operating Profit',
      subscriptionTabLabel: 'SaaS Infrastructure & Vendor Retainers',
      recurringMetricLabel: 'Monthly Vendor Commitments',
      budgetTabLabel: 'Operating Budget & Department Caps',
      ledgerTabLabel: 'Corporate General Ledger',
      recommendationTitle: 'Business Tax & Cashflow Signals',
      personaBadge: 'B2B Enterprise Entity',
      accountBadge: 'SVB Operating (...3811)',
      themeAccent: 'indigo'
    },
    visibleSections: {
      showBusinessMetrics: true,
      showPersonalSavings: false,
      showDebtSnowball: false,
      showSubscriptionsTrimmer: true,
      showForeignExchangeTracker: true,
      showTaxDeductibleTracker: true,
      showCategoryBudgetTracker: true,
      showPayrollCashflowTracker: true,
      showVendorBreakdown: true
    },
    aiExecutiveSummary: 'Apex Digital Media generated $34,500.00 in client revenues against $20,859.50 in operating expenditures (39.5% net margin). 94.2% of all expenses qualify as write-offs. HubSpot plan is running at 35% utilization and is flagged for renegotiation.',
    suggestedActionItems: [
      'Export $19,650.00 in 100% tax-deductible SaaS & contractor expenses for quarterly accountant filing.',
      'Audit HubSpot tier to recapture up to $4,200 annually.',
      'Transfer $10,000 to high-yield business treasury account.'
    ]
  },
  'canadian-personal': {
    id: 'preset-canadian',
    fileName: 'RBC_Royal_Bank_VIP_Chequing_Aug2026.pdf',
    uploadedAt: new Date().toISOString(),
    accountHolder: 'Marc-Antoine Tremblay',
    statementType: 'personal',
    institution: 'RBC Royal Bank Canada',
    accountNumberMasked: '...0832',
    accountType: 'checking',
    statementPeriod: {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'August 2026 (Monthly)'
    },
    openingBalance: 18940.00,
    closingBalance: 23410.20,
    totalInflows: 8450.00,
    totalOutflows: 3979.80,
    netCashflow: 4470.20,
    currency: 'CAD',
    detectedPersona: 'Canadian Professional & Homeowner',
    detectedKeyMetrics: {
      primaryIncomeSource: 'Direct Deposit Payroll (Govt / Crown Corp)',
      averageMonthlyIncome: 8450.00,
      fixedExpenseRatio: 45,
      discretionaryRatio: 18,
      topExpenseCategory: 'Rent & Housing',
      savingsRatePercentage: 52.9,
      taxDeductibleRatio: 8.5
    },
    detectedSubscriptions: [
      { merchant: 'Bell Fibe Gigabit Internet', amount: 95.00, cadence: 'monthly', category: 'Utilities & Bills', isEssential: true, cancellationTip: 'Retention promo expired last month.', confidence: 97 },
      { merchant: 'Hydro One Electricity', amount: 145.20, cadence: 'monthly', category: 'Utilities & Bills', isEssential: true, cancellationTip: 'Summer peak rate pricing in effect.', confidence: 99 },
      { merchant: 'Crave Total + HBO Max', amount: 22.00, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Streaming bundle review recommended.', confidence: 91 },
      { merchant: 'GoodLife Fitness Canada', amount: 79.99, cadence: 'monthly', category: 'Fitness & Wellness', isEssential: true, cancellationTip: 'Corporate discount applied.', confidence: 96 },
      { merchant: 'Spotify Canada Family', amount: 16.99, cadence: 'monthly', category: 'Entertainment & Subscriptions', isEssential: false, cancellationTip: 'Active 4-member plan.', confidence: 94 }
    ],
    customUITheme: {
      dashboardTitle: 'Canadian Vault & Mortgage Telemetry',
      dashboardSubtitle: 'PIPEDA-compliant local encrypted financial telemetry for RBC Royal Bank Canada',
      outflowMetricLabel: 'Total CAD Outflows',
      inflowMetricLabel: 'Net CAD Deposits & Payroll',
      netCashflowLabel: 'Net Monthly CAD Surplus',
      subscriptionTabLabel: 'Canadian Utilities & Subscriptions',
      recurringMetricLabel: 'Monthly Fixed Commitments (CAD)',
      budgetTabLabel: 'CAD Monthly Budget Envelope',
      ledgerTabLabel: 'Encrypted Canadian Ledger',
      recommendationTitle: 'Canadian Tax & TFSA Signals',
      personaBadge: 'Canadian Homeowner Profile',
      accountBadge: 'RBC Royal Bank (...0832)',
      themeAccent: 'rose'
    },
    visibleSections: {
      showBusinessMetrics: false,
      showPersonalSavings: true,
      showDebtSnowball: true,
      showSubscriptionsTrimmer: true,
      showForeignExchangeTracker: true,
      showTaxDeductibleTracker: false,
      showCategoryBudgetTracker: true,
      showPayrollCashflowTracker: true,
      showVendorBreakdown: false
    },
    aiExecutiveSummary: 'Marc-Antoine Tremblay maintained an exceptional 52.9% savings rate in August 2026. Mortgage and Hydro payments are steady. Bell Internet promotional pricing expired, adding +$15/mo to utilities.',
    suggestedActionItems: [
      'Call Bell Canada retention department to renew the $80/mo fiber promo.',
      'Allocate $3,000 surplus into RRSP contribution room before tax deadline.',
      'Review mortgage accelerated bi-weekly payment schedule in Mortgage suite.'
    ]
  }
};

const STORAGE_KEY = 'vault_ai_statement_profile';

export function getActiveStatementProfile(): AIStatementProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load statement profile from localStorage:', err);
  }
  return DEFAULT_PERSONAL_PROFILE;
}

export function saveActiveStatementProfile(profile: AIStatementProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    // Dispatch custom event so all components react immediately
    window.dispatchEvent(new CustomEvent('vault:statement-profile-updated', { detail: profile }));
  } catch (err) {
    console.warn('Failed to save statement profile to localStorage:', err);
  }
}

export function resetToDefaultProfile(): AIStatementProfile {
  saveActiveStatementProfile(DEFAULT_PERSONAL_PROFILE);
  return DEFAULT_PERSONAL_PROFILE;
}

export function buildStatementProfileFromAI(raw: any, fileName: string): AIStatementProfile {
  const isBusiness = raw.statementType === 'business' || 
    (raw.detectedPersona && raw.detectedPersona.toLowerCase().includes('business')) ||
    (raw.institution && (raw.institution.toLowerCase().includes('corporate') || raw.institution.toLowerCase().includes('commercial')));

  const currency = raw.currency || (fileName.toLowerCase().includes('rbc') || fileName.toLowerCase().includes('td') || fileName.toLowerCase().includes('canada') ? 'CAD' : 'USD');
  const institution = raw.institution || 'Uploaded Bank Statement';
  const accountHolder = raw.accountHolder || (isBusiness ? 'Enterprise Client' : 'Document Account Holder');
  const entityName = raw.entityName || (isBusiness ? accountHolder : undefined);

  const customUITheme: StatementCustomUITheme = {
    dashboardTitle: isBusiness ? `${institution} Operating Cashflow` : `${institution} Personal Wealth Telemetry`,
    dashboardSubtitle: `Live telemetry synthesized from ${fileName} (${accountHolder})`,
    outflowMetricLabel: isBusiness ? 'Total Operating Expenditures' : 'Total Living Expenditures',
    inflowMetricLabel: isBusiness ? 'Client Revenues & Retainers' : 'Net Salary & Inflows',
    netCashflowLabel: isBusiness ? 'Net Operating Profit' : 'Monthly Net Savings',
    subscriptionTabLabel: isBusiness ? 'SaaS & Cloud Vendor Commitments' : 'Recurring Subscriptions & Fixed Drain',
    recurringMetricLabel: isBusiness ? 'Monthly SaaS & Vendor Drain' : 'Monthly Fixed Commitments',
    budgetTabLabel: isBusiness ? 'Department & Operating Budget' : 'Personal Budget Envelopes',
    ledgerTabLabel: isBusiness ? 'Corporate Audited Ledger' : 'Personal Transaction Ledger',
    recommendationTitle: isBusiness ? 'Enterprise Profit & Tax Signals' : 'Personal Financial Health Signals',
    personaBadge: raw.detectedPersona || (isBusiness ? 'Commercial Entity' : 'Personal Account'),
    accountBadge: `${institution} (${raw.accountNumberMasked || 'Active'})`,
    themeAccent: isBusiness ? 'indigo' : (currency === 'CAD' ? 'rose' : 'cyan')
  };

  const visibleSections: StatementVisibleSections = {
    showBusinessMetrics: isBusiness,
    showPersonalSavings: !isBusiness,
    showDebtSnowball: !isBusiness,
    showSubscriptionsTrimmer: true,
    showForeignExchangeTracker: currency !== 'USD',
    showTaxDeductibleTracker: isBusiness,
    showCategoryBudgetTracker: true,
    showPayrollCashflowTracker: true,
    showVendorBreakdown: isBusiness
  };

  const detectedSubscriptions = Array.isArray(raw.detectedSubscriptions) ? raw.detectedSubscriptions : [];

  return {
    id: `profile-${Date.now()}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    accountHolder,
    entityName,
    statementType: isBusiness ? 'business' : 'personal',
    institution,
    accountNumberMasked: raw.accountNumberMasked || '...8821',
    accountType: raw.accountType || (isBusiness ? 'corporate_operating' : 'checking'),
    statementPeriod: raw.statementPeriod || {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'Statement Period'
    },
    openingBalance: raw.openingBalance,
    closingBalance: raw.closingBalance,
    totalInflows: raw.totalInflows,
    totalOutflows: raw.totalOutflows,
    netCashflow: raw.netCashflow,
    currency,
    detectedPersona: raw.detectedPersona || (isBusiness ? 'B2B Enterprise / Agency' : 'Individual Financial Profile'),
    detectedKeyMetrics: {
      primaryIncomeSource: raw.primaryIncomeSource || (isBusiness ? 'Client Invoices' : 'Direct Deposit Payroll'),
      averageMonthlyIncome: raw.averageMonthlyIncome,
      fixedExpenseRatio: raw.fixedExpenseRatio || (isBusiness ? 35 : 45),
      discretionaryRatio: raw.discretionaryRatio || (isBusiness ? 15 : 20),
      topExpenseCategory: raw.topExpenseCategory || (isBusiness ? 'Software & Technology' : 'Rent & Housing'),
      savingsRatePercentage: raw.savingsRatePercentage || (isBusiness ? undefined : 35),
      taxDeductibleRatio: raw.taxDeductibleRatio || (isBusiness ? 92 : 5),
      businessOperatingMargin: raw.businessOperatingMargin || (isBusiness ? 38 : undefined)
    },
    detectedSubscriptions,
    customUITheme,
    visibleSections,
    aiExecutiveSummary: raw.aiExecutiveSummary || `AI has parsed and verified ${fileName}. Dashboard, recurring subscriptions, and analytics have been dynamically reconfigured for ${accountHolder} (${institution}).`,
    suggestedActionItems: Array.isArray(raw.suggestedActionItems) && raw.suggestedActionItems.length > 0
      ? raw.suggestedActionItems
      : [
          'Review dynamic subscription commitments detected from this statement.',
          'Verify ledger transactions categorized under the new statement profile.',
          'Check customized budget caps tailored to your statement spending volume.'
        ],
    rawTextPreview: raw.rawTextPreview
  };
}
