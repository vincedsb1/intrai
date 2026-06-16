import { Job, SmartRule, RuleCondition, RuleOperator } from "@/lib/types";

const INVALID_AGE = -1; // Signifie createdAt invalide/null

/**
 * Calcule l'âge d'une offre en jours (UTC), arrondi ceil (inclusif).
 * Exs: Créé à 23h59 aujourd'hui → 0 jours
 *      Créé hier → 1 jour
 * @returns Nombre entier >= 0, ou INVALID_AGE (-1) si invalide
 */
function calculateAgeInDays(createdAt: Date | string | null | undefined): number {
  if (!createdAt) return INVALID_AGE;
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalise une chaîne pour comparaison (trim, lowercase, accents)
 */
function normalize(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Compare une valeur (du job) avec une cible (de la règle) selon l'opérateur
 */
function checkCondition(
  jobValue: string | null | undefined | Date,
  targetValue: string | string[] | number,
  operator: RuleOperator
): boolean {
  // Cas spécial: opérateurs temporels
  if (operator === "olderThan") {
    if (!jobValue || typeof targetValue !== "number") return false;
    const ageInDays = calculateAgeInDays(jobValue as Date | string);
    return ageInDays >= targetValue; // Inclusif (>=)
  }

  const normalizedJobValue = normalize(jobValue as string | null | undefined);

  // Cas des opérateurs de liste (in, not_in)
  if (Array.isArray(targetValue)) {
    // Note: targetValue est supposé être un array de strings si l'opérateur est "in" ou "not_in"
    // On normalise toutes les cibles
    const normalizedTargets = targetValue.map(t => normalize(t));

    if (operator === "in") {
      return normalizedTargets.includes(normalizedJobValue);
    }
    if (operator === "not_in") {
      return !normalizedTargets.includes(normalizedJobValue);
    }
    // Fallback si array passé à mauvais opérateur
    return false;
  }

  // Cas des opérateurs scalaires (texte vs texte)
  const normalizedTarget = normalize(targetValue as string);

  switch (operator) {
    case "equals":
      return normalizedJobValue === normalizedTarget;
    case "not_equals":
      return normalizedJobValue !== normalizedTarget;
    case "contains":
      return normalizedJobValue.includes(normalizedTarget);
    case "not_contains":
      return !normalizedJobValue.includes(normalizedTarget);
    default:
      return false;
  }
}

/**
 * Extrait la valeur du champ ciblé dans le job
 */
function getJobValue(job: Partial<Job>, field: RuleCondition["field"]): string | null | undefined | Date {
  switch (field) {
    case "title":
      return job.title;
    case "company":
      return job.company;
    case "location":
      return job.location; // ou job.country ? On reste sur location brute pour l'instant
    case "workMode":
      return job.workMode;
    case "description":
      return job.rawString; // On utilise le rawString comme proxy de description pour l'instant
    case "createdAt":
      return job.createdAt;
    default:
      return null;
  }
}

/**
 * Evalue si un job correspond à une règle
 * @returns true si la règle matche (toutes conditions remplies)
 */
export function evaluateRule(job: Partial<Job>, rule: SmartRule): boolean {
  if (!rule.enabled) {
    return false;
  }

  // Logique ET : Toutes les conditions doivent être vraies
  for (const condition of rule.conditions) {
    const jobValue = getJobValue(job, condition.field);
    const isMatch = checkCondition(jobValue, condition.value, condition.operator);

    if (!isMatch) {
      return false; // Une condition a échoué
    }
  }

  return true; // Toutes conditions validées
}
