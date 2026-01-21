export type JobStatus = "INBOX" | "SAVED" | "TRASH";
export type JobCategory = "TARGET" | "EXPLORE" | "FILTERED";
export type ParserGrade = "A" | "B" | "C";

export interface AIAnalysis {
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
  createdAt: Date;
}

export interface Job {
  id: string; // Map from _id in DB
  createdAt: Date;
  title: string | null;
  company: string | null;
  location: string | null;
  workMode?: "remote" | "hybrid" | "on-site" | null;
  salary?: string | null;
  isActiveRecruiting?: boolean;
  isEasyApply?: boolean;
  url: string;
  logoUrl?: string | null; // URL du logo de l'entreprise
  rawString?: string;
  category: JobCategory;
  status: JobStatus;
  parserGrade: ParserGrade;
  matchedKeyword?: string | null;
  tags?: string[];
  isVisited?: boolean;
  visitedAt?: Date | null; // Date de visite pour persistance
  aiAnalysis?: AIAnalysis | null;
}

export interface Settings {
  whitelist: string[];
  blacklist: string[];
  updatedAt: Date;
}
