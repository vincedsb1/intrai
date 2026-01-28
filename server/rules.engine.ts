import { Job, SmartRule, RuleCondition, RuleOperator } from "@/lib/types";

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
  jobValue: string | null | undefined,
  targetValue: string | string[],
  operator: RuleOperator
): boolean {
  const normalizedJobValue = normalize(jobValue);

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
function getJobValue(job: Partial<Job>, field: RuleCondition["field"]): string | null | undefined {
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
