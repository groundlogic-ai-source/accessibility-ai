export interface ViolationItem {
  id: string;
  wcagCriterion: string;
  issue: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  elementDescription: string;
  suggestedFix: string;
  source: "axe" | "vision";
  impact?: string;
  helpUrl?: string;
}

export interface ScanResult {
  scanId: string;
  url: string;
  timestamp: string;
  totalViolations: number;
  violationsBySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  violations: ViolationItem[];
  pagesScanned: number;
  estimatedFixTime: string;
}

export interface FixSuggestion {
  violationId: string;
  wcagCriterion: string;
  issue: string;
  before: string;
  after: string;
  explanation: string;
  caveats: string;
}

export interface FixResult {
  scanId: string;
  fixes: FixSuggestion[];
  copyPasteSummary: string;
}

export interface VpatCriterion {
  criterion: string;
  name: string;
  level: "A" | "AA" | "AAA";
  description: string;
  axeRules: string[];
  category: string;
  clause?: string;
}

export interface VpatCriterionResult {
  criterion: string;
  name: string;
  level: string;
  conformanceLevel: "Supports" | "Partially Supports" | "Does Not Support" | "Not Applicable" | "Not Evaluated";
  remarksAndExplanations: string;
}

export interface VpatSection {
  clause: string;
  title: string;
  criteria: VpatCriterionResult[];
  notes?: string;
}

export interface VpatReport {
  reportId: string;
  scanId: string;
  productName: string;
  productVersion: string;
  companyName: string;
  contactEmail: string;
  evaluationDate: string;
  notes: string;
  overallConformancePercentage: number;
  sections: VpatSection[];
}

export interface ReVerifyResult {
  scanId: string;
  originalScanId: string;
  url: string;
  timestamp: string;
  originalViolations: number;
  currentViolations: number;
  resolved: ViolationItem[];
  persisting: ViolationItem[];
  newViolations: ViolationItem[];
  improvementPercentage: number;
  summary: string;
}
