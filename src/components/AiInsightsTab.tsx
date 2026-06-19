import { useState, useEffect } from "react";
import { AiInsightsResponse } from "../types";
import { 
  Sparkles, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingDown, 
  PieChart, 
  HelpCircle,
  Lightbulb,
  DollarSign
} from "lucide-react";
import Markdown from "react-markdown";

interface AiInsightsTabProps {
  versionTrigger: number; // Incrementing trigger to invalidate stale data when transactions change
}

const REASSURANCE_PHASES = [
  "Auditing standard cash ledger streams...",
  "Running variable expenditure leakage diagnostics...",
  "Feeding metrics to  cognitive engines...",
  "Assembling category-specific recommendations reports...",
  "Readying strategic savings projections..."
];

export default function AiInsightsTab({ versionTrigger }: AiInsightsTabProps) {
  const [data, setData] = useState<AiInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);

  // Gamified active optimization savings offsets
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    setLoadingPhase(0);
    
    try {
      const res = await fetch("/api/expenditure/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        throw new Error("Local backend advisory failed to respond.");
      }
      const json = await res.json();
      setData(json);
      // Reset gamified optimizers
      setCheckedActions({});
    } catch (e: any) {
      setError(e?.message || "Insights collection connection interrupted.");
    } finally {
      setLoading(false);
    }
  };

  // Reassurance stage rotation
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPhase((p) => (p + 1) % REASSURANCE_PHASES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle trigger
  useEffect(() => {
    fetchInsights();
  }, [versionTrigger]);

  const toggleAction = (name: string) => {
    setCheckedActions(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Calculate hypothetical savings margin offset
  const computedTotalSavings = data?.savingsOpportunities.reduce((sum, opp) => {
    if (checkedActions[opp.actionName]) {
      return sum + opp.potentialSavingsMonthly;
    }
    return sum;
  }, 0) || 0;

  return (
    <div id="ai-insights-tab" className="space-y-6 animate-fade-in block">
      
      {/* 1. Header with recalculation triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-100" /> 
            AI-Driven Financial Forensic Report
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Harness real-time deep reasoning analyses customized to June 2026 logs.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition duration-150 shadow-sm disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalculate Advisor Audit
        </button>
      </div>

      {loading ? (
        /* --- Loading Stage --- */
        <div id="insights-loading" className="bg-white border border-gray-150 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-2xs min-h-96">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <Sparkles className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 font-display">Assembling Cognitive Insights</h4>
            <p className="text-xs text-gray-400 mt-1.5 transition-all duration-300 animate-pulse">
              {REASSURANCE_PHASES[loadingPhase]}
            </p>
          </div>
        </div>
      ) : error ? (
        /* --- Error Stage --- */
        <div id="insights-error" className="bg-red-50/50 border border-red-100 p-8 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-display">Cognitive Report Interrupted</h4>
            <p className="text-xs text-red-650 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchInsights}
            className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-4 py-2 rounded-xl transition font-semibold"
          >
            Retry Advisory Call
          </button>
        </div>
      ) : data ? (
        /* --- High Quality Report stage --- */
        <div id="insights-report" className="space-y-6">
          
          {/* Status banner */}
          <div className="bg-linear-to-r from-indigo-50/80 to-slate-50/80 border border-indigo-100/70 p-5 rounded-2xl flex items-start gap-4 shadow-3xs">
            <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-2xs border border-indigo-100/50 flex-shrink-0">
              <Sparkles className="w-5 h-5 fill-indigo-100" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">Executive Summary Status</h3>
              <p className="text-sm font-semibold text-gray-900 mt-1 font-sans leading-relaxed">{data.overallStatus}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Deep reasoning Text box (3/5ths) */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-2xs lg:col-span-3 space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-mono">Detailed Allocation Audit</h3>
                  <p className="text-[10px] text-gray-400">Deep structural diagnostics from Gemini financial rules</p>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-2.5 py-0.5 rounded-full font-bold">Verified Cognitive Model</span>
              </div>

              {/* Secure parsing-compliant markdown wrap */}
              <div className="markdown-body text-xs leading-relaxed space-y-3 text-gray-600">
                <Markdown>{data.analysisText}</Markdown>
              </div>
            </div>

            {/* Category advice tips list (2/5ths) */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-2xs lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-mono">Advisory Alerts & Appraisals</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Real-time alerts corresponding to budget limit overshoots</p>
              </div>

              <div className="space-y-3.5 max-h-120 overflow-y-auto pr-1">
                {data.categoryTips.map((tip, idx) => {
                  
                  const isWarning = tip.status === "warning";
                  const isGood = tip.status === "good";

                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 p-3.5 rounded-xl border ${
                        isWarning 
                          ? 'bg-red-50/50 border-red-100 text-red-900' 
                          : isGood 
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-950' 
                          : 'bg-indigo-50/40 border-indigo-100 text-indigo-950'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        ) : isGood ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div className="text-xs">
                        <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">{tip.categoryName} Advisory</span>
                        <p className="leading-relaxed text-gray-700">{tip.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gamified Savings Opportunities Bento (100% width) */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-1.5">
                  <Lightbulb className="w-5 h-5 text-amber-400 fill-amber-100/10 animate-pulse" />
                  Tactical Savings Blueprint Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select structural tweaks to calculate hypothetical budget yield.</p>
              </div>
              
              {/* Computed yield statistics in header */}
              <div className="bg-slate-800 border border-slate-700/60 rounded-xl py-2 px-3.5 text-right">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block mb-0.5">Simulated Returns Yield</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  +₹{computedTotalSavings}/mo <span className="text-slate-400 text-xs font-medium">(₹{computedTotalSavings * 12}/yr)</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.savingsOpportunities.map((opp, idx) => {
                const isChecked = !!checkedActions[opp.actionName];
                
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleAction(opp.actionName)} 
                    className={`p-4 border rounded-xl cursor-pointer transition duration-200 select-none ${
                      isChecked 
                        ? 'bg-slate-800/80 border-indigo-500 shadow-sm' 
                        : 'bg-slate-800/40 border-slate-700 text-slate-100 hover:border-slate-600 hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-500'}`}>
                          {isChecked && <CheckIcon />}
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1.5 leading-relaxed">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-100 font-sans">{opp.actionName}</span>
                          <span className="font-bold text-emerald-400 font-mono whitespace-nowrap bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                            +₹{opp.potentialSavingsMonthly}/mo
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs">{opp.logic}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* --- Fallback Trigger Stage --- */
        <div className="bg-white border border-gray-150 rounded-2xl p-12 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-indigo-600 fill-indigo-100 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-gray-800 font-display">Advisory Audit Pending</h4>
            <p className="text-xs text-gray-500 mt-1">Ready to compile strategic advice models.</p>
          </div>
          <button 
            onClick={fetchInsights}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
          >
            Start Financial Audit
          </button>
        </div>
      )}

    </div>
  );
}

// Mini SVG Check Helper
function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
  );
}
