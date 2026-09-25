export type JobStatus = "INBOX" | "SAVED" | "TRASH";
export type JobCategory = "TARGET" | "EXPLORE" | "FILTERED";
export type ParserGrade = "A" | "B" | "C";

export interface AIAnalysis {
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
  createdAt: Date | string | null;
}

export interface CompanyAnalysis {
  id: string;
  companyName: string;
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
  createdAt: Date | string;
}

export interface LocationAnalysis {
  id: string;
  rawLocation: string;
  country: string;
  createdAt: Date | string;
}

export interface Job {
  id: string; // Identifiant texte PostgreSQL, conservé tel qu’importé
  createdAt: Date | string | null;
  updatedAt?: Date | string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  country?: string | null; // Pays normalisé
  workMode?: "remote" | "hybrid" | "on-site" | null;
  salary?: string | null;
  isActiveRecruiting?: boolean;
  isEasyApply?: boolean;
  isHighMatch?: boolean | null; // Correspondance élevée
  url: string;
  logoUrl?: string | null; // URL du logo de l'entreprise
  rawString?: string;
  category: JobCategory;
  status: JobStatus;
  parserGrade: ParserGrade;
  matchedKeyword?: string | null;
  tags?: string[];
  isVisited?: boolean;
  visitedAt?: Date | string | null; // Date de visite pour persistance
  aiAnalysis?: AIAnalysis | null;
}

export type RuleField = "title" | "company" | "location" | "workMode" | "description" | "createdAt";
export type RuleOperator =
  | "equals"       // Strictement égal
  | "not_equals"   // Différent de
  | "contains"     // Contient (case insensitive)
  | "not_contains" // Ne contient pas
  | "in"           // Est dans la liste (pour enums)
  | "not_in"       // N'est pas dans la liste
  | "olderThan";   // Posté il y a N jours ou plus (createdAt)

export interface RuleCondition {
  id: string; // uuid pour gestion UI (keys)
  field: RuleField;
  operator: RuleOperator;
  value: string | string[] | number; // string pour texte, string[] pour multi-select, number pour createdAt (jours)
}

export interface SmartRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: "FILTER"; // Extensible ("TARGET", "TAG"...)
}

export interface Settings {
  _id?: string; // mongo_id conservé comme texte dans le stockage PostgreSQL
  whitelist: string[];
  blacklist: string[];
  rules: SmartRule[];
  deduplicateCrossRegion?: boolean;
  aiAnalysisEnabled?: boolean;
  updatedAt: Date | string;
}

export interface GetJobsResult {
  items: Job[];
  total: number;
}
