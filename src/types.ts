export interface PoRecord {
  id: string;
  poNumber: string;
  date: string;
  agency: string;
  description: string;
  amount: number;
  period: "monthly" | "quarterly" | "yearly";
  department: string;
}

export interface Co6Record {
  id: string;
  co6Number: string;
  date: string;
  partyName: string;
  billAmount: number;
  passedAmount: number;
  department: string;
  status: "Passed" | "Pending" | "Returned";
  period: "monthly" | "quarterly" | "yearly";
}

export interface CategoryTip {
  categoryName: string;
  message: string;
  status: "warning" | "good" | "info";
}

export interface SavingsOpportunity {
  actionName: string;
  potentialSavingsMonthly: number;
  logic: string;
}

export interface ForecastPoint {
  month: string;
  projectedPoAmount: number;
  projectedCo6Amt: number;
  confidenceScore: number;
  narrative?: string;
}

export interface ForecastRecommendation {
  title: string;
  description: string;
  impactMonthly: number;
}

export interface ForecastResponse {
  horizonMonths: number;
  scenarioName: string;
  scenarioRiskFactor: string;
  overallSummary: string;
  narrativeAnalysis: string;
  forecastPoints: ForecastPoint[];
  recommendations: ForecastRecommendation[];
}

export interface AiInsightsResponse {
  overallStatus: string;
  analysisText: string;
  categoryTips: CategoryTip[];
  savingsOpportunities: SavingsOpportunity[];
}
