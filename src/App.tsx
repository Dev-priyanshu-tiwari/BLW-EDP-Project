import { useState, useEffect } from "react";
import { PoRecord, Co6Record } from "./types";
import OverviewTab from "./components/OverviewTab";
import railwayLogo from "./assets/images/railway_logo_1781671627603.jpeg";
import PosTab from "./components/PosTab";
import Co6Tab from "./components/Co6Tab";
import { 
  BarChart3, 
  Sparkles, 
  RefreshCw,
  TrendingUp,
  FileCheck,
  Database,
  Briefcase
} from "lucide-react";

export default function App() {
  
  // Railway accounting states
  const [pos, setPos] = useState<PoRecord[]>([]);
  const [co6s, setCo6s] = useState<Co6Record[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<string>("Synchronized");
  const [versionTrigger, setVersionTrigger] = useState<number>(0);

  // MongoDB connection status state representation
  interface MongoStatus {
    status: "connected" | "disconnected" | "connecting" | "error";
    error: string | null;
    uriConfigured: boolean;
    databaseName: string;
    help: string;
  }
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);

  // Checks and monitors Atlas Cloud parameters
  const fetchMongoStatus = async () => {
    try {
      const res = await fetch("/api/mongodb/status");
      if (res.ok) {
        const data = await res.json();
        setMongoStatus(data);
      }
    } catch (err) {
      console.warn("MongoDB connectivity diagnostics unavailable:", err);
    }
  };
 
  // Load PO and CO6 record arrays from backend
  const fetchRailwayLedger = async () => {
    setSyncStatus("Syncing...");
    try {
      const res = await fetch("/api/expenditure");
      if (!res.ok) throw new Error("Database refused connection.");
      const data = await res.json();
      
      // Handles fallbacks gracefully
      setPos(data.salaries || data.pos || []);
      setCo6s(data.vendors || data.co6s || []);
      setSyncStatus("Synchronized");
      fetchMongoStatus();
    } catch (err) {
      console.error("Aggregation syncing error:", err);
      setSyncStatus("Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRailwayLedger();
    fetchMongoStatus();
  }, []);

  // Sync PO spreadsheets with DB backend
  const handleSyncPos = async (newPos: PoRecord[]): Promise<boolean> => {
    setSyncStatus("Syncing POs...");
    try {
      const res = await fetch("/api/expenditure/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaries: newPos, vendors: co6s }) // maps to salaries on backend server structure
      });

      if (!res.ok) throw new Error("Sync rejected.");
      const data = await res.json();
      
      setPos(data.salaries || []);
      setVersionTrigger(v => v + 1);
      setSyncStatus("Synchronized");
      return true;
    } catch (_) {
      setSyncStatus("Sync Failed");
      return false;
    }
  };

  // Sync CO6 Contractor Claim spreadsheets with DB backend
  const handleSyncCo6s = async (newCo6s: Co6Record[]): Promise<boolean> => {
    setSyncStatus("Syncing CO6...");
    try {
      const res = await fetch("/api/expenditure/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaries: pos, vendors: newCo6s }) // maps to vendors on backend server structure
      });

      if (!res.ok) throw new Error("Sync rejected.");
      const data = await res.json();

      setCo6s(data.vendors || []);
      setVersionTrigger(v => v + 1);
      setSyncStatus("Synchronized");
      return true;
    } catch (_) {
      setSyncStatus("Sync Failed");
      return false;
    }
  };

  // Restores standard Indian Railways mock sandbox lists (Electrical, Civil, Mechanical, S&T)
  const handleResetRailwayData = async () => {
    setSyncStatus("Resetting...");
    try {
      const res = await fetch("/api/expenditure/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset rejected.");
      const data = await res.json();
      setPos(data.salaries || []);
      setCo6s(data.vendors || []);
      setVersionTrigger(v => v + 1);
      setSyncStatus("Synchronized");
      fetchMongoStatus();
    } catch (_) {
      setSyncStatus("Reset Failed");
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-[#1E293B] font-sans overflow-hidden flex flex-col md:flex-row antialiased selection:bg-indigo-100">
      
      {/* 1. Left Sidebar - Desktop Layout */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between py-8 px-6 shrink-0">
        <div className="space-y-10">
          
          {/* Indian Railways BLW logo and title branding */}
          <div className="flex items-center gap-3 mb-8">
            <img 
              src={railwayLogo} 
              alt="Indian Railways logo" 
              className="w-10 h-10 object-contain rounded-full shadow-xs hover:scale-105 transition-transform duration-200" 
              referrerPolicy="no-referrer"
            />
            <div className="leading-tight">
              <span className="font-extrabold text-lg tracking-tight font-display text-slate-800 block">BLW Budget</span>
              <span className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Indian Railways</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-3">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 font-semibold px-4 py-3 rounded-xl text-sm transition-all duration-150 ${
                activeTab === "overview"
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition ${
                activeTab === "overview" ? "border-indigo-600" : "border-gray-300"
              }`}>
                {activeTab === "overview" && <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs" />}
              </span>
              Overview Analysis
            </button>

            <button
              onClick={() => setActiveTab("salaries")}
              className={`w-full flex items-center gap-3 font-semibold px-4 py-3 rounded-xl text-sm transition-all duration-150 ${
                activeTab === "salaries"
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition ${
                activeTab === "salaries" ? "border-indigo-600" : "border-gray-300"
              }`}>
                {activeTab === "salaries" && <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs" />}
              </span>
              PO (Sanctions)
            </button>

            <button
              onClick={() => setActiveTab("vendors")}
              className={`w-full flex items-center gap-3 font-semibold px-4 py-3 rounded-xl text-sm transition-all duration-150 ${
                activeTab === "vendors"
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <span className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition ${
                activeTab === "vendors" ? "border-indigo-600" : "border-gray-300"
              }`}>
                {activeTab === "vendors" && <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs" />}
              </span>
              CO6 Bills Registry
            </button>
          </nav>

          {/* MongoDB Connection Status Card */}
          
        </div>

        {/* Division and authority tag */}
        <div className="flex flex-col gap-3.5 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EEF2F6] text-indigo-600 border border-slate-200 flex items-center justify-center font-bold font-sans">
              AO
            </div>
            <div className="leading-tight">
              <p className="text-xs font-black text-slate-800">Accounts Officer</p>
              <p className="text-[10px] text-gray-400 font-bold font-mono">Division: BLW-HQ</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Header navigation */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={railwayLogo} 
              alt="Indian Railways logo" 
              className="w-9 h-9 object-contain rounded-full shadow-xs" 
              referrerPolicy="no-referrer"
            />
            <div className="leading-tight">
              <span className="font-extrabold text-base tracking-tight font-display text-slate-800 block">BLW Accounts</span>
              <span className="text-[8px] uppercase font-bold text-red-600">Indian Railways</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div 
              title={mongoStatus?.status === "connected" ? "Connected to MongoDB Atlas Cloud Database" : "No MONGODB_URI found. Safe sandbox fallback mode active."}
              className={`px-2 py-0.5 border text-[9px] font-bold font-mono rounded-md shrink-0 ${
                mongoStatus?.status === "connected" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              {mongoStatus?.status === "connected" ? "MongoDB: Atlas Live" : "MongoDB: Sandbox"}
            </div>
            <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-md font-mono text-[9px] font-bold shrink-0">
              {syncStatus}
            </div>
          </div>
        </div>
        
        {/* Scrollable Mobile navigation bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["overview", "salaries", "vendors"] as const).map(tab => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 capitalize whitespace-nowrap ${
                 activeTab === tab
                   ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                   : "text-slate-500 bg-slate-50"
               }`}
             >
               {tab === "overview" && "Overview"}
               {tab === "salaries" && "POs"}
               {tab === "vendors" && "CO6 Registry"}
             </button>
          ))}
        </div>
      </div>

      {/* 3. Main Body Frame */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Desktop Head Row */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-10 shrink-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 font-display uppercase tracking-tight">
            {activeTab === "overview" && "BLW Expenditure Dashboard"} 
            {activeTab === "salaries" && "PO Budget Sanctions (Excel Stream)"}
            {activeTab === "vendors" && "CO6 Registered Bills (Excel Stream)"}
          </h1>
          
          <div className="flex items-center gap-3 md:gap-5 text-xs text-gray-500">
            <button
              onClick={handleResetRailwayData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-[10px] font-bold uppercase text-slate-650 rounded-xl transition cursor-pointer"
              title="Reset application to mock Indian Railways database"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Reset Ledgers
            </button>

            <div className="hidden lg:block px-4 py-2 bg-slate-50 border border-slate-100/50 rounded-lg font-mono text-[9px] text-gray-400 uppercase tracking-widest font-extrabold">
              State: {syncStatus}
            </div>

            <button
              onClick={fetchRailwayLedger}
              title="Force synchronization"
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition text-gray-500 hover:text-gray-900 h-8 w-8 flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* 4. Main Scrollable Container */}
        <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="min-h-96 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-xs text-slate-450 font-bold uppercase tracking-wider font-mono">Collating database states...</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {activeTab === "overview" && (
                <OverviewTab 
                  salaries={pos}
                  vendors={co6s}
                  setActiveTab={setActiveTab} 
                  versionTrigger={versionTrigger}
                />
              )}
              
              {activeTab === "salaries" && (
                <PosTab 
                  pos={pos} 
                  onSyncPos={handleSyncPos}
                />
              )}

              {activeTab === "vendors" && (
                <Co6Tab 
                  co6s={co6s}
                  onSyncCo6s={handleSyncCo6s}
                />
              )}

            </div>
          )}
        </div>

        {/* 5. Indian Railways Accounts footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[9px] text-gray-400 font-bold font-mono shrink-0 uppercase tracking-wider">
          <span>BLW Accounts Division • Accounts Ledger Module</span>
          <div className="flex items-center gap-2 text-gray-300">
            <span>Division Unit: Varanasi HQ</span>
            <span>•</span>
            <span>Spreadsheet Controller Active</span>
          </div>
        </footer>
      </main>

    </div>
  );
}
