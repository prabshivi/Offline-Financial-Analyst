import { Transaction, VaultStats, VaultHealth } from '../types';
import { Zack3DMood } from '../components/ZackRetriever3D';

export type ZackArchetype = 
  | 'EAGER_SNIFFER'
  | 'ENTHUSIASTIC_TRACKER'
  | 'PROUD_GUARDIAN'
  | 'CELEBRATION_MASTER'
  | 'ZEN_SAVER'
  | 'BUDGET_CHAMPION'
  | 'IRONCLAD_PROTECTOR';

export interface ZackMilestone {
  id: string;
  title: string;
  category: 'transactions' | 'savings' | 'security' | 'accounts';
  icon: string;
  description: string;
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  unlockedAt?: string;
  celebrationMessage: string;
}

export interface ZackFinancialMoodState {
  archetype: ZackArchetype;
  archetypeLabel: string;
  archetypeBadge: string;
  mood: Zack3DMood;
  excitementLevel: number; // 0 to 100
  contentmentLevel: number; // 0 to 100
  speechBubble: string;
  accessory: 'none' | 'star_aura' | 'gold_medal' | 'party_hat' | 'crown' | 'shield_badge';
  milestones: ZackMilestone[];
  unlockedCount: number;
  totalMilestones: number;
  nextMilestone: ZackMilestone | null;
  levelTitle: string;
  levelRank: number; // 1 to 5
}

/**
 * Evaluates all financial metrics and computes Zack's state-based mood,
 * excitement rating, active milestones, and visual companion accessories.
 */
