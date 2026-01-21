import OpenAI from "openai";
import { getDb } from "@/lib/mongo";
import { CompanyAnalysis, AIAnalysis } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function resolveCompanyAnalyses(companies: (string | null)[]): Promise<Map<string, AIAnalysis>> {
  const db = await getDb();
  const analysesCollection = db.collection<CompanyAnalysis>("company_analyses");
  
  // 1. Nettoyage et déduplication des noms d'entreprises
  const uniqueCompanies = Array.from(new Set(
    companies
      .filter((c): c is string => !!c && c.trim().length > 0)
      .map(c => c.trim())
  ));

  if (uniqueCompanies.length === 0) return new Map();

  const resultsMap = new Map<string, AIAnalysis>();

  // 2. Récupération du Cache (DB)
  const existingAnalyses = await analysesCollection.find({
    companyName: { $in: uniqueCompanies }
  }).toArray();

  const foundCompanies = new Set<string>();
  
  existingAnalyses.forEach(analysis => {
    resultsMap.set(analysis.companyName, {
      isPlatformOrAgency: analysis.isPlatformOrAgency,
      type: analysis.type,
      reason: analysis.reason,
      createdAt: analysis.createdAt
    });
    foundCompanies.add(analysis.companyName);
  });

  // 3. Identification des manquants
  const missingCompanies = uniqueCompanies.filter(c => !foundCompanies.has(c));

  if (missingCompanies.length === 0) {
    return resultsMap;
  }

  // 4. Appel IA Batch (seulement pour les manquants)
  console.log(`[AI Batch] Analyzing ${missingCompanies.length} new companies:`, missingCompanies);
  const newAnalyses = await analyzeCompaniesBatch(missingCompanies);

  // 5. Sauvegarde et mise à jour de la Map
  if (newAnalyses.length > 0) {
    await analysesCollection.insertMany(newAnalyses.map(a => ({
      companyName: a.company,
      isPlatformOrAgency: a.isPlatformOrAgency,
      type: a.type,
      reason: a.reason,
      createdAt: new Date()
    })));

    newAnalyses.forEach(a => {
      resultsMap.set(a.company, {
        isPlatformOrAgency: a.isPlatformOrAgency,
        type: a.type,
        reason: a.reason,
        createdAt: new Date()
      });
    });
  }

  return resultsMap;
}

interface BatchAnalysisResult {
  company: string;
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
}

async function analyzeCompaniesBatch(companies: string[]): Promise<BatchAnalysisResult[]> {
  const prompt = `Analyses la liste des entreprises suivantes et détermine pour chacune si c'est une ESN/Cabinet/Plateforme ou un Client Final.

Liste : ${JSON.stringify(companies)}

Réponds UNIQUEMENT avec ce JSON exact :
{
  "results": [
    {
      "company": "Nom Exact de la liste",
      "isPlatformOrAgency": boolean,
      "type": "Entreprise Finale" | "ESN" | "Cabinet de Recrutement" | "Plateforme Freelance",
      "reason": "Explication courte (max 10 mots)"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return (parsed.results || []) as BatchAnalysisResult[];
  } catch (error) {
    console.error("AI Batch Analysis error:", error);
    return [];
  }
}

export async function analyzeJobAuthor(title: string, company: string) {
  const prompt = `Analyses cette offre d'emploi et détermine si l'auteur est une entreprise finale ou un intermédiaire (ESN, Cabinet de recrutement, Plateforme).
  
  Titre: ${title}
  Entreprise: ${company}

  Réponds uniquement au format JSON suivant :
  {
    "isPlatformOrAgency": boolean,
    "type": "Entreprise Finale" | "ESN" | "Cabinet de Recrutement" | "Plateforme",
    "reason": "Une explication courte en une phrase"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Économique et rapide pour ce genre d'analyse
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");

    return JSON.parse(content);
  } catch (error) {
    console.error("AI Analysis error:", error);
    // Fallback en cas d'erreur
    return {
      isPlatformOrAgency: false,
      type: "Analyse impossible",
      reason: "L'IA n'a pas pu répondre."
    };
  }
}
