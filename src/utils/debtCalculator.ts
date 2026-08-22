import { DebtItem, RepaymentStrategy, DebtPayoffPlanResult, PayoffScheduleMonth, MonthlyDebtSnapshot, DebtPayoffMilestone } from '../types';

export const DEFAULT_DEBT_PORTFOLIO: DebtItem[] = [
  {
    id: 'debt-mortgage-1',
    name: 'Primary Home Mortgage (30-Yr Fixed)',
    type: 'mortgage',
    institution: 'RBC Royal Bank / TD Mortgage',
    balance: 385000,
    interestRate: 5.65,
    minPayment: 2225,
    propertyValue: 520000,
    originationBalance: 420000,
    color: '#0284c7', // Sky Blue
    notes: '5-year fixed term renewal in 2028'
  },
  {
    id: 'debt-auto-1',
    name: 'Auto Loan (Honda CR-V)',
    type: 'auto_loan',
    institution: 'Scotiabank Auto Finance',
    balance: 18450,
    interestRate: 6.99,
    minPayment: 460,
    color: '#10b981', // Emerald
    notes: '48-month vehicle financing'
  },
  {
    id: 'debt-cc-1',
    name: 'Visa Infinite / Chase Sapphire Card',
    type: 'credit_card',
    institution: 'TD Canada Trust / Chase',
    balance: 6850,
    interestRate: 19.99,
    minPayment: 210,
    color: '#f43f5e', // Rose
    notes: 'High interest revolving balance'
  },
  {
    id: 'debt-student-1',
    name: 'National Student Loan (Canada/US)',
    type: 'student_loan',
    institution: 'CSL / Nelnet',
    balance: 14200,
    interestRate: 4.80,
    minPayment: 195,
    color: '#8b5cf6', // Violet
    notes: 'Standard repayment tier'
  }
];

