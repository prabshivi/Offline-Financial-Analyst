import React, { useState } from 'react';
import { 
  Wand2, 
  Plus, 
  Trash2, 
  Edit2, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Terminal,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Rule } from '../types';
import { STANDARD_CATEGORIES, categorizeTransaction, cleanMerchantName } from '../utils/categorizer';

interface RulesEngineViewProps {
  rules: Rule[];
  isDarkMode?: boolean;
  onSaveRule: (rule: Partial<Rule>) => Promise<Rule>;
  onDeleteRule: (id: string) => Promise<boolean>;
  onAiCategorizeTest?: (descriptions: string[]) => Promise<any>;
}

const STARTER_RULE_PACKS = [
  { name: 'Streaming & Media', pattern: 'NETFLIX|SPOTIFY|HULU|DISNEY|HBO|MAX|YOUTUBE|AUDIBLE', category: 'Entertainment & Subscriptions', clean: 'Media & Streaming' },
  { name: 'Rideshares & Taxis', pattern: 'UBER|LYFT|CAB|TAXI|WAYMO|LIME|BIRD', category: 'Transportation', clean: 'Rideshare & Taxi' },
  { name: 'Coffee Shops', pattern: 'STARBUCKS|DUNKIN|PEETS|BLUE BOTTLE|PHILZ|DUTCH BROS', category: 'Coffee & Drinks', clean: 'Coffee Shop' },
  { name: 'Food Delivery', pattern: 'DOORDASH|UBEREATS|GRUBHUB|POSTMATES|SEAMLESS', category: 'Dining Out', clean: 'Food Delivery' },
  { name: 'Gas Stations', pattern: 'SHELL|CHEVRON|EXXON|BP|MOBIL|SUNOCO|VALERO|SPEEDWAY', category: 'Gas & Fuel', clean: 'Gas Station' },
];

export const RulesEngineView: React.FC<RulesEngineViewProps> = ({
  rules,
  isDarkMode = true,
  onSaveRule,
  onDeleteRule
}) => {
  const [sandboxText, setSandboxText] = useState('WHOLEFDS SOMA #10243 SAN FRANCISCO');
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null);
  const [patternInput, setPatternInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Groceries');
  const [cleanMerchantInput, setCleanMerchantInput] = useState('');
  const [priorityInput, setPriorityInput] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  // Live test against sandbox text
  const matchedCategory = categorizeTransaction(sandboxText, rules);
  const matchedMerchant = cleanMerchantName(sandboxText, rules);

  const handleOpenAdd = () => {
    setEditingRule({});
    setPatternInput('');
    setCategoryInput('Groceries');
    setCleanMerchantInput('');
    setPriorityInput(5);
  };

  const handleOpenEdit = (rule: Rule) => {
    setEditingRule(rule);
    setPatternInput(rule.pattern);
    setCategoryInput(rule.category);
    setCleanMerchantInput(rule.clean_merchant || '');
    setPriorityInput(rule.priority || 5);
  };

  const handleAddStarterPack = async (pack: typeof STARTER_RULE_PACKS[0]) => {
    setIsSaving(true);
    try {
      await onSaveRule({
        pattern: pack.pattern,
        category: pack.category,
        clean_merchant: pack.clean,
        priority: 5
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternInput.trim()) return;

    setIsSaving(true);
    try {
      await onSaveRule({
        id: editingRule?.id,
        pattern: patternInput.trim(),
        category: categoryInput,
        clean_merchant: cleanMerchantInput.trim(),
        priority: priorityInput
      });
      setEditingRule(null);
    } catch (err) {
      console.error('Save rule error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Zack's Learned Tricks (Smart Rules)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Teach Zack how to sniff out category labels and tidy up messy merchant text automatically.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Teach a Trick (New Rule)
        </button>
      </div>

      {/* Interactive Rules Sandbox Simulator */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Interactive Rule Sandbox Simulator
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono bg-slate-800 px-2.5 py-0.5 rounded-full">
            Live Testing
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-6 space-y-1">
            <label className="block text-xs font-semibold text-slate-400">
              Type or paste any bank memo to test:
            </label>
            <input
              type="text"
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              placeholder="e.g. STARBUCKS #08442 SF"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Matched Category</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">{matchedCategory}</span>
          </div>

          <div className="lg:col-span-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cleaned Merchant</span>
            <span className="text-sm font-bold text-sky-400 mt-1 block truncate">{matchedMerchant}</span>
          </div>
        </div>
      </div>

      {/* 1-Click Starter Rule Packs */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Add: Prebuilt Rule Packs
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">1-click install</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STARTER_RULE_PACKS.map((pack) => (
            <div
              key={pack.name}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{pack.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{pack.category}</p>
              </div>
              <button
                onClick={() => handleAddStarterPack(pack)}
                disabled={isSaving}
                className="w-full text-center py-1 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 text-white text-[11px] font-semibold transition-colors"
              >
                + Add Rule
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Tricks Zack Memorized</h3>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[11px] font-mono">
              {rules.length} Tricks
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Applied automatically when chewing on bank statements</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-750">
              <tr>
                <th className="py-3 px-4 w-20">Priority</th>
                <th className="py-3 px-4">Keyword Matcher</th>
                <th className="py-3 px-4 w-48">Target Category</th>
                <th className="py-3 px-4 w-48">Clean Merchant Name</th>
                <th className="py-3 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold font-mono text-[11px]">
                      {rule.priority || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                    <code className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400 text-[11px]">
                      {rule.pattern}
                    </code>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {rule.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {rule.clean_merchant || <span className="text-slate-400 dark:text-slate-600 italic">None</span>}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Rule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingRule.id ? 'Edit Categorizer Rule' : 'Create New Categorizer Rule'}
              </h3>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Matching Words or Regex *
                </label>
                <input
                  type="text"
                  required
                  value={patternInput}
                  onChange={(e) => setPatternInput(e.target.value)}
                  placeholder="e.g. NETFLIX|SPOTIFY|APPLE\.COM"
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Matches if description includes any of these terms (separated by |).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Category
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {STANDARD_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name} className="dark:bg-slate-900 dark:text-slate-100">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Score
                  </label>
                  <input
                    type="number"
                    value={priorityInput}
                    onChange={(e) => setPriorityInput(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clean Merchant Name (Optional)
                </label>
                <input
                  type="text"
                  value={cleanMerchantInput}
                  onChange={(e) => setCleanMerchantInput(e.target.value)}
                  placeholder="e.g. Streaming Services"
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
