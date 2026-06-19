import { useState, useEffect } from "react";
import { ForecastResponse, ForecastPoint } from "../types";
import { 
  Sparkles, 
  RotateCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  BarChart4, 
  Layers, 
  ShieldCheck, 
  Lightbulb, 
  Calendar,
  IndianRupee,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import Markdown from "react-markdown";

interface ForecastTabProps {
  versionTrigger: number;
}

const REASSURANCE_PHASES = [
  "Structuring historical ministry PO sanctions records...",
  "Compiling contractor claim CO6 ledger submissions...",
  "Calculating weather-based monsoon downtime indices...",
  "Tuning scenario multipliers for accelerated modernization targets...",
  "Feeding baseline parameters to  forecasting logic...",
  "Finalizing accounts projections and policy tips..."
];

const SCENARIO_PRESETS = [
  { id: "baseline", label: "Baseline Capital Expansion", desc: "Routine infrastructure growth aligned with 2026 targets.", risk: "Medium" },
  { id: "modernization", label: "Accelerated High-Speed Modernization", desc: "Aggressive spending push (electrification, signal upgrades).", risk: "High" },
  { id: "frugal", label: "Conservative Frugal Allocation", desc: "Minimal capital outlays focusing purely on critical repairs.", risk: "Low" }
];

export default function ForecastTab({ versionTrigger }: ForecastTabProps) {
  const [horizon, setHorizon] = useState<number>(6);
  const [scenario, setScenario] = useState<string>("baseline");
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<number>(0);
  
  // Gamified recommendation optimizer triggers
  const [checkedRecs, setCheckedRecs] = useState<Record<string, boolean>>({});

  const generateForecast = async () => {
    setLoading(true);
    setError(null);
    setLoadingPhase(0);
    
    try {
      const res = await fetch("/api/expenditure/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon, scenario })
      });
      if (!res.ok) {
        throw new Error("Forecast advisory failed to respond.");
      }
      const json = await res.json();
      setData(json);
      setCheckedRecs({}); // Reset checked policy guidelines on a fresh forecast run
    } catch (e: any) {
      setError(e?.message || "Check connection parameters. Connection interrupted.");
    } finally {
      setLoading(false);
    }
  };

  // Rotate loading reassurance messages
  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setInterval(() => {
        setLoadingPhase((p) => (p + 1) % REASSURANCE_PHASES.length);
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [loading]);

  // Initial trigger
  useEffect(() => {
    generateForecast();
  }, [versionTrigger]);

  const toggleRec = (title: string) => {
    setCheckedRecs(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Calculate optimizer savings
  const totalOffsetSavings = data?.recommendations.reduce((sum, rec) => {
    if (checkedRecs[rec.title]) {
      return sum + rec.impactMonthly;
    }
    return sum;
  }, 0) || 0;

  // Rich Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div id="compiled-forecast-tooltip" className="bg-white border border-gray-150 p-4 rounded-xl shadow-lg text-xs space-y-2">
          <p className="font-bold text-gray-800">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name === "projectedPoAmount" ? "Projected sanctioned PO limit" : "Projected contractor claims (CO6)"}
              </span>
              <span className="font-mono font-bold text-gray-900">
                ₹{Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
          {payload[0]?.payload?.narrative && (
            <p className="text-[10px] text-indigo-600 bg-indigo-50/70 p-1.5 rounded-lg leading-relaxed mt-1">
              <strong>Context:</strong> {payload[0].payload.narrative}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format currency labels compactly
  const formatYAxis = (tick: number) => {
    if (tick >= 100000) {
      return `₹${(tick / 100000).toFixed(1)}L`;
    }
    return `₹${tick.toLocaleString()}`;
  };

  return (
    <div id="forecast-tab" className="space-y-6 animate-fade-in block">
      
      {/* 1. Planning Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            AI-Driven Capital & Contractor Claims Forecasting
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Simulate future sanctioned limits (PO) vs payment outlays (CO6) using advanced Local LLM models.
          </p>
        </div>
        
        {/* Scenario preset pills on the right for quick accessibility */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase font-mono font-bold text-gray-400 mr-1.5">Preset Horizon:</label>
          <select 
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="bg-white border border-gray-250 text-xs px-3 py-1.5 rounded-lg shadow-2xs font-semibold focus:outline-indigo-500"
          >
            <option value={3}>3 Months Projection</option>
            <option value={6}>6 Months Projection</option>
            <option value={12}>12 Months Projection</option>
          </select>
        </div>
      </div>

      {/* 2. Simulation Scenario Control Panel */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Select Simulation Runway Presets
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SCENARIO_PRESETS.map((p) => {
            const isSelected = scenario === p.id;
            const isHigh = p.risk === "High";
            const isLow = p.risk === "Low";
            
            return (
              <div
                key={p.id}
                onClick={() => setScenario(p.id)}
                className={`p-4 border rounded-xl cursor-pointer transition duration-150 select-none flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? "bg-indigo-50/50 border-indigo-600 shadow-3xs"
                    : "bg-gray-50/30 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">{p.label}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isHigh 
                        ? "bg-red-50 text-red-650 border border-red-100" 
                        : isLow 
                        ? "bg-emerald-50 text-emerald-650 border border-emerald-100"
                        : "bg-amber-50 text-amber-650 border border-amber-100"
                    }`}>
                      {p.risk} Risk Profile
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{p.desc}</p>
                </div>
                
                {/* Active selection dot indicator */}
                <div className="flex items-center justify-end pt-1">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isSelected ? "border-indigo-600 text-indigo-600" : "border-gray-300"
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-400">Model Engine:</span>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-lg text-[11px] font-mono shadow-3xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>BLW In-House LLM (100% Offline & Private)</span>
            </div>
          </div>

          <button
            onClick={generateForecast}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Predictive Simulation Model
          </button>
        </div>
      </div>

      {loading ? (
        /* --- loading state --- */
        <div id="forecast-loading" className="bg-white border border-gray-150 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-2xs min-h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <Sparkles className="w-7 h-7 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 font-display">Assembling AI Forecasting Model</h4>
            <p className="text-xs text-gray-400 mt-2 transition-all duration-300 animate-pulse font-mono bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              {REASSURANCE_PHASES[loadingPhase]}
            </p>
          </div>
        </div>
      ) : error ? (
        /* --- error state --- */
        <div id="forecast-error" className="bg-red-50/50 border border-red-100 p-8 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-display">Prediction Computation Interrupted</h4>
            <p className="text-xs text-red-650 mt-1">{error}</p>
          </div>
          <button
            onClick={generateForecast}
            className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-4 py-2 rounded-xl transition font-semibold"
          >
            Retry Simulation
          </button>
        </div>
      ) : data ? (
        /* --- complete forecast report state --- */
        <div id="forecast-results" className="space-y-6">
          
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-3xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-450 uppercase font-mono block">Forecast Target</span>
                <span className="text-sm font-bold text-gray-900">{data.horizonMonths} Month Window</span>
              </div>
            </div>

            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-3xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-450 uppercase font-mono block">Scenario Preserved</span>
                <span className="text-xs font-bold text-gray-900 tracking-tight block max-w-40 truncate">{data.scenarioName}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-3xs flex items-center gap-3.5">
              <div className={`p-3 rounded-xl ${
                data.scenarioRiskFactor === "High" 
                  ? "bg-red-50 text-red-600" 
                  : data.scenarioRiskFactor === "Low" 
                  ? "bg-emerald-50 text-emerald-600" 
                  : "bg-amber-50 text-amber-600"
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-450 uppercase font-mono block">Scenario Risk Index</span>
                <span className="text-sm font-bold text-gray-900">{data.scenarioRiskFactor} Level</span>
              </div>
            </div>

            <div className="bg-linear-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-xl shadow-2xs flex items-center gap-3.5">
              <div className="p-3 bg-white/10 text-white rounded-xl">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-100 uppercase font-mono block">Average Monthly PO</span>
                <span className="text-sm font-bold font-mono">
                  ₹{Math.round(data.forecastPoints.reduce((sum, p) => sum + p.projectedPoAmount, 0) / data.forecastPoints.length).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Scenario Overview Alert */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs leading-relaxed text-blue-955">
              <strong className="font-semibold block font-sans">Planning Brief:</strong>
              {data.overallSummary}
            </div>
          </div>

          {/* 3. Composed Chart visual board */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-105 pb-3">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-widest flex items-center gap-1.5">
                  <BarChart4 className="w-4 h-4 text-indigo-500" /> Projected Budget vs Outflows Comparison
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Composed mixed chart modeling monthly PO sanctioned targets (bars) vs CO6 contractor claims (lines)</p>
              </div>
              
              {/* Interactive chart legend accents */}
              <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500 font-sans">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500/80 rounded-sm" /> Sanctioned limits</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-emerald-500 rounded-full" /> Claims payout</span>
              </div>
            </div>
            
            <div id="expenditure-forecast-chart" className="w-full h-80 pt-2 text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.forecastPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    tickLine={false} 
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={formatYAxis} 
                    tickMargin={8}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    name="projectedPoAmount"
                    dataKey="projectedPoAmount" 
                    fill="#818cf8" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45} 
                  />
                  <Line 
                    name="projectedCo6Amt"
                    type="monotone" 
                    dataKey="projectedCo6Amt" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ stroke: '#047857', strokeWidth: 2, r: 4, fill: '#34d399' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* 4. Deep markdown narrative (3/5 width) */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-3xs lg:col-span-3 space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-905 uppercase tracking-wider font-mono">Foresight Narrative & Diagnostics</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Macro analyses generated by Commissioner cognitive logic</p>
                </div>
                <div className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border border-indigo-200/50 px-2.5 py-1 rounded-lg text-[9px] font-mono text-indigo-700 font-bold flex items-center gap-1 animate-pulse">
                  <Activity className="w-3 h-3 text-indigo-650" /> Railway Expenditure Forecasting LLM v1.0
                </div>
              </div>

              <div className="markdown-body text-xs text-gray-600 leading-relaxed space-y-3.5">
                <Markdown>{data.narrativeAnalysis}</Markdown>
              </div>
            </div>

            {/* 5. Compact Highlights Table (2/5 width) */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-3xs lg:col-span-2 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-905 uppercase tracking-wider font-mono">Month-on-Month Projections</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Normalized metrics generated by simulated model parameters</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-mono text-[10px] uppercase">
                        <th className="py-2.5">Month</th>
                        <th className="py-2.5 text-right">PO Goal</th>
                        <th className="py-2.5 text-right">CO6 Goal</th>
                        <th className="py-2.5 text-right pr-1">Conf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {data.forecastPoints.map((pt, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition">
                          <td className="py-2 font-semibold text-gray-800">{pt.month}</td>
                          <td className="py-2 text-right font-mono text-[11px]">₹{(pt.projectedPoAmount / 100000).toFixed(1)}L</td>
                          <td className="py-2 text-right font-mono text-[11px] text-emerald-600 font-semibold">₹{(pt.projectedCo6Amt / 100000).toFixed(1)}L</td>
                          <td className="py-2 text-right pr-1">
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                              pt.confidenceScore >= 80 
                                ? "bg-emerald-50 text-emerald-700" 
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {pt.confidenceScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mt-4">
                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  💡 <strong>Tip:</strong> Higher confidence ranks signify baseline months with lower climatic or end-of-year seasonal disturbances.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Strategic policy optimization simulator */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                  <Lightbulb className="w-4.5 h-4.5 text-amber-400 fill-amber-400/10 animate-pulse" />
                  Predictive Liquidity Optimization Blueprint
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enact the strategic administrative corrections proposed by the LLM model to calculate simulated monthly cash reserves.
                </p>
              </div>
              
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl py-2 px-3.5 text-right flex-shrink-0 animate-fade-in">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block mb-0.5">Optimized Working Cash Reserve</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  +₹{totalOffsetSavings.toLocaleString()}/mo <span className="text-slate-400 text-[11px] font-medium">(₹{(totalOffsetSavings * 12).toLocaleString()}/yr)</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.recommendations.map((rec, i) => {
                const isSelected = !!checkedRecs[rec.title];
                
                return (
                  <div
                    key={i}
                    onClick={() => toggleRec(rec.title)}
                    className={`p-4 border rounded-xl cursor-pointer transition duration-150 select-none ${
                      isSelected
                        ? "bg-slate-800 border-indigo-500 shadow-3xs"
                        : "bg-slate-800/45 border-slate-700 hover:border-slate-600 text-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-500"
                        }`}>
                          {isSelected && <CheckCircleIcon />}
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1.5 leading-relaxed">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-50 font-sans">{rec.title}</span>
                          <span className="font-bold text-emerald-400 font-mono text-[10.5px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                            +₹{rec.impactMonthly.toLocaleString()}/mo
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* --- initial pending state --- */
        <div className="bg-white border border-gray-150 rounded-2xl p-12 text-center space-y-4">
          <TrendingUp className="w-12 h-12 text-indigo-600 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-gray-800 font-display font-display">Forecasting Model Dormant</h4>
            <p className="text-xs text-gray-500 mt-1">Ready to compile strategic planning models.</p>
          </div>
          <button 
            onClick={generateForecast}
            className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-2xs"
          >
            Initiate Forecast Analysis
          </button>
        </div>
      )}

    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2500/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
  );
}
