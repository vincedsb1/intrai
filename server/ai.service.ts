import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
