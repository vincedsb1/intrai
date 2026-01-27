import OpenAI from "openai";
import { withMongo } from "@/lib/mongo";
import { CompanyAnalysis, AIAnalysis, LocationAnalysis } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function resolveCompanyAnalyses(companies: (string | null)[]): Promise<Map<string, AIAnalysis>> {
  return await withMongo(async (db) => {
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
  });
}

export async function resolveLocationAnalyses(locations: (string | null)[]): Promise<Map<string, string>> {
  return await withMongo(async (db) => {
    const analysesCollection = db.collection<LocationAnalysis>("location_analyses");
    
    // 1. Nettoyage
    const uniqueLocations = Array.from(new Set(
      locations
        .filter((l): l is string => !!l && l.trim().length > 0)
        .map(l => l.trim())
    ));

    if (uniqueLocations.length === 0) return new Map();

    const resultsMap = new Map<string, string>();

    // 2. Cache
    const existingAnalyses = await analysesCollection.find({
      rawLocation: { $in: uniqueLocations }
    }).toArray();

    const foundLocations = new Set<string>();
    
    existingAnalyses.forEach(analysis => {
      resultsMap.set(analysis.rawLocation, analysis.country);
      foundLocations.add(analysis.rawLocation);
    });

    // 3. Manquants
    const missingLocations = uniqueLocations.filter(l => !foundLocations.has(l));

    if (missingLocations.length === 0) {
      return resultsMap;
    }

    // 4. IA Batch
    console.log(`[AI Batch] Analyzing ${missingLocations.length} new locations:`, missingLocations);
    const newAnalyses = await analyzeLocationsBatch(missingLocations);

    // 5. Sauvegarde
    if (newAnalyses.length > 0) {
      await analysesCollection.insertMany(newAnalyses.map(a => ({
        rawLocation: a.raw,
        country: a.country,
        createdAt: new Date()
      })));

      newAnalyses.forEach(a => {
        resultsMap.set(a.raw, a.country);
      });
    }

    return resultsMap;
  });
}

interface BatchAnalysisResult {
  company: string;
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
}

async function analyzeCompaniesBatch(companies: string[]): Promise<BatchAnalysisResult[]> {
  const prompt = `Analyses la liste des entreprises suivantes et détermine pour chacune si c'est un Intermédiaire (ESN, Cabinet, Plateforme de freelance) ou une Entreprise Finale (Client qui recrute pour son propre produit/service).

Liste : ${JSON.stringify(companies)}

Définitions :
- "Entreprise Finale" : Recrute pour elle-même, édite son propre logiciel/produit (ex: Google, Kraken, Qonto, Startups SaaS).
- "ESN" : Entreprise de Services Numériques (ex: Capgemini, Sopra).
- "Cabinet de Recrutement" : Chasseur de tête (ex: Michael Page).
- "Plateforme Freelance" : Marketplace de mise en relation (ex: Malt, Toptal, Upwork).

Réponds UNIQUEMENT avec ce JSON exact :
{
  "results": [
    {
      "company": "Nom Exact",
      "isPlatformOrAgency": boolean (true si ESN/Cabinet/Plateforme, false si Entreprise Finale),
      "type": "Entreprise Finale" | "ESN" | "Cabinet de Recrutement" | "Plateforme Freelance",
      "reason": "Explication courte"
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

interface LocationBatchResult {
  raw: string;
  country: string;
}

async function analyzeLocationsBatch(locations: string[]): Promise<LocationBatchResult[]> {
  const prompt = `Normalise la liste des localisations suivantes en Pays (en Français).

Règles :
- Ville/Région -> Pays (ex: "Nantes" -> "France", "Texas" -> "États-Unis").
- "Union européenne", "EMEA", "Monde", "Global" -> "International".
- "Remote", "À distance", "Télétravail" (seuls) -> "International" (si pas de lieu précis).
- Si ambigu ou non géographique -> "Autre".

Liste : ${JSON.stringify(locations)}

Réponds UNIQUEMENT avec ce JSON exact :
{
  "results": [
    { "raw": "Nom Brut", "country": "Pays Normalisé" }
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
    return (parsed.results || []) as LocationBatchResult[];
  } catch (error) {
    console.error("AI Location Batch Error:", error);
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
