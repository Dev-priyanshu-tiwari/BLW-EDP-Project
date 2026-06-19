import { useState, useMemo } from "react";
import { PoRecord } from "../types";
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  Calendar, 
  Building2, 
  Clock, 
  FileCheck,
  ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";

interface PosTabProps {
  pos: PoRecord[];
  onSyncPos: (newPos: PoRecord[]) => Promise<boolean>;
}

export default function PosTab({ pos, onSyncPos }: PosTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "monthly" | "quarterly" | "yearly">("all");
  
  // Upload status and messaging state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Download sample PO CSV template matching Indian Railways Board
  const handleDownloadTemplate = () => {
    const csvContent = 
      "PO Number,Date,Agency,Description,Amount,Period,Department\n" +
      "BLW/2026/EL/101,2026-06-01,BHEL Electricals Ltd,Supply of Traction Motors & Spares for WAP7,650000.00,monthly,Electrical\n" +
      "BLW/2026/ST/102,2026-06-10,Sanjeev Signals & Cables,Varanasi Yard Signal Cabling Work,180000.00,monthly,S&T\n" +
      "BLW/2026/CIV/103,2026-05-15,L&T Infrastructure,Testing Track Bed Civil concrete upgrade,450000.00,quarterly,Civil\n" +
      "BLW/2026/MECH/104,2026-06-12,Howrah Alloy Castings,Crankshaft forging and block cylinders for locos,320000.00,monthly,Mechanical\n" +
      "BLW/2026/EL/105,2026-01-15,PowerGrid Spares Rail,Annual sub-station maintenance grid,1200000.00,yearly,Electrical";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ir_purchase_orders_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

// Helper for robust date conversion from Excel dates and common strings
function parseExcelDate(val: any): string {
  if (val === undefined || val === null) {
    return new Date().toISOString().split("T")[0];
  }
  
  // If it's already a JS Date object
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
    // Excel base date offset
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

// Helper to scrape numeric amounts (retains minus and decimal values while discarding formatting/commas/currency symbols)
function parseExcelAmount(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Find a row's key with clean regex, stripping spacing and special characters
function getFuzzyValue(row: any, regex: RegExp, defaultKey: string): any {
  const matchKey = Object.keys(row).find(k => {
    const cleanKey = k.trim().toLowerCase().replace(/[\s_-]/g, "");
    return regex.test(cleanKey);
  });
  return matchKey ? row[matchKey] : row[defaultKey];
}

  // Excel importer for PO data
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
        
        // 1. Get raw spreadsheet as a 2D grid matrix
        const rawGrid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

        if (!Array.isArray(rawGrid) || rawGrid.length === 0) {
          throw new Error("Spreadsheet contains empty sheet tables.");
        }

        // 2. Scan first 15 rows to find the official headers row (where key column patterns are detected)
        let headerRowIdx = 0;
        let maxMatches = 0;
        const targetMatchers = [
          /po|ref|number|id|procurement/i,
          /date|day|time|creation/i,
          /agency|contractor|source|supplier|company|vendor|party/i,
          /amount|val|salary|income|sum|cost/i,
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
          throw new Error("No PO records could be extracted. Please check the spreadsheet header alignment.");
        }

        const mappedPos: PoRecord[] = rawRows.map((row, idx) => {
          // Precise patterns
          const poNumber = String(getFuzzyValue(row, /po|number|id|ref|pono|procurement/i, "PO Number") || "").trim();
          const rawDate = getFuzzyValue(row, /date|day|time|creation/i, "Date");
          const agency = String(getFuzzyValue(row, /agency|contractor|source|supplier|company|vendor|party/i, "Agency") || "").trim();
          const description = String(getFuzzyValue(row, /desc|description|work|scope|item|details/i, "Description") || "").trim();
          const rawAmount = getFuzzyValue(row, /amount|val|salary|income|sum|cost/i, "Amount");
          const rawPeriod = String(getFuzzyValue(row, /period|frequency|type|billing|interval/i, "Period") || "monthly").trim().toLowerCase();
          const department = String(getFuzzyValue(row, /dept|office|department|section/i, "Department") || "Electrical").trim();

          let parsedPeriod: "monthly" | "quarterly" | "yearly" = "monthly";
          if (rawPeriod.includes("quarter") || rawPeriod === "quarterly") {
            parsedPeriod = "quarterly";
          } else if (rawPeriod.includes("year") || rawPeriod === "yearly" || rawPeriod === "annual") {
            parsedPeriod = "yearly";
          }

          const parsedAmount = parseExcelAmount(rawAmount);
          const parsedDateParsed = parseExcelDate(rawDate);

          return {
            id: `po-xls-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
            poNumber: poNumber || `PO/2026/GEN/${idx + 1}`,
            date: parsedDateParsed,
            agency: agency || "Spreadsheet Sanction",
            description: description || "Procured Materials / Services",
            amount: parsedAmount,
            period: parsedPeriod,
            department: department || "Electrical"
          };
        });

        const success = await onSyncPos(mappedPos);
        if (success) {
          setMsg({
            type: "success",
            text: `Successfully synchronized ${mappedPos.length} Purchase Order (PO) allocations into the BLW ledger.`
          });
        } else {
          throw new Error("The API server refused spreadsheet synchronization.");
        }

      } catch (err: any) {
        setMsg({
          type: "error",
          text: err?.message || "Invalid spreadsheet schema. Make sure columns map correctly."
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Grouped aggregates
  const aggregateMetrics = useMemo(() => {
    let monthlyTotal = 0;
    let quarterlyTotal = 0;
    let yearlyTotal = 0;

    pos.forEach(p => {
      if (p.period === "monthly") monthlyTotal += p.amount;
      else if (p.period === "quarterly") quarterlyTotal += p.amount;
      else if (p.period === "yearly") yearlyTotal += p.amount;
    });

    return {
      monthlyTotal,
      quarterlyTotal,
      yearlyTotal,
      normalizedEquivalent: monthlyTotal + (quarterlyTotal / 3) + (yearlyTotal / 12)
    };
  }, [pos]);

  // Filtered lists
  const filteredPos = useMemo(() => {
    return pos.filter(p => {
      const matchesSearch = p.agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPeriod = periodFilter === "all" || p.period === periodFilter;
      return matchesSearch && matchesPeriod;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [pos, searchTerm, periodFilter]);

  return (
    <div id="po-tab" className="space-y-6 animate-fade-in block">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Authorized Purchase Orders (POs) Setup
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            The PO engine records sanctioned budgets for Indian Railways contractors and vendors. Manage traction components, yard wiring, and civil specs. <strong>Streamline changes executing seamlessly via Excel board sheets upload</strong>.
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
            <span className="truncate">{loading ? "Processing..." : "Upload PO Excel Sheet"}</span>
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

      {/* 2. Structured Period Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-1">Monthly Procurement POs</span>
          <p className="text-xl font-extrabold text-[#1E293B] font-mono">₹{aggregateMetrics.monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Regular periodic approvals</span>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-1">Quarterly Contracts Sanction</span>
          <p className="text-xl font-extrabold text-[#1E293B] font-mono">₹{aggregateMetrics.quarterlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Active project components</span>
        </div>

        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase block mb-1">Annual Rolling Stock Agreements</span>
          <p className="text-xl font-extrabold text-[#1E293B] font-mono">₹{aggregateMetrics.yearlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-gray-400 mt-1 block">Amortized year-long lines</span>
        </div>

        <div className="bg-[#EEF2F6] border border-[#CBD5E1] rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase block">Monthly Capital Limit</span>
            <p className="text-xl font-black text-indigo-700 font-mono mt-0.5">₹{aggregateMetrics.normalizedEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <span className="text-[9px] text-indigo-500 font-bold block mt-1">Aggregated overall limit indicator</span>
        </div>
      </div>

      {/* 3. Filtering Tools & Data Table */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Tools bar */}
        <div className="p-4 border-b border-gray-150 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          
          {/* Tabs Filter */}
          <div className="flex bg-gray-100 rounded-xl p-1 shrink-0 w-full sm:w-auto">
            {(["all", "monthly", "quarterly", "yearly"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-lg transition capitalize whitespace-nowrap ${
                  periodFilter === p 
                    ? "bg-white text-slate-800 shadow-xs" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search PO ID, descriptions, agency..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-gray-250 bg-white rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Data Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-gray-150">
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sanction Date</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">PO Ref Number</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contracted Agency</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Description of Works</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dept</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Interval</th>
                <th className="py-3 px-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Sanction Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    <FileSpreadsheet className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    No PO sanctions matched the filters. Upload a revised Excel sheet of PO data.
                  </td>
                </tr>
              ) : (
                filteredPos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition animate-none">
                    <td className="py-3.5 px-5 font-medium text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-indigo-700 font-mono whitespace-nowrap">
                      {p.poNumber}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">{p.agency}</td>
                    <td className="py-3.5 px-5 text-gray-500 max-w-[240px] truncate" title={p.description}>
                      {p.description}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-bold uppercase">{p.department}</td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        p.period === "monthly" 
                          ? "bg-indigo-50 text-indigo-700" 
                          : p.period === "quarterly" 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-teal-50 text-teal-700"
                      }`}>
                        <Clock className="w-3" />
                        {p.period}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-[#1E293B] font-mono">
                      ₹{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
