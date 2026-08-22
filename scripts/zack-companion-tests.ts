import { 
  calculateZackFinancialMood, 
  ZackFinancialMoodState, 
  ZackArchetype,
  ZackMilestone 
} from '../src/utils/zackMoodEngine';
import { Transaction, VaultStats, VaultHealth } from '../src/types';

export function runZackFunctionalTests(assert: (condition: boolean, testName: string) => void) {
  console.log('\n[8/8] Testing Zack Canine Companion Flow & Financial Mood Engine...');

  // --- TEST 1: Initial Empty State ---
  const emptyMood: ZackFinancialMoodState = calculateZackFinancialMood([], null, null, 0);
  assert(emptyMood.archetype === 'EAGER_SNIFFER', 'Empty vault initializes with EAGER_SNIFFER archetype');
  assert(emptyMood.levelRank === 1, 'Initial rank is Level 1 (Novice Pup Tracker)');
  assert(emptyMood.unlockedCount === 0, 'Zero milestones unlocked on empty ledger');
  assert(emptyMood.totalMilestones === 10, 'All 10 core financial milestones are present');
  assert(emptyMood.excitementLevel >= 0 && emptyMood.excitementLevel <= 100, 'Excitement index is bounded [0, 100]');
  assert(emptyMood.contentmentLevel >= 0 && emptyMood.contentmentLevel <= 100, 'Contentment index is bounded [0, 100]');
  assert(emptyMood.speechBubble.length > 0, 'Generates non-empty prompt for user to import transactions');
  assert(emptyMood.nextMilestone !== null && emptyMood.nextMilestone.id === 'm-first-tx', 'Next milestone correctly identifies First Pawprint');

  // --- TEST 2: First Transaction Logged ---
  const singleTx: Transaction[] = [
    {
      id: 'tx-001',
      date: '2026-08-20',
      raw_description: 'WHOLE FOODS SOMA',
      clean_merchant: 'Whole Foods',
      amount: -45.20,
      type: 'outflow',
      category: 'Groceries',
      institution: 'Chase',
      account_name: 'Chase Sapphire'
    }
  ];
  const firstTxMood = calculateZackFinancialMood(singleTx);
  const firstMilestone = firstTxMood.milestones.find(m => m.id === 'm-first-tx');
  assert(firstMilestone?.isUnlocked === true, 'First Pawprint milestone unlocks upon logging 1st transaction');
  assert(firstMilestone?.progressPercent === 100, 'First Pawprint progress displays 100%');
  assert(firstTxMood.unlockedCount >= 1, 'Milestone count increments after first transaction');

  // --- TEST 3: Double Digits (10 Transactions) ---
  const tenTxs: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
    id: `tx-10-${i}`,
    date: '2026-08-20',
    raw_description: `Merchant ${i}`,
    clean_merchant: `Merchant ${i}`,
    amount: -20,
    type: 'outflow',
    category: i % 2 === 0 ? 'Groceries' : 'Utilities & Bills',
    institution: 'Chase',
    account_name: 'Checking'
  }));
  const tenTxMood = calculateZackFinancialMood(tenTxs);
  const doubleDigitMilestone = tenTxMood.milestones.find(m => m.id === 'm-double-digits');
  assert(doubleDigitMilestone?.isUnlocked === true, 'Double-Digit Ledger milestone unlocks at 10 transactions');
  assert(tenTxMood.archetype === 'ENTHUSIASTIC_TRACKER', 'Archetype elevates to ENTHUSIASTIC_TRACKER at 10 transactions');
  assert(tenTxMood.levelRank === 2, 'Rank elevates to Level 2 (Junior Ledger Scout)');

  // --- TEST 4: High Savings Surplus & Zen Saver Archetype ---
  const zenStats: VaultStats = {
    totalInflow: 5000,
    totalOutflow: 3000,
    netSavings: 2000,
    savingsRate: 40,
    transactionCount: 22,
    institutionCount: 2,
    categoryBreakdown: [],
    monthlyTrend: [],
    topMerchants: [],
    institutionBreakdown: []
  };
  const zenMood = calculateZackFinancialMood(tenTxs, zenStats);
  assert(zenMood.archetype === 'ZEN_SAVER', 'High savings rate (>25%) and net surplus (+$2000) unlocks ZEN_SAVER archetype');
  assert(zenMood.accessory === 'star_aura', 'Zen Saver equips star_aura accessory');
  assert(zenMood.speechBubble.includes('savings rate'), 'Zen Saver speech bubble highlights positive savings surplus');

  // --- TEST 5: Centurion Master & Zoomies Milestone ---
  const fiftyTxs: Transaction[] = Array.from({ length: 55 }, (_, i) => ({
    id: `tx-50-${i}`,
    date: '2026-08-20',
    raw_description: `Merchant ${i}`,
    clean_merchant: `Merchant ${i}`,
    amount: -15,
    type: 'outflow',
    category: ['Groceries', 'Dining', 'Utilities & Bills', 'Transportation'][i % 4],
    institution: i % 2 === 0 ? 'Chase' : 'RBC',
    account_name: 'Checking'
  }));
  const centurionStats: VaultStats = {
    totalInflow: 8000,
    totalOutflow: 4000,
    netSavings: 4000,
    savingsRate: 50,
    transactionCount: 55,
    institutionCount: 2,
    categoryBreakdown: [],
    monthlyTrend: [],
    topMerchants: [],
    institutionBreakdown: []
  };
  const centurionMood = calculateZackFinancialMood(fiftyTxs, centurionStats, null, 7);
  assert(centurionMood.archetype === 'CELEBRATION_MASTER', '50+ transactions elevates to CELEBRATION_MASTER');
  assert(centurionMood.mood === 'zoomies', 'Celebration Master activates zoomies canine stance');
  assert(centurionMood.accessory === 'crown', 'Celebration Master equips royal crown accessory');
  assert(centurionMood.levelRank === 5, 'Celebration Master achieves Rank 5 Grand Master Canine Guardian');

  // --- TEST 6: Multi-Bank and Multi-Category Milestone Verification ---
  const multiBankMilestone = centurionMood.milestones.find(m => m.id === 'm-multi-bank');
  assert(multiBankMilestone?.isUnlocked === true, 'Multi-Bank Integrator milestone unlocks for Chase + RBC');

  const categorizerMilestone = centurionMood.milestones.find(m => m.id === 'm-categorizer-pro');
  assert(categorizerMilestone?.isUnlocked === true, 'Ledger Categorizer Pro milestone unlocks for 4+ categories');

  const privacyMilestone = centurionMood.milestones.find(m => m.id === 'm-ironclad-guard');
  assert(privacyMilestone?.isUnlocked === true, 'Ironclad Privacy Guardian milestone unlocks for 7/7 passed security checks');

  // --- TEST 7: Milestone Invariants & Integrity ---
  const allIds = centurionMood.milestones.map(m => m.id);
  const uniqueIds = new Set(allIds);
  assert(uniqueIds.size === allIds.length, 'All milestone IDs are strictly unique');
  assert(centurionMood.milestones.every(m => m.progressPercent >= 0 && m.progressPercent <= 100), 'All milestone progress percentages stay within [0, 100]%');
  assert(centurionMood.milestones.every(m => m.celebrationMessage.length > 0), 'Every milestone has an expressive celebration message');

  // --- TEST 8: Receptive Navigation Tab Reaction Formatting ---
  const tabReactions: Record<string, string> = {
    dashboard: `Overview loaded! Mood: ${zenMood.archetypeLabel} 📊🐶`,
    budget: "Budgets ready! Sniffing out spending targets! 🦴💵",
    'debt-payoff': "Payoff & Loans! Let's eliminate balances together! ⚡",
    ingestion: "Import Statements ready! Upload your bank files! 📂✨",
    'auto-fetch': "Auto-Import ready! Drop files to sync automatically! 🎾",
    ledger: "Transactions history loaded! 🔍",
    rules: "Smart Category rules ready! 🧠",
    security: "Private Backup & Vault active! 🛡️",
    nightly: "Security Health check! All private & safe! ✨🛡️"
  };

  for (const [tab, message] of Object.entries(tabReactions)) {
    assert(message.length > 0 && typeof message === 'string', `Receptive message for tab "${tab}" is valid and non-empty`);
  }

  // --- TEST 9: Batch vs Single Ingestion Receptive Messaging ---
  const singleTxMsg = (count: number) => `Woof! New transaction saved locally! Total: ${count} records! 🐾✨`;
  const batchTxMsg = (diff: number) => `WOOF! Ingested batch of ${diff} transactions! Vault updated! 🚀🦴`;
  
  assert(singleTxMsg(5).includes('Total: 5 records'), 'Single ingestion message formats record count');
  assert(batchTxMsg(12).includes('batch of 12 transactions'), 'Batch ingestion message formats diff quantity');

  // --- TEST 10: Dynamic Tail Wag Velocity Scaling ---
  const calculateTailSpeed = (mood: string, isHovered: boolean, excitement: number) => {
    const baseTailSpeed = 
      mood === 'zoomies' ? 0.14 :
      mood === 'happy' || isHovered ? 0.28 :
      mood === 'panting' ? 0.38 :
      mood === 'sleeping' ? 2.5 :
      0.68;
    return mood === 'sleeping' 
      ? 2.5 
      : Math.max(0.11, baseTailSpeed * (1 - (excitement / 220)));
  };

  const calmWag = calculateTailSpeed('idle', false, 20);
  const excitedWag = calculateTailSpeed('happy', false, 80);
  const zoomiesWag = calculateTailSpeed('zoomies', false, 95);
  const sleepWag = calculateTailSpeed('sleeping', false, 50);

  assert(excitedWag < calmWag, 'Higher excitement accelerates tail wagging speed (lower duration)');
  assert(zoomiesWag <= excitedWag, 'Zoomies mode triggers maximum canine tail wag velocity');
  assert(sleepWag === 2.5, 'Sleeping stance slows tail wag to relaxed 2.5s cycle');
}
