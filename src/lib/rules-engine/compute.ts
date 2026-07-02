import { RuleTarget } from "../types/domain";

export interface ComputeResult {
  totalAmountFcfa: number;
  commissionAmountFcfa: number;
  lines: {
    targetId: string;
    amountFcfa: number;
    isRemainder: boolean;
  }[];
  unallocatedFcfa: number; // Argent non réparti si pas de cible "reste"
}

export function computeRepartition(
  totalAmountFcfa: number,
  commissionRateBps: number,
  targets: RuleTarget[]
): ComputeResult {
  if (totalAmountFcfa <= 0) {
    return {
      totalAmountFcfa: 0,
      commissionAmountFcfa: 0,
      lines: [],
      unallocatedFcfa: 0,
    };
  }

  // 1. Calcul de la commission (arrondi à l'entier le plus proche)
  const commissionAmountFcfa = Math.round((totalAmountFcfa * commissionRateBps) / 10000);
  
  // 2. Montant disponible pour la répartition
  let currentDistributable = totalAmountFcfa - commissionAmountFcfa;
  const initialDistributable = currentDistributable;

  if (currentDistributable <= 0) {
    return {
      totalAmountFcfa,
      commissionAmountFcfa,
      lines: [],
      unallocatedFcfa: 0,
    };
  }

  // 3. Trier les cibles par position
  const sortedTargets = [...targets].sort((a, b) => a.position - b.position);
  
  // Séparer le reste
  const standardTargets = sortedTargets.filter(t => !t.isRemainder);
  const remainderTarget = sortedTargets.find(t => t.isRemainder);

  const lines: ComputeResult["lines"] = [];

  // 4. Calcul des allocations standards
  for (const target of standardTargets) {
    let alloc = 0;
    
    if (target.mode === "fixed_amount") {
      alloc = target.value;
    } else if (target.mode === "percentage") {
      // Le pourcentage s'applique sur le montant distribuable initial (avant soustraction des montants fixes)
      alloc = Math.round((initialDistributable * target.value) / 100);
    }

    // On ne peut pas distribuer plus que ce qu'il reste
    if (alloc > currentDistributable) {
      alloc = currentDistributable;
    }

    if (alloc > 0) {
      lines.push({
        targetId: target.id,
        amountFcfa: alloc,
        isRemainder: false,
      });
      currentDistributable -= alloc;
    }

    if (currentDistributable <= 0) break;
  }

  // 5. Allocation du reste
  let unallocatedFcfa = currentDistributable;
  if (remainderTarget && currentDistributable > 0) {
    lines.push({
      targetId: remainderTarget.id,
      amountFcfa: currentDistributable,
      isRemainder: true,
    });
    unallocatedFcfa = 0;
  }

  return {
    totalAmountFcfa,
    commissionAmountFcfa,
    lines,
    unallocatedFcfa,
  };
}
