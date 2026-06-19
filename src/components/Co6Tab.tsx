import { useState, useMemo } from "react";
import { Co6Record } from "../types";
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";

interface Co6TabProps {
  co6s: Co6Record[];
  onSyncCo6s: (newCo6s: Co6Record[]) => Promise<boolean>;
}

export default function Co6Tab({ co6s, onSyncCo6s }: Co6TabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Passed" | "Pending" | "Returned">("all");
  
  // Upload status and messaging state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Download sample CO6 CSV template matching Indian Railways Board
  const handleDownloadTemplate = () => {
    const csvContent = 
      "CO6 Number,Date,Party Name,Bill Amount,Passed Amount,Department,Status,Period\n" +
      "BLW/CO6/EL/501,2026-06-01,BHEL Electricals Ltd,154500.00,145800.00,Electrical,Passed,monthly\n" +
      "BLW/CO6/ST/502,2026-06-02,Sanjeev Signals & Cables,48000.00,48000.00,S&T,Passed,monthly\n" +
      "BLW/CO6/CIV/503,2026-06-04,L&T Infrastructure,150000.00,150000.00,Civil,Passed,quarterly\n" +
      "BLW/CO6/MECH/504,2026-06-05,Howrah Alloy Castings,85000.00,0.00,Mechanical,Pending,monthly\n" +
      "BLW/CO6/EL/505,2026-06-08,PowerGrid Spares Rail,100000.00,0.00,Electrical,Pending,yearly\n" +
      "BLW/CO6/MECH/506,2026-06-09,Howrah Alloy Castings,32000.00,0.00,Mechanical,Returned,monthly";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ir_co6_bills_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

// Helper for robust date conversion from Excel dates and common strings
function parseExcelDate(val: any): string {
  if (val === undefined || val === null) {
    return new Date().toISOString().split("T")[0];
  }
  
  // If already a JS Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, "0");
      const dd = String(val.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const strVal = String(val).trim();
  if (!strVal) {
    return new Date().toISOString().split("T")[0];
  }

  // Handle numeric Excel serial date, e.g. 45443
  if (/^\d+(\.\d+)?$/.test(strVal)) {
    const serial = parseFloat(strVal);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Parse DD-MM-YYYY or DD/MM/YYYY
  const dmYMatch = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmYMatch) {
    const d = parseInt(dmYMatch[1], 10);
    const m = parseInt(dmYMatch[2], 10) - 1;
    const y = parseInt(dmYMatch[3], 10);
    const parsedDate = new Date(y, m, d);
    if (!isNaN(parsedDate.getTime())) {
      const yyyy = parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(parsedDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Parse YYYY-MM-DD or YYYY/MM/DD
  const yMdMatch = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yMdMatch) {
    const y = parseInt(yMdMatch[1], 10);
    const m = parseInt(yMdMatch[2], 10) - 1;
    const d = parseInt(yMdMatch[3], 10);
    const parsedDate = new Date(y, m, d);
    if (!isNaN(parsedDate.getTime())) {
      const yyyy = parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(parsedDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Generic ISO parse attempt
  const timestamp = Date.parse(strVal);
  if (!isNaN(timestamp)) {
    const dateObj = new Date(timestamp);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return strVal;
}

// Helper to extract amounts robustly
function parseExcelAmount(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Find a row's key using flexible fuzzy criteria
function getFuzzyValue(row: any, regex: RegExp, defaultKey: string): any {
  const matchKey = Object.keys(row).find(k => {
    const cleanKey = k.trim().toLowerCase().replace(/[\s_-]/g, "");
    return regex.test(cleanKey);
  });
  return matchKey ? row[matchKey] : row[defaultKey];
}

  // Excel importer for CO6 data
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result;
        // Enabling cellDates lets SheetJS map date formats cleanly into native JS Date objects
        const wb = XLSX.read(ab, { type: "array", cellDates: true });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        
        // 1. Get raw spreadsheet as 2D matrix
        const rawGrid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

        if (!Array.isArray(rawGrid) || rawGrid.length === 0) {
          throw new Error("Spreadsheet contains empty sheet tab records.");
        }

        // 2. Scan first 15 rows to find the official headers row (where key column patterns are detected)
        let headerRowIdx = 0;
        let maxMatches = 0;
        const targetMatchers = [
          /co6|number|id|ref|c_o|registration/i,
          /date|day|time|creation/i,
          /party|payee|agency|vendor|contractor|source/i,
          /bill.*amount|amount|claim|value|sum/i,
          /dept|office|department|section/i
        ];

        for (let r = 0; r < Math.min(rawGrid.length, 15); r++) {
          const row = rawGrid[r];
          if (!row || !Array.isArray(row)) continue;
          let matches = 0;
          for (const cell of row) {
            const valStr = String(cell || "").trim().toLowerCase();
            if (!valStr) continue;
            if (targetMatchers.some(regex => regex.test(valStr))) {
              matches++;
            }
          }
          if (matches > maxMatches && matches >= 2) {
            maxMatches = matches;
            headerRowIdx = r;
          }
        }

        // 3. Extract the clean headers
        const headers = rawGrid[headerRowIdx].map(h => String(h || "").trim());

        // 4. Construct objects representing the data rows
        const rawRows: any[] = [];
        for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
          const row = rawGrid[r];
          if (!row || row.every(cell => String(cell || "").trim() === "")) {
            continue; // Skip empty rows
          }
          
          const obj: any = {};
          headers.forEach((header, colIdx) => {
            if (header) {
              obj[header] = row[colIdx];
            }
          });
          rawRows.push(obj);
        }

        if (rawRows.length === 0) {
          throw new Error("No CO6 records could be extracted. Please check the spreadsheet header alignment.");
        }

        const mappedCo6s: Co6Record[] = rawRows.map((row, idx) => {
          // Precise patterns
          const co6Number = String(getFuzzyValue(row, /co6|number|id|ref|c_o|registration/i, "CO6 Number") || "").trim();
          const rawDate = getFuzzyValue(row, /date|day|time|creation/i, "Date");
          const partyName = String(getFuzzyValue(row, /party|payee|agency|vendor|contractor|source|partyname/i, "Party Name") || "").trim();
          const rawBillAmt = getFuzzyValue(row, /bill.*amount|amount|claim|value|sum/i, "Bill Amount");
          const rawPassedAmt = getFuzzyValue(row, /passed.*amount|passed|approved/i, "Passed Amount");
          const department = String(getFuzzyValue(row, /dept|office|department|section/i, "Department") || "Electrical").trim();
          const rawStatus = String(getFuzzyValue(row, /status|state|verdict/i, "Status") || "Passed").trim().toLowerCase();
          const rawPeriod = String(getFuzzyValue(row, /period|frequency|type|billing|interval/i, "Period") || "monthly").trim().toLowerCase();

          const parsedBillAmt = parseExcelAmount(rawBillAmt);
          let parsedPassedAmt = rawPassedAmt !== undefined ? parseExcelAmount(rawPassedAmt) : NaN;

          let parsedStatus: "Passed" | "Pending" | "Returned" = "Passed";
          if (rawStatus.includes("pend") || rawStatus === "pending") {
            parsedStatus = "Pending";
          } else if (rawStatus.includes("ret") || rawStatus.includes("reject") || rawStatus === "returned") {
            parsedStatus = "Returned";
          }

          if (isNaN(parsedPassedAmt)) {
            parsedPassedAmt = parsedStatus === "Passed" ? parsedBillAmt : 0;
          }

          let parsedPeriod: "monthly" | "quarterly" | "yearly" = "monthly";
          if (rawPeriod.includes("quarter") || rawPeriod === "quarterly") {
            parsedPeriod = "quarterly";
          } else if (rawPeriod.includes("year") || rawPeriod === "yearly") {
            parsedPeriod = "yearly";
          }

          const parsedDateParsed = parseExcelDate(rawDate);

          return {
            id: `co6-xls-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
            co6Number: co6Number || `CO6/2026/EL/${idx + 1}`,
            date: parsedDateParsed,
            partyName: partyName || "Spreadsheet Party",
            billAmount: parsedBillAmt,
            passedAmount: parsedPassedAmt,
            department: department || "Electrical",
            status: parsedStatus,
            period: parsedPeriod
          };
        });

        const success = await onSyncCo6s(mappedCo6s);
        if (success) {
          setMsg({
            type: "success",
            text: `Successfully synchronized ${mappedCo6s.length} CO6 bill registrations inside local ledger memory.`
          });
        } else {
          throw new Error("The backend server rejected database state synchronization.");
        }

      } catch (err: any) {
        setMsg({
          type: "error",
          text: err?.message || "Parsing error: Ensure column names align with template columns."
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Aggregated analytics
  const aggregates = useMemo(() => {
    let billTotal = 0;
    let passedTotal = 0;
    let returnedTotal = 0;
    let pendingTotal = 0;

    co6s.forEach(c => {
      // Direct sum
      billTotal += c.billAmount;
      passedTotal += c.passedAmount;
      if (c.status === "Returned") {
        returnedTotal += c.billAmount;
      } else if (c.status === "Pending") {
        pendingTotal += c.billAmount;
      }
    });

    const clearingRatio = billTotal > 0 ? (passedTotal / billTotal) * 100 : 0;

    return {
      billTotal,
      passedTotal,
      returnedTotal,
      pendingTotal,
      clearingRatio
    };
  }, [co6s]);

  // Combined filters
  const filteredCo6s = useMemo(() => {
    return co6s.filter(c => {
      const matchesSearch = c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.co6Number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [co6s, searchTerm, statusFilter]);

  return (
    <div id="co6-tab" className="space-y-6 animate-fade-in block">
      
      {/* 1. Description Banner & Actions */}
      <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" /> Accounts Payable: CO6 Bill Registrations
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            The CO6 registry logs bill claims submitted by contractors. Monitor passed amounts, pending clearing timelines, and audit returns. <strong>Review, modify, or sync contractor rosters instantly through Excel drops.</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs rounded-xl font-bold transition h-9 hover:border-slate-300"
          >
            <Download className="w-3.5 h-3.5" /> Download Template
          </button>
          
          <label className="relative flex items-center justify-center cursor-pointer px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs h-9">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            <span className="truncate">{loading ? "Uploading..." : "Upload CO6 Excel Sheet"}</span>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="hidden" 
              disabled={loading} 
            />
          </label>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 animate-fade-in text-xs ${
          msg.type === "success" 
            ? "bg-indigo-50 border-indigo-150 text-indigo-900" 
            : "bg-rose-50 border-rose-150 text-rose-900"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 2. Key Metrics & Financial Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-1">Total Bill Claim Value</span>
          <p className="text-xl font-extrabold text-[#1E293B] font-mono">₹{aggregates.billTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Full claims registered on CO6</span>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase block mb-1">Total Passed / Released</span>
          <p className="text-xl font-extrabold text-[#22C55E] font-mono">₹{aggregates.passedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Cleared by treasury officers</span>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-amber-500 tracking-widest uppercase block mb-1 font-mono">Pending Liabilities</span>
          <p className="text-xl font-extrabold text-[#EAB308] font-mono">₹{aggregates.pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Unpassed claims in stack</span>
        </div>

        <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-rose-600 tracking-widest uppercase block">Discrepancy / Return Returns</span>
            <p className="text-xl font-black text-rose-750 font-mono mt-0.5 text-rose-700">₹{aggregates.returnedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <span className="text-[9px] text-rose-500 font-bold block mt-1">Returned for compliance specs ({aggregates.clearingRatio.toFixed(1)}% safe clear rate)</span>
        </div>
      </div>

      {/* 3. Search & List Filter view container */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Tools bar */}
        <div className="p-4 border-b border-gray-150 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          
          {/* Status Tabs Selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 shrink-0 w-full sm:w-auto">
            {(["all", "Passed", "Pending", "Returned"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-lg transition capitalize whitespace-nowrap ${
                  statusFilter === s 
                    ? "bg-white text-slate-800 shadow-xs" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search CO6, party name, dept..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-gray-250 bg-white rounded-xl focus:border-indigo-600 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* List of CO6 Bills */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-150">
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reg Date</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">CO6 Reg Ref</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Party Name / Contractor</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Compliance Interval</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Claim Amount</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Passed Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredCo6s.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    <FileSpreadsheet className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    No CO6 records found matching this filter criteria. Sync a fresh CO6 Excel log sheet.
                  </td>
                </tr>
              ) : (
                filteredCo6s.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-5 font-medium text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-800 font-mono whitespace-nowrap">
                      {c.co6Number}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">{c.partyName}</td>
                    <td className="py-3.5 px-5 text-slate-400 font-bold uppercase">{c.department}</td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 uppercase">{c.period}</td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        c.status === "Passed" 
                          ? "bg-emerald-50 text-emerald-700" 
                          : c.status === "Pending" 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-rose-50 text-rose-700"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-medium text-slate-500 font-mono">
                      ₹{c.billAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-5 text-right font-bold font-mono ${c.status === 'Passed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      ₹{c.passedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
