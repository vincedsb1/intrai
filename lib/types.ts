export type JobStatus = "INBOX" | "SAVED" | "TRASH";
export type JobCategory = "TARGET" | "EXPLORE" | "FILTERED";
export type ParserGrade = "A" | "B" | "C";

export interface AIAnalysis {
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
  createdAt: Date | string;
}

export interface CompanyAnalysis {
  _id?: string;
  companyName: string;
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
  createdAt: Date | string;
}

export interface LocationAnalysis {
  _id?: string;
  rawLocation: string;
  country: string;
  createdAt: Date | string;
}

export interface Job {
  id: string; // Map from _id in DB
  createdAt: Date | string;
  title: string | null;
  company: string | null;
  location: string | null;
  country?: string | null; // Pays normalisé
  workMode?: "remote" | "hybrid" | "on-site" | null;
  salary?: string | null;
  isActiveRecruiting?: boolean;
  isEasyApply?: boolean;
  isHighMatch?: boolean; // Correspondance élevée
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

export type RuleField = "title" | "company" | "location" | "workMode" | "description";
export type RuleOperator = 
  | "equals"       // Strictement égal
  | "not_equals"   // Différent de
  | "contains"     // Contient (case insensitive)
  | "not_contains" // Ne contient pas
  | "in"           // Est dans la liste (pour enums)
  | "not_in";      // N'est pas dans la liste

export interface RuleCondition {
  id: string; // uuid pour gestion UI (keys)
  field: RuleField;
  operator: RuleOperator;
  value: string | string[]; // string pour texte, string[] pour multi-select
}

export interface SmartRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: "FILTER"; // Extensible ("TARGET", "TAG"...)
}

export interface Settings {
  whitelist: string[];
  blacklist: string[];
  rules: SmartRule[];
  updatedAt: Date | string;
}