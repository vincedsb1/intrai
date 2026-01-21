import * as cheerio from "cheerio";

export interface ParsedJob {
  url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  workMode: "remote" | "hybrid" | "on-site" | null;
  salary: string | null;
  isActiveRecruiting: boolean;
  isEasyApply: boolean;
  isHighMatch: boolean;
  logoUrl: string | null;
  rawString: string;
  parserGrade: "A" | "B" | "C";
}

export interface ParsedEmailResult {
  jobs: ParsedJob[];
  source: "LINKEDIN_HTML" | "GENERIC_TEXT";
}

export function parseEmail(
  subject: string,
  plainBody: string,
  htmlBody: string
): ParsedEmailResult {
  // 1. Détection de stratégie : Est-ce une alerte LinkedIn avec HTML riche ?
  // On cherche des marqueurs spécifiques LinkedIn dans le HTML
  if (htmlBody && (htmlBody.includes("linkedin.com") || htmlBody.includes("licdn.com"))) {
    const jobs = parseLinkedInHTML(htmlBody);
    if (jobs.length > 0) {
      return { jobs, source: "LINKEDIN_HTML" };
    }
  }

  // 2. Fallback : Stratégie texte générique (1 Email = 1 Job)
  const urlRegex = /(https?:\/\/[^\s>)"'!,]+)/g;
  const urlsInPlain = plainBody.match(urlRegex) || [];
  const urlsInHtml = htmlBody.match(urlRegex) || [];
  const allUrls = [...urlsInPlain, ...urlsInHtml].filter(u => 
    !u.includes("unsubscribe") && 
    !u.includes("cloudmailin")
  );
  const url = allUrls[0] || "";

  const cleanSubject = subject.replace(/^(Fwd:|Tr:|Re:|\[.*?\])\s*/i, "").trim();
  const rawString = `${cleanSubject} - ${plainBody.substring(0, 5000)}`.trim();

  let title = cleanSubject;
  let company: string | null = null;
  const atMatch = title.match(/(.+) (?:chez|at|@) (.+)/i);
  if (atMatch) {
    title = atMatch[1].trim();
    company = atMatch[2].trim();
  }

  let parserGrade: "A" | "B" | "C" = url ? (company ? "A" : "B") : "C";

  return {
    jobs: [{
      url,
      title,
      company,
      location: "Email Import",
      workMode: null,
      salary: null,
      isActiveRecruiting: false,
      isEasyApply: false,
      isHighMatch: false,
      logoUrl: null,
      rawString,
      parserGrade
    }],
    source: "GENERIC_TEXT"
  };
}

function parseLinkedInHTML(html: string): ParsedJob[] {
  const $ = cheerio.load(html);
  const jobs: ParsedJob[] = [];

  // Stratégie : On cherche les logos d'entreprise comme ancrage
  $('img[src*="media.licdn.com/dms/image"]').each((_, img) => {
    try {
      const $img = $(img);
      let logoUrl = $img.attr('src') || null;
      const company = $img.attr('alt') || "Inconnu";

      // Nettoyage URL Logo : Gmail/GoogleProxy wrapper
      // Si l'URL contient le proxy Google, on extrait la partie après le '#'
      if (logoUrl && logoUrl.includes("googleusercontent.com") && logoUrl.includes("#")) {
        const parts = logoUrl.split("#");
        if (parts.length > 1) {
          logoUrl = parts[1];
        }
      }
      
      // Décodage des entités HTML (ex: &amp; -> &) pour que l'URL soit valide
      if (logoUrl) {
        logoUrl = logoUrl.replace(/&amp;/g, "&");
      }

      // On remonte au parent <td> puis <tr> pour trouver le contexte
      const $row = $img.closest('tr');
      const $detailsCell = $row.find('td').eq(1); // La cellule d'à côté

      // Dans cette cellule de détails, on cherche les liens
      const $links = $detailsCell.find('a');
      
      let title = null;
      let url = "";
      
      if ($links.length > 0) {
        const $titleLink = $links.first();
        // On prend le texte, mais on nettoie les retours à la ligne et espaces multiples
        let rawTitle = $titleLink.text().replace(/\s+/g, " ").trim();
        
        // Souvent le titre contient "Title Company Location" collés
        // On va essayer de le couper proprement si on retrouve le nom de la boite ou le lieu
        // Ex: "Frontend Developer Twine · Espace..."
        // Une heuristique simple : couper avant le nom de la boite si présent en fin de chaîne
        // Ou mieux : couper avant le caractère "·" ou les parenthèses de lieu
        
        // 1. Couper avant "·" (séparateur LinkedIn classique)
        if (rawTitle.includes("·")) {
           rawTitle = rawTitle.split("·")[0].trim();
        }
        
        // 2. Si le titre finit par le nom de la boite (ex: "Dev React Twine"), on l'enlève
        // Attention aux faux positifs.
        // On va plutôt se fier au fait que LinkedIn met souvent le titre dans un <strong> ou au début.
        // Regardons si on peut cleaner via le nom de la boite.
        if (company && company !== "Inconnu" && rawTitle.endsWith(company)) {
            rawTitle = rawTitle.substring(0, rawTitle.length - company.length).trim();
        }

        title = rawTitle;
        url = $titleLink.attr('href') || "";
        
        if (url.includes('?')) {
           const match = url.match(/(.*jobs\/view\/\d+\/)/);
           if (match) url = match[1];
        }
      }

      const fullText = $detailsCell.text().replace(/\s+/g, " ").trim();
      
      // Extraction des métadonnées (Lieu, Mode, Tags, Salaire)
      // Structure typique: "Company · Lieu (Mode) Tags... Salaire..."
      
      let location = null;
      let workMode: "remote" | "hybrid" | "on-site" | null = null;
      let isActiveRecruiting = false;
      let isEasyApply = false;
      let isHighMatch = false;
      let salary = null;

      // 1. On isole la partie après le "·" (séparateur Company / Reste)
      let metaString = fullText;
      if (fullText.includes("·")) {
        const parts = fullText.split("·");
        metaString = parts.slice(1).join("·").trim();
      } else if (company && company !== "Inconnu" && fullText.startsWith(company)) {
        metaString = fullText.substring(company.length).trim();
      }

      // 2. Extraction des Flags (Booléens)
      if (metaString.includes("Recrutement actif")) {
        isActiveRecruiting = true;
        metaString = metaString.replace("Recrutement actif", "").trim();
      }
      if (metaString.includes("Candidature simplifiée")) {
        isEasyApply = true;
        metaString = metaString.replace("Candidature simplifiée", "").trim();
      }
      if (metaString.includes("Correspondance des expériences élevée") || metaString.includes("High profile match")) {
        isHighMatch = true;
        metaString = metaString.replace("Correspondance des expériences élevée", "").replace("High profile match", "").trim();
      }

      // 3. Extraction Mode de travail (Entre parenthèses)
      const modeMatch = metaString.match(/\((À distance|Hybride|Sur site)\)/i);
      if (modeMatch) {
        const rawMode = modeMatch[1].toLowerCase();
        if (rawMode.includes("distance")) workMode = "remote";
        else if (rawMode.includes("hybride")) workMode = "hybrid";
        else if (rawMode.includes("site")) workMode = "on-site";
        
        // On enlève le mode de la chaîne pour isoler le lieu
        metaString = metaString.replace(modeMatch[0], "").trim();
      }

      // 4. Extraction Salaire (Regex heuristique)
      // Ex: "Entre 80 k $US et 125 k $US par an"
      // On cherche un pattern avec des chiffres et une devise ou 'k'
      // Cette regex est permissive mais tente de capturer un bloc "salaire"
      const salaryRegex = /(?:€|\$|EUR|USD|£).*\d|\d.*(?:€|\$|EUR|USD|£|k ).*(?:an|mois|jour|year|month|day)/i;
      const salaryMatch = metaString.match(salaryRegex);
      if (salaryMatch) {
        salary = salaryMatch[0].trim();
        metaString = metaString.replace(salaryMatch[0], "").trim();
      }

      // 5. Ce qu'il reste est le Lieu
      // On nettoie les tirets ou espaces résiduels
      location = metaString.replace(/^[-–—]\s*/, "").trim();

      if (title && url) {
        jobs.push({
          url,
          title,
          company,
          location,
          workMode,
          salary,
          isActiveRecruiting,
          isEasyApply,
          isHighMatch,
          logoUrl,
          rawString: fullText,
          parserGrade: "A"
        });
      }
    } catch (err) {
      console.error("Error parsing a job item:", err);
    }
  });

  return jobs;
}