export const DEBT_TYPE_CONFIG = {
  mortgage: { label: 'Mortgage', color: '#0284c7', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  credit_card: { label: 'Credit Card', color: '#f43f5e', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  auto_loan: { label: 'Auto Loan', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  student_loan: { label: 'Student Loan', color: '#8b5cf6', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  personal_loan: { label: 'Personal Loan', color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  heloc: { label: 'HELOC / Line of Credit', color: '#06b6d4', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  medical: { label: 'Medical Debt', color: '#ec4899', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  other: { label: 'Other Debt', color: '#94a3b8', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

/**
 * Format date string offset from current date
 */
export function formatPayoffDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Calculate debt payoff plan using Snowball, Avalanche, or Baseline
 */
export function calculateDebtPayoffPlan(
  debts: DebtItem[],
  strategy: RepaymentStrategy | 'baseline',
  extraMonthlyPayment = 0,
  lumpSumWindfall?: { amount: number; atMonth: number }
): DebtPayoffPlanResult {
  const activeDebts = debts
    .filter(d => d.balance > 0)
    .map(d => ({
      ...d,
      currentBalance: d.balance,
      totalInterestPaid: 0,
      isPaidOff: false,
      payoffMonth: 0,
      payoffDate: ''
    }));

  if (activeDebts.length === 0) {
    return {
      strategy,
      monthsToPayoff: 0,
      debtFreeDate: formatPayoffDate(0),
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      monthlyRequiredPayment: 0,
      extraMonthlyPayment,
      interestSavedVsBaseline: 0,
      monthsSavedVsBaseline: 0,
      schedule: [],
      milestones: []
    };
  }

  const initialTotalRequiredPayment = activeDebts.reduce((sum, d) => sum + d.minPayment, 0);
  const schedule: PayoffScheduleMonth[] = [];
  const milestones: DebtPayoffMilestone[] = [];
  
  let currentMonthIndex = 0;
  const MAX_MONTHS = 480; // 40 years cap to prevent infinite loops
  let cumulativeInterestAll = 0;
  let cumulativePrincipalAll = 0;

  // Clone original balances for baseline comparison
  const originalBalancesSum = activeDebts.reduce((s, d) => s + d.balance, 0);

  // Month-by-month simulation
  while (activeDebts.some(d => !d.isPaidOff) && currentMonthIndex < MAX_MONTHS) {
    currentMonthIndex++;
    const currentDate = formatPayoffDate(currentMonthIndex);
    const dateObj = new Date();
    dateObj.setMonth(dateObj.getMonth() + currentMonthIndex);

    let monthInterestTotal = 0;
    let monthPaymentTotal = 0;
    const paidOffThisMonthNames: string[] = [];
    const monthlySnapshots: MonthlyDebtSnapshot[] = [];

    // 1. Calculate and accrue interest on all active debts
    for (const debt of activeDebts) {
      if (debt.isPaidOff) continue;

      const monthlyRate = (debt.interestRate / 100) / 12;
      const monthInterest = debt.currentBalance * monthlyRate;
      debt.currentBalance += monthInterest;
      debt.totalInterestPaid += monthInterest;
      monthInterestTotal += monthInterest;
      cumulativeInterestAll += monthInterest;
    }

    // 2. Pay minimums on all active debts
    let availableAccelerator = (strategy === 'baseline') ? 0 : extraMonthlyPayment;

    // Add lump sum windfall if specified for this month
    if (lumpSumWindfall && lumpSumWindfall.amount > 0 && lumpSumWindfall.atMonth === currentMonthIndex) {
      availableAccelerator += lumpSumWindfall.amount;
    }

    for (const debt of activeDebts) {
      if (debt.isPaidOff) {
        // In Snowball and Avalanche, the minimum payment of a paid off debt rolls into available accelerator!
        if (strategy !== 'baseline') {
          availableAccelerator += debt.minPayment;
        }
        continue;
      }

      const startBal = debt.currentBalance;
      const monthlyRate = (debt.interestRate / 100) / 12;
      const accruedInt = startBal - (startBal / (1 + monthlyRate)); // approximate accrued
      
      const paymentToMake = Math.min(debt.currentBalance, debt.minPayment);
      debt.currentBalance -= paymentToMake;
      monthPaymentTotal += paymentToMake;
      cumulativePrincipalAll += paymentToMake;

      // If debt was smaller than minPayment, leftover rolls to accelerator
      if (debt.minPayment > paymentToMake && strategy !== 'baseline') {
        availableAccelerator += (debt.minPayment - paymentToMake);
      }

      if (debt.currentBalance <= 0.01) {
        debt.currentBalance = 0;
        debt.isPaidOff = true;
        debt.payoffMonth = currentMonthIndex;
        debt.payoffDate = currentDate;
        paidOffThisMonthNames.push(debt.name);
        milestones.push({
          debtId: debt.id,
          name: debt.name,
          type: debt.type,
          initialBalance: debt.balance,
          interestRate: debt.interestRate,
          payoffMonth: currentMonthIndex,
          payoffDate: currentDate,
          totalInterestPaid: Math.round(debt.totalInterestPaid)
        });
      }

      monthlySnapshots.push({
        debtId: debt.id,
        debtName: debt.name,
        startBalance: Math.round(startBal),
        interest: Math.round(accruedInt),
        principal: Math.round(paymentToMake),
        payment: Math.round(paymentToMake),
        endBalance: Math.round(debt.currentBalance)
      });
    }

    // 3. Apply Accelerator (Snowball / Avalanche / Custom) to priority debt
    if (availableAccelerator > 0 && strategy !== 'baseline') {
      // Sort remaining active debts by strategy
      const remainingDebts = activeDebts.filter(d => !d.isPaidOff);

      if (strategy === 'snowball') {
        // Lowest balance first
        remainingDebts.sort((a, b) => a.currentBalance - b.currentBalance);
      } else if (strategy === 'avalanche') {
        // Highest interest rate first
        remainingDebts.sort((a, b) => b.interestRate - a.interestRate);
      }

      for (const targetDebt of remainingDebts) {
        if (availableAccelerator <= 0) break;

        const extraToApply = Math.min(targetDebt.currentBalance, availableAccelerator);
        targetDebt.currentBalance -= extraToApply;
        monthPaymentTotal += extraToApply;
        cumulativePrincipalAll += extraToApply;
        availableAccelerator -= extraToApply;

        if (targetDebt.currentBalance <= 0.01) {
          targetDebt.currentBalance = 0;
          targetDebt.isPaidOff = true;
          targetDebt.payoffMonth = currentMonthIndex;
          targetDebt.payoffDate = currentDate;
          if (!paidOffThisMonthNames.includes(targetDebt.name)) {
            paidOffThisMonthNames.push(targetDebt.name);
            milestones.push({
              debtId: targetDebt.id,
              name: targetDebt.name,
              type: targetDebt.type,
              initialBalance: targetDebt.balance,
              interestRate: targetDebt.interestRate,
              payoffMonth: currentMonthIndex,
              payoffDate: currentDate,
              totalInterestPaid: Math.round(targetDebt.totalInterestPaid)
            });
          }
        }
      }
    }

    // Capture Month State
    const totalRemaining = activeDebts.reduce((s, d) => s + d.currentBalance, 0);
    const balancesMap: Record<string, number> = {};
    activeDebts.forEach(d => {
      balancesMap[d.id] = Math.round(d.currentBalance);
    });

    schedule.push({
      monthIndex: currentMonthIndex,
      date: currentDate,
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,
      totalRemainingBalance: Math.round(totalRemaining),
      totalInterestPaidMonth: Math.round(monthInterestTotal),
      cumulativeInterest: Math.round(cumulativeInterestAll),
      cumulativePrincipal: Math.round(cumulativePrincipalAll),
      totalPaymentMonth: Math.round(monthPaymentTotal),
      debtBalances: balancesMap,
      snapshots: monthlySnapshots,
      paidOffThisMonth: paidOffThisMonthNames
    });
  }

  // Ensure all milestones are captured if any debt wasn't fully finished before cap
  activeDebts.forEach(d => {
    if (!milestones.some(m => m.debtId === d.id)) {
      milestones.push({
        debtId: d.id,
        name: d.name,
        type: d.type,
        initialBalance: d.balance,
        interestRate: d.interestRate,
        payoffMonth: d.payoffMonth || currentMonthIndex,
        payoffDate: d.payoffDate || formatPayoffDate(currentMonthIndex),
        totalInterestPaid: Math.round(d.totalInterestPaid)
      });
    }
  });

  const totalInterestPaid = Math.round(cumulativeInterestAll);
  const totalAmountPaid = Math.round(originalBalancesSum + totalInterestPaid);

  return {
    strategy,
    monthsToPayoff: currentMonthIndex,
    debtFreeDate: formatPayoffDate(currentMonthIndex),
    totalInterestPaid,
    totalAmountPaid,
    monthlyRequiredPayment: initialTotalRequiredPayment,
    extraMonthlyPayment,
    interestSavedVsBaseline: 0, // Populated in comparative analysis
    monthsSavedVsBaseline: 0,   // Populated in comparative analysis
    schedule,
    milestones
  };
}

/**
 * Compare Snowball, Avalanche, and Baseline plans side-by-side
 */
export function getComparativeDebtPayoffPlans(
  debts: DebtItem[],
  extraMonthlyPayment = 0,
  lumpSumWindfall?: { amount: number; atMonth: number }
) {
  const baseline = calculateDebtPayoffPlan(debts, 'baseline', 0);
  const snowball = calculateDebtPayoffPlan(debts, 'snowball', extraMonthlyPayment, lumpSumWindfall);
  const avalanche = calculateDebtPayoffPlan(debts, 'avalanche', extraMonthlyPayment, lumpSumWindfall);

  // Compute savings
  snowball.interestSavedVsBaseline = Math.max(0, baseline.totalInterestPaid - snowball.totalInterestPaid);
  snowball.monthsSavedVsBaseline = Math.max(0, baseline.monthsToPayoff - snowball.monthsToPayoff);

  avalanche.interestSavedVsBaseline = Math.max(0, baseline.totalInterestPaid - avalanche.totalInterestPaid);
  avalanche.monthsSavedVsBaseline = Math.max(0, baseline.monthsToPayoff - avalanche.monthsToPayoff);

  return {
    baseline,
    snowball,
    avalanche
  };
}

/**
 * Mortgage Accelerators: Bi-Weekly vs Monthly & Extra Principal Reduction
 */
export function calculateMortgageDeepDive(mortgage: DebtItem, extraMonthlyPrincipal = 0) {
  const balance = mortgage.balance;
  const rate = mortgage.interestRate / 100;
  const monthlyRate = rate / 12;
  const minPayment = mortgage.minPayment;
  const propertyValue = mortgage.propertyValue || (balance * 1.25);
  const currentLTV = (balance / propertyValue) * 100;

  // Standard Monthly schedule (with optional extra principal)
  let remMonthly = balance;
  let monthsCount = 0;
  let totalInterestMonthly = 0;

  while (remMonthly > 0 && monthsCount < 480) {
    monthsCount++;
    const interest = remMonthly * monthlyRate;
    totalInterestMonthly += interest;
    const payment = Math.min(remMonthly + interest, minPayment + extraMonthlyPrincipal);
    const principalPaid = Math.max(0, payment - interest);
    remMonthly -= principalPaid;
  }

  // Accelerated Bi-Weekly (26 half-payments = 13 full payments a year)
  // Each bi-weekly payment is minPayment / 2 (+ half of extra principal if any)
  const biweeklyPayment = (minPayment / 2) + (extraMonthlyPrincipal / 2);
  const biweeklyRate = rate / 26;
  let remBiweekly = balance;
  let biweeklyPeriods = 0;
  let totalInterestBiweekly = 0;

  while (remBiweekly > 0 && biweeklyPeriods < 1040) {
    biweeklyPeriods++;
    const interest = remBiweekly * biweeklyRate;
    totalInterestBiweekly += interest;
    const payment = Math.min(remBiweekly + interest, biweeklyPayment);
    const principalPaid = Math.max(0, payment - interest);
    remBiweekly -= principalPaid;
  }

  const biweeklyYears = biweeklyPeriods / 26;
  const monthlyYears = monthsCount / 12;

  // Months to reach 80% LTV (PMI / CMHC threshold)
  const target80Balance = propertyValue * 0.80;
  let monthsTo80LTV = 0;
  let tempBal = balance;
  if (tempBal > target80Balance) {
    while (tempBal > target80Balance && monthsTo80LTV < 480) {
      monthsTo80LTV++;
      const interest = tempBal * monthlyRate;
      const principalPaid = Math.max(0, (minPayment + extraMonthlyPrincipal) - interest);
      tempBal -= principalPaid;
    }
  }

  return {
    currentLTV: Math.round(currentLTV * 10) / 10,
    target80Balance: Math.round(target80Balance),
    monthsTo80LTV,
    monthlyTotalInterest: Math.round(totalInterestMonthly),
    monthlyYears: Math.round(monthlyYears * 10) / 10,
    biweeklyTotalInterest: Math.round(totalInterestBiweekly),
    biweeklyYears: Math.round(biweeklyYears * 10) / 10,
    biweeklyInterestSaved: Math.round(Math.max(0, totalInterestMonthly - totalInterestBiweekly)),
    biweeklyYearsSaved: Math.round(Math.max(0, monthlyYears - biweeklyYears) * 10) / 10
  };
}