export function calculateZackFinancialMood(
  transactions: Transaction[] = [],
  stats: VaultStats | null = null,
  health: VaultHealth | null = null,
  nightlyPassedCount = 7
): ZackFinancialMoodState {
  const txCount = transactions.length;
  const netSavings = stats ? stats.netSavings : transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalInflow = stats ? stats.totalInflow : transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalOutflow = stats ? stats.totalOutflow : Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Number(t.amount), 0));
  const savingsRate = totalInflow > 0 ? Math.max(0, Math.round((netSavings / totalInflow) * 100)) : 0;
  
  // Unique institution count
  const institutions = new Set(transactions.map(t => t.institution).filter(Boolean));
  const institutionCount = institutions.size;

  // Categories count
  const categories = new Set(transactions.map(t => t.category).filter(Boolean));
  const categoryCount = categories.size;

  // Compute 10 Core Financial Milestones
  const milestones: ZackMilestone[] = [
    {
      id: 'm-first-tx',
      title: 'First Pawprint',
      category: 'transactions',
      icon: '🐾',
      description: 'Log your very first financial transaction into the local vault.',
      isUnlocked: txCount >= 1,
      currentValue: Math.min(txCount, 1),
      targetValue: 1,
      progressPercent: txCount >= 1 ? 100 : 0,
      celebrationMessage: 'First pawprint in the vault! Tracking begins! 🐾'
    },
    {
      id: 'm-double-digits',
      title: 'Double-Digit Ledger',
      category: 'transactions',
      icon: '🦴',
      description: 'Record 10 or more transactions in your zero-knowledge ledger.',
      isUnlocked: txCount >= 10,
      currentValue: Math.min(txCount, 10),
      targetValue: 10,
      progressPercent: Math.min(100, Math.round((txCount / 10) * 100)),
      celebrationMessage: '10+ transactions secured! Double digits unlocked! 🦴'
    },
    {
      id: 'm-quarter-century',
      title: 'Vault Pioneer',
      category: 'transactions',
      icon: '🌟',
      description: 'Accumulate 25 financial records in your offline SQLite database.',
      isUnlocked: txCount >= 25,
      currentValue: Math.min(txCount, 25),
      targetValue: 25,
      progressPercent: Math.min(100, Math.round((txCount / 25) * 100)),
      celebrationMessage: '25 records! Our financial map is looking stellar! 🌟'
    },
    {
      id: 'm-centurion',
      title: 'Centurion Vault Master',
      category: 'transactions',
      icon: '👑',
      description: 'Reach 50+ total transactions securely archived.',
      isUnlocked: txCount >= 50,
      currentValue: Math.min(txCount, 50),
      targetValue: 50,
      progressPercent: Math.min(100, Math.round((txCount / 50) * 100)),
      celebrationMessage: '50+ transactions! Master level financial discipline! 👑🐾'
    },
    {
      id: 'm-positive-cashflow',
      title: 'Positive Net Cash Flow',
      category: 'savings',
      icon: '📈',
      description: 'Maintain positive net monthly savings (Income > Expenses).',
      isUnlocked: netSavings > 0,
      currentValue: netSavings > 0 ? 1 : 0,
      targetValue: 1,
      progressPercent: netSavings > 0 ? 100 : 0,
      celebrationMessage: `Positive net cash flow! Saving $${Math.max(0, Math.round(netSavings)).toLocaleString()}! 💰`
    },
    {
      id: 'm-saver-club',
      title: '20%+ Super Saver',
      category: 'savings',
      icon: '💎',
      description: 'Achieve a personal savings rate of 20% or higher.',
      isUnlocked: savingsRate >= 20,
      currentValue: Math.min(savingsRate, 20),
      targetValue: 20,
      progressPercent: Math.min(100, Math.round((savingsRate / 20) * 100)),
      celebrationMessage: `Incredible! ${savingsRate}% savings rate achieved! 💎🐕`
    },
    {
      id: 'm-grand-saver',
      title: '$1,000+ Net Accumulator',
      category: 'savings',
      icon: '🏦',
      description: 'Reach over $1,000 in net surplus savings logged in the vault.',
      isUnlocked: netSavings >= 1000,
      currentValue: Math.max(0, Math.min(Math.round(netSavings), 1000)),
      targetValue: 1000,
      progressPercent: Math.min(100, Math.max(0, Math.round((netSavings / 1000) * 100))),
      celebrationMessage: 'Over $1,000 in net surplus accumulated! High five! ✋🐾'
    },
    {
      id: 'm-multi-bank',
      title: 'Multi-Bank Integrator',
      category: 'accounts',
      icon: '🏛️',
      description: 'Connect or import statements from 2 or more financial institutions.',
      isUnlocked: institutionCount >= 2,
      currentValue: Math.min(institutionCount, 2),
      targetValue: 2,
      progressPercent: Math.min(100, Math.round((institutionCount / 2) * 100)),
      celebrationMessage: 'Multi-institution support active! Complete wealth view! 🏛️'
    },
    {
      id: 'm-categorizer-pro',
      title: 'Ledger Categorizer Pro',
      category: 'accounts',
      icon: '📊',
      description: 'Organize spending across 4 or more distinct budget categories.',
      isUnlocked: categoryCount >= 4,
      currentValue: Math.min(categoryCount, 4),
      targetValue: 4,
      progressPercent: Math.min(100, Math.round((categoryCount / 4) * 100)),
      celebrationMessage: 'All spending categories neatly classified and labeled! 📊'
    },
    {
      id: 'm-ironclad-guard',
      title: 'Ironclad Privacy Guardian',
      category: 'security',
      icon: '🛡️',
      description: 'Pass all 7 Nightly Peace of Mind automated security & encryption tests.',
      isUnlocked: nightlyPassedCount >= 7,
      currentValue: Math.min(nightlyPassedCount, 7),
      targetValue: 7,
      progressPercent: Math.min(100, Math.round((nightlyPassedCount / 7) * 100)),
      celebrationMessage: '7/7 Security checks passed! Zero cloud leaks verified! 🛡️'
    }
  ];

  const unlockedCount = milestones.filter(m => m.isUnlocked).length;
  const totalMilestones = milestones.length;
  const nextMilestone = milestones.find(m => !m.isUnlocked) || null;

  // Base Excitement & Contentment Formulas
  // Excitement scales with transaction count, recent additions, and savings surplus
  let excitement = 20;
  if (txCount > 0) excitement += Math.min(35, txCount * 1.5);
  if (netSavings > 0) excitement += Math.min(25, (netSavings / 2000) * 25);
  if (savingsRate >= 20) excitement += 15;
  if (unlockedCount >= 6) excitement += 10;
  excitement = Math.min(100, Math.round(excitement));

  // Contentment scales with positive cash flow, security checks, and steady tracking
  let contentment = 30;
  if (txCount >= 5) contentment += 25;
  if (netSavings >= 0) contentment += 25;
  if (nightlyPassedCount >= 7) contentment += 20;
  contentment = Math.min(100, Math.round(contentment));

  // Determine Archetype & Visual Mood
  let archetype: ZackArchetype = 'EAGER_SNIFFER';
  let archetypeLabel = 'Eager Sniffer';
  let archetypeBadge = '🐾 Eager Pup';
  let mood: Zack3DMood = 'curious';
  let accessory: ZackFinancialMoodState['accessory'] = 'none';
  let speechBubble = "Ready to sniff out your financial transactions! 🐾";
  let levelRank = 1;
  let levelTitle = 'Novice Pup Tracker';

  if (unlockedCount >= 8 || txCount >= 50) {
    archetype = 'CELEBRATION_MASTER';
    archetypeLabel = 'Celebration Master';
    archetypeBadge = '👑 Super Excitable';
    mood = 'zoomies';
    accessory = 'crown';
    speechBubble = `WOOF! ${txCount} transactions logged & ${unlockedCount} milestones crushed! 🚀👑`;
    levelRank = 5;
    levelTitle = 'Grand Master Canine Guardian';
  } else if (savingsRate >= 25 && netSavings >= 800) {
    archetype = 'ZEN_SAVER';
    archetypeLabel = 'Zen Wealth Saver';
    archetypeBadge = '🧘‍♂️ Zen & Content';
    mood = 'happy';
    accessory = 'star_aura';
    speechBubble = `Deep contentment: ${savingsRate}% savings rate with +$${Math.round(netSavings).toLocaleString()} net surplus! ✨🐶`;
    levelRank = 4;
    levelTitle = 'Serene Wealth Optimizer';
  } else if (txCount >= 20) {
    archetype = 'PROUD_GUARDIAN';
    archetypeLabel = 'Proud Vault Guardian';
    archetypeBadge = '🛡️ Proud & Energetic';
    mood = 'panting';
    accessory = 'gold_medal';
    speechBubble = `Guarding ${txCount} transactions across ${institutionCount} accounts! High energy! ⚡🐾`;
    levelRank = 3;
    levelTitle = 'Senior Vault Companion';
  } else if (txCount >= 5) {
    archetype = 'ENTHUSIASTIC_TRACKER';
    archetypeLabel = 'Enthusiastic Tracker';
    archetypeBadge = '🦴 Cheerful Tracker';
    mood = 'happy';
    accessory = 'gold_medal';
    speechBubble = `Great habit! ${txCount} records secured in local SQLite! 🦴`;
    levelRank = 2;
    levelTitle = 'Junior Ledger Scout';
  } else {
    archetype = 'EAGER_SNIFFER';
    archetypeLabel = 'Eager Sniffer';
    archetypeBadge = '🐾 Eager Explorer';
    mood = 'curious';
    accessory = 'none';
    speechBubble = txCount === 0 
      ? "Drop a bank CSV or add a transaction to see my tail wag! 🐕" 
      : `First ${txCount} transaction saved! Let's build that streak! ✨`;
    levelRank = 1;
    levelTitle = 'Novice Pup Tracker';
  }

  return {
    archetype,
    archetypeLabel,
    archetypeBadge,
    mood,
    excitementLevel: excitement,
    contentmentLevel: contentment,
    speechBubble,
    accessory,
    milestones,
    unlockedCount,
    totalMilestones,
    nextMilestone,
    levelTitle,
    levelRank
  };
}
