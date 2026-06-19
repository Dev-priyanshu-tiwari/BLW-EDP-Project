import { useMemo } from "react";
import { PoRecord, Co6Record } from "../types";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  TrendingUp, 
  Building2, 
  ArrowUpRight, 
  Layers, 
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertTriangle,
  FolderSync
} from "lucide-react";
import ForecastTab from "./ForecastTab.tsx";

interface OverviewTabProps {
  salaries: PoRecord[]; // keeping salaries name as prop for backwards-safety
  vendors: Co6Record[]; // keeping vendors name as prop for backwards-safety
  setActiveTab: (tab: string) => void;
  versionTrigger: number;
}

const DEPT_COLORS: Record<string, string> = {
  Electrical: "#6366f1", // Indigo
  "S&T": "#3b82f6",       // Blue
  Civil: "#10b981",       // Emerald
  Mechanical: "#f59e0b",  // Amber
  Operating: "#8b5cf6",   // Violet
  General: "#6b7280"      // Gray
};

const CO6_STATUS_COLORS: Record<string, string> = {
  Passed: "#10B981",   // Emerald-500
  Pending: "#3B82F6",  // Blue-500
  Returned: "#EF4444"  // Red-500
};

export default function OverviewTab({ salaries: pos = [], vendors: co6s = [], setActiveTab, versionTrigger }: OverviewTabProps) {
  
  // Compute normalized monthly budgets and liabilities
  const financialMetrics = useMemo(() => {
    let normPoMonthly = 0;
    pos.forEach(p => {
      const amt = p.amount;
      if (p.period === "monthly") normPoMonthly += amt;
      else if (p.period === "quarterly") normPoMonthly += (amt / 3);
      else if (p.period === "yearly") normPoMonthly += (amt / 12);
    });

    let normCo6Monthly = 0;
    let normCo6PassedMonthly = 0;
    co6s.forEach(c => {
      const bAmt = c.billAmount;
      const pAmt = c.passedAmount;
      if (c.period === "monthly") {
        normCo6Monthly += bAmt;
        normCo6PassedMonthly += pAmt;
      } else if (c.period === "quarterly") {
        normCo6Monthly += (bAmt / 3);
        normCo6PassedMonthly += (pAmt / 3);
      } else if (c.period === "yearly") {
        normCo6Monthly += (bAmt / 12);
        normCo6PassedMonthly += (pAmt / 12);
      }
    });

    const unutilizedBuffer = normPoMonthly - normCo6PassedMonthly;
    const clearanceRatio = normCo6Monthly > 0 ? (normCo6PassedMonthly / normCo6Monthly) * 100 : 0;
    
    // Safety utilization ratio: Passed / Sanctioned
    const safetyRatio = normPoMonthly > 0 ? (normCo6PassedMonthly / normPoMonthly) * 100 : 0;

    return {
      normPoMonthly,
      normCo6Monthly,
      normCo6PassedMonthly,
      unutilizedBuffer,
      clearanceRatio,
      safetyRatio
    };
  }, [pos, co6s]);

  // Department-wise allocations for Recharts Bar Chart
  const departmentData = useMemo(() => {
    const depts = Array.from(new Set([
      ...pos.map(p => p.department),
      ...co6s.map(c => c.department)
    ])).filter(Boolean);

    return depts.map(d => {
      const poSum = pos
        .filter(p => p.department === d)
        .reduce((sum, p) => sum + p.amount, 0);

      const co6PassedSum = co6s
        .filter(c => c.department === d)
        .reduce((sum, c) => sum + c.passedAmount, 0);

      return {
        department: d,
        "Sanctioned PO": Number(poSum.toFixed(2)),
        "Passed CO6": Number(co6PassedSum.toFixed(2))
      };
    }).sort((a, b) => b["Sanctioned PO"] - a["Sanctioned PO"]);
  }, [pos, co6s]);

  // CO6 Status Volume Distribution for Pie Chart
  const co6StatusDistribution = useMemo(() => {
    const counts: Record<string, number> = { Passed: 0, Pending: 0, Returned: 0 };
    
    co6s.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + c.billAmount;
    });

    return Object.entries(counts)
      .map(([status, value]) => ({
        name: status,
        value: Number(value.toFixed(2)),
        color: CO6_STATUS_COLORS[status] || "#9ca3af"
      }))
      .filter(d => d.value > 0);
  }, [co6s]);

  return (
    <div id="overview-tab" className="space-y-6 animate-fade-in block">
      
      {/* 1. IR Accounts KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* PO Sanctions Limit */}
        <div id="card-normalized-salary" className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs transition hover:shadow-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Monitored PO Sanction Limit
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 font-sans">
              ₹{financialMetrics.normPoMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">Monthly Equiv</span>
          </div>
          <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">
            Authorized purchase allotments tracked over active railway tenders.
          </p>
        </div>

        {/* CO6 Bill Clearance Outflows */}
        <div id="card-normalized-vendors" className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs transition hover:shadow-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Passed Contractor Claims
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 font-sans">
              ₹{financialMetrics.normCo6PassedMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Cleared</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${Math.min(financialMetrics.safetyRatio, 100)}%` }} 
            />
          </div>
        </div>

        {/* Unutilized Sanction Reserve */}
        <div id="card-corporate-surplus" className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs transition hover:shadow-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Unutilized Balance Margin
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className={`text-2xl font-bold tracking-tight font-sans ${financialMetrics.unutilizedBuffer >= 0 ? "text-indigo-600" : "text-rose-650"}`}>
              ₹{financialMetrics.unutilizedBuffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${financialMetrics.unutilizedBuffer >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
              {financialMetrics.unutilizedBuffer >= 0 ? "Available" : "Over-allocated"}
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-2">
            Remaining unutilized PO budget reserves.
          </p>
        </div>

        {/* CO6 Passing Efficiency */}
        <div id="card-coverage-ratio" className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs transition hover:shadow-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-cyan-500" /> CO6 Passing Clear Rate
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 font-sans">
              {financialMetrics.clearanceRatio.toFixed(1)}%
            </h3>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${financialMetrics.clearanceRatio >= 85 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {financialMetrics.clearanceRatio >= 85 ? "Optimal" : "Pending Log"}
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">
            Proportion of registered CO6 bills cleared & passed.
          </p>
        </div>
      </div>

      {/* 2. Graphical Command center: Departments Comparison Bar Chart & CO6 Status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Department Comparison (3/5ths) */}
        <div id="chart-panel-bar-corporate" className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs lg:col-span-3 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-semibold text-gray-900 font-display">Departmental Sanctions vs Bill Clearances</h3>
              <p className="text-xs text-gray-500">PO sanctioned limits versus cleared/passed CO6 bill totals</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 bg-slate-50 border border-slate-100 p-2 rounded-xl">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#4f46e5] rounded-full inline-block" /> Sanction PO</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block" /> Passed Bill</span>
            </div>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="department" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: number | string | readonly (string | number)[] | undefined) => {
                    if (Array.isArray(value)) return `₹${Number(value[0] ?? 0).toLocaleString()}`;
                    return `₹${Number(value ?? 0).toLocaleString()}`;
                  }}
                  contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                  itemStyle={{ fontSize: "12px" }}
                  labelStyle={{ fontWeight: "700", fontSize: "12px", color: "#1e293b" }}
                />
                <Bar dataKey="Sanctioned PO" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={26} name="Sanctioned PO Total" />
                <Bar dataKey="Passed CO6" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} name="Passed CO6 Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CO6 Bills Registry Status Pie chart (2/5ths) */}
        <div id="chart-panel-pie-vendors" className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs lg:col-span-2 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 font-display">CO6 Claims Registry Status</h3>
            <p className="text-xs text-gray-500">Classification of registered bill volume</p>
          </div>

          {co6StatusDistribution.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs italic space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-300" />
              <span>No CO6 claims currently synced.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="h-44 w-44 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={co6StatusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {co6StatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number | string | readonly (string | number)[] | undefined) => {
                        if (Array.isArray(value)) return `₹${Number(value[0] ?? 0).toLocaleString()}`;
                        return `₹${Number(value ?? 0).toLocaleString()}`;
                      }}
                      contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Visual center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] text-[#94A3B8] font-bold tracking-widest uppercase">Claims Base</span>
                  <span className="text-xs font-bold text-slate-800">
                    ₹{co6StatusDistribution.reduce((s, d) => s + d.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Legend with direct color points */}
              <div className="flex-1 space-y-2 w-full max-h-48 overflow-y-auto pr-1">
                {co6StatusDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-semibold truncate">{item.name}</span>
                    </div>
                    <span className="text-[#1E293B] font-bold font-mono pl-1">₹{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3.5 text-center">
            <button 
              onClick={() => setActiveTab("vendors")}
              className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Examine CO6 Log Registry <ArrowUpRight className="w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Highest Value Transactions List comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Highest PO Sanctions */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Major PO Allocations</h3>
              <p className="text-xs text-gray-500">Highest volume sanctioned purchase orders</p>
            </div>
            <button 
              onClick={() => setActiveTab("salaries")}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              View PO Registry →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pos.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No PO records found. Load PO spreadsheets from PO tab.</p>
            ) : (
              pos.slice(0, 4).sort((a,b) => b.amount - a.amount).map(p => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FolderSync className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.agency}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 truncate uppercase font-bold">{p.poNumber} • {p.department}</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600 font-mono whitespace-nowrap pl-2">+₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Value CO6 Bill Registrations */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">High-Value CO6 Claims</h3>
              <p className="text-xs text-gray-500">Contractor bills registered with highest weight</p>
            </div>
            <button 
              onClick={() => setActiveTab("vendors")}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
            >
              View CO6 Registry →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {co6s.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No CO6 claims found. Upload CO6 registrations in CO6 tab.</p>
            ) : (
              co6s.slice(0, 4).sort((a,b) => b.billAmount - a.billAmount).map(c => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      c.status === "Passed" ? "bg-emerald-50 text-emerald-600" : c.status === "Pending" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{c.partyName}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 truncate uppercase font-bold">{c.co6Number} • {c.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-[#1E293B] font-mono whitespace-nowrap">₹{c.billAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <span className="text-[9px] uppercase font-bold text-slate-400">{c.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Synchronization disclaimer banner */}
      <div className="bg-[#FAF5FF] border border-purple-100/80 p-4 rounded-xl flex items-center justify-between text-[11px] font-sans text-purple-900 shadow-3xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-500" />
          <span><strong>Overview Analysis Ready:</strong> The system is analyzing dynamic railway metrics directly parsed from active spreadsheet cells.</span>
        </div>
        <span className="font-mono text-purple-400 text-[10px]">Division: Banaras Locomotive Works Accounts (BLW)</span>
      </div>

      {/* Advanced LLM Forecasts */}
      <div className="border-t border-slate-200/80 pt-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-3xs">
          <ForecastTab versionTrigger={versionTrigger} />
        </div>
      </div>
    </div>
  );
}
