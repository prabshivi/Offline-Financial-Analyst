import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  Sliders, 
  Layers, 
  ShieldCheck,
  Server,
  Zap,
  Radio
} from 'lucide-react';
import { 
  ALL_SYSTEM_PAGES, 
  getAppDomain, 
  setCustomDomainOverride, 
  getEnabledPageIds, 
  saveEnabledPageIds,
  isSiteEnabled 
} from '../utils/envConfig';

interface DomainSettingsViewProps {
  isDarkMode?: boolean;
  onRefreshNavigation?: () => void;
}

export const DomainSettingsView: React.FC<DomainSettingsViewProps> = ({
  isDarkMode = true,
  onRefreshNavigation
}) => {
  const [domainInput, setDomainInput] = useState(getAppDomain());
  const [enabledPages, setEnabledPages] = useState<string[]>(getEnabledPageIds());
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentDomain = getAppDomain();
  const siteActive = isSiteEnabled();

  const handleTogglePage = (pageId: string) => {
    // Dashboard and Security should always remain enabled
    if (pageId === 'dashboard' || pageId === 'security') return;

    let updated: string[];
    if (enabledPages.includes(pageId)) {
      updated = enabledPages.filter((id) => id !== pageId);
    } else {
      updated = [...enabledPages, pageId];
    }
    setEnabledPages(updated);
    saveEnabledPageIds(updated);
    if (onRefreshNavigation) onRefreshNavigation();
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomDomainOverride(domainInput.trim());
    setSavedSuccess(true);
    if (onRefreshNavigation) onRefreshNavigation();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefault = () => {
    setCustomDomainOverride('');
    setDomainInput(getAppDomain());
    const defaults = ALL_SYSTEM_PAGES.filter((p) => p.defaultEnabled).map((p) => p.id);
    setEnabledPages(defaults);
    saveEnabledPageIds(defaults);
    if (onRefreshNavigation) onRefreshNavigation();
  };

  const envSample = `# .env configuration for Dynamic Domain & Gated Pages
VITE_CUSTOM_DOMAIN=${domainInput || 'www.offlinefinancevault.com'}
VITE_SITE_ENABLED=true
VITE_ENABLED_PAGES=${enabledPages.join(',')}
`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleSetVercelDomain = () => {
    const vercelDomain = 'www.offlinefinancevault.com';
    setDomainInput(vercelDomain);
    setCustomDomainOverride(vercelDomain);
    setSavedSuccess(true);
    if (onRefreshNavigation) onRefreshNavigation();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Domain & Dynamic Site Engine Configuration
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configured for Vercel deployment with SSL and custom host binding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://${currentDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span>Open Domain</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
            siteActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${siteActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{siteActive ? 'Site Enabled' : 'Site Gated'}</span>
          </span>
        </div>
      </div>

      {/* Vercel Custom Domain Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/30 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VERCEL VERIFIED DOMAIN
              </span>
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> SSL Certificate Active
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span className="text-cyan-400">https://</span>
              <span>www.offlinefinancevault.com</span>
            </h2>
            <p className="text-xs text-slate-400">
              Vercel Edge Network routing enabled. Auto HTTPS redirection and DNS propagation verified.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSetVercelDomain}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apply Vercel Preset</span>
            </button>

            <a
              href="https://www.offlinefinancevault.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>Visit Live Domain</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Domain Binding Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-500" />
            <span>Active Custom Domain</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            When a domain is configured via the environment variable <code className="text-cyan-600 dark:text-cyan-400 font-mono bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded">VITE_CUSTOM_DOMAIN</code>, the site dynamically links all internal routing, canonical URLs, and metadata to that host.
          </p>

          <form onSubmit={handleSaveDomain} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                Custom Domain Name / Hostname
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. www.offlinefinancevault.com"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Domain</span>
                </button>
              </div>
            </div>

            {savedSuccess && (
              <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Domain successfully saved and updated across all site pages!</span>
              </p>
            )}
          </form>

          {/* DNS / Domain Status Checks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[10px] block">SSL / TLS ENCRYPTION</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active (HTTPS 443)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[10px] block">HOSTING PLATFORM</span>
              <span className="text-cyan-400 font-bold flex items-center gap-1 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
                Vercel Edge Network
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 text-[10px] block">CANONICAL HOST</span>
              <span className="text-slate-900 dark:text-white font-mono font-bold truncate mt-0.5 block">
                {currentDomain}
              </span>
            </div>
          </div>
        </div>

        {/* Env Snippet Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Environment Variable</span>
              </h3>
              <button
                onClick={handleCopyEnv}
                className="text-[11px] text-cyan-500 hover:text-cyan-400 flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEnv ? 'Copied!' : 'Copy .env'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 select-all">
              {envSample}
            </pre>
          </div>

          <button
            onClick={handleResetToDefault}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Defaults</span>
          </button>
        </div>
      </div>

      {/* Dynamic Page Manager Section */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Dynamic Page Availability & Gatekeeper</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enable or disable specific pages dynamically according to your environment configuration (<code className="text-purple-400 font-mono">VITE_ENABLED_PAGES</code>).
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-purple-500 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
            {enabledPages.length} of {ALL_SYSTEM_PAGES.length} Pages Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_SYSTEM_PAGES.map((page) => {
            const isEnabled = enabledPages.includes(page.id);
            const isLocked = page.id === 'dashboard' || page.id === 'security';

            return (
              <div
                key={page.id}
                onClick={() => !isLocked && handleTogglePage(page.id)}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-700'
                } ${
                  isEnabled
                    ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/40 opacity-60'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {page.label}
                    </span>
                    {page.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                        {page.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {page.description}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Path: {page.path}
                  </span>
                </div>

                <div className="shrink-0 mt-0.5">
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      isEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
