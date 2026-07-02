import { Rule } from "../types/domain";

export function evaluateCondition(
  rule: Rule,
  context: { amountFcfa: number }
): boolean {
  // S'il n'y a pas de condition, la règle s'applique toujours (ex: déclenchement manuel ou mensuel standard)
  if (!rule.condition) {
    return true;
  }

  // Exemple d'implémentation basique de conditions
  const condition = rule.condition as { type?: string; value?: number };

  if (condition.type === "min_amount" && condition.value !== undefined) {
    return context.amountFcfa >= condition.value;
  }

  if (condition.type === "max_amount" && condition.value !== undefined) {
    return context.amountFcfa <= condition.value;
  }

  // Par défaut, si condition non reconnue, on l'ignore (ou on la bloque selon le choix métier)
  return false;
}
