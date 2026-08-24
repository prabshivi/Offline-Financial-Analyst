export interface Transaction {
  id: string;
  date: string;
  institution: string;
  account_name: string;
  raw_description: string;
  clean_merchant: string;
  category: string;
  amount: number; // positive = inflow, negative = outflow
  type: 'inflow' | 'outflow';
  notes?: string;
  tags?: string;
  created_at?: string;
}

export interface StagingTransaction extends Partial<Transaction> {
  tempId: string;
  isDuplicate?: boolean;
  date: string;
  institution: string;
  account_name: string;
  raw_description: string;
  clean_merchant: string;
  category: string;
  amount: number;
  type: 'inflow' | 'outflow';
  notes?: string;
  tags?: string;
}

export interface Rule {
  id: string;
  pattern: string;
  category: string;
  clean_merchant: string;
  priority: number;
}

export interface VaultStats {
  totalInflow: number;
  totalOutflow: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  institutionCount: number;
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number; color: string }[];
  monthlyTrend: { month: string; inflow: number; outflow: number; net: number }[];
  topMerchants: { merchant: string; amount: number; count: number; category: string }[];
  institutionBreakdown: { institution: string; totalAmount: number; count: number }[];
}

export type InstitutionType = 'Chase' | 'Amex' | 'Apple Card' | 'Citibank' | 'Capital One' | 'Wells Fargo' | 'Generic CSV';

export interface FilterOptions {
  search: string;
  category: string;
  institution: string;
  type: 'all' | 'inflow' | 'outflow';
  dateRange: 'all' | 'this_month' | 'last_30_days' | 'last_90_days' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface VaultHealth {
  status: string;
  dbPath: string;
  dbSizeBytes: number;
  transactionCount: number;
  ruleCount: number;
  localOnly: boolean;
  timestamp: string;
}

export interface BudgetLimit {
  category: string;
  monthlyLimit: number;
}

export interface AutoFetchLog {
  id: string;
  timestamp: string;
  fileName: string;
  institution: string;
  fileSizeBytes: number;
  transactionsExtracted: number;
  transactionsInserted: number;
  duplicatesSkipped: number;
  status: 'success' | 'failed' | 'processing';
  message: string;
}

export interface AutoFetchStatus {
  enabled: boolean;
  dropzonePath: string;
  pendingFilesCount: number;
  pendingFiles: string[];
  processedFilesCount: number;
  webhookUrl: string;
  webhookToken: string;
  lastScanTime: string;
  scanIntervalMinutes: number;
  totalAutomatedTransactions: number;
  logs: AutoFetchLog[];
}

export type DebtType = 
  | 'mortgage' 
  | 'credit_card' 
  | 'auto_loan' 
  | 'student_loan' 
  | 'personal_loan' 
  | 'heloc' 
  | 'medical' 
  | 'other';

export interface DebtItem {
  id: string;
  name: string;
  type: DebtType;
  institution: string;
  balance: number;
  interestRate: number; // APR % e.g. 6.5
  minPayment: number;
  propertyValue?: number; // Optional property value for mortgage LTV calculation
  originationBalance?: number;
  notes?: string;
  color?: string;
}

export type RepaymentStrategy = 'snowball' | 'avalanche' | 'custom';

export interface MonthlyDebtSnapshot {
  debtId: string;
  debtName: string;
  startBalance: number;
  interest: number;
  principal: number;
  payment: number;
  endBalance: number;
}

export interface PayoffScheduleMonth {
  monthIndex: number;
  date: string;
  year: number;
  month: number;
  totalRemainingBalance: number;
  totalInterestPaidMonth: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  totalPaymentMonth: number;
  debtBalances: Record<string, number>;
  snapshots: MonthlyDebtSnapshot[];
  paidOffThisMonth: string[];
}

export interface DebtPayoffMilestone {
  debtId: string;
  name: string;
  type: DebtType;
  initialBalance: number;
  interestRate: number;
  payoffMonth: number;
  payoffDate: string;
  totalInterestPaid: number;
}

export interface DebtPayoffPlanResult {
  strategy: RepaymentStrategy | 'baseline';
  monthsToPayoff: number;
  debtFreeDate: string;
  totalInterestPaid: number;
  totalAmountPaid: number;
  monthlyRequiredPayment: number;
  extraMonthlyPayment: number;
  interestSavedVsBaseline: number;
  monthsSavedVsBaseline: number;
  schedule: PayoffScheduleMonth[];
  milestones: DebtPayoffMilestone[];
}

export type StatementType = 'personal' | 'business' | 'unknown';

