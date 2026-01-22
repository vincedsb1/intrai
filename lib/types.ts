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

export interface Settings {
  whitelist: string[];
  blacklist: string[];
  updatedAt: Date | string;
}
