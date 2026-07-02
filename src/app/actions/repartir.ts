"use server";

import { revalidatePath } from "next/cache";
import { getUserRules } from "@/lib/data/rules";
import { createExecution } from "@/lib/data/executions";
import { computeRepartition } from "@/lib/rules-engine/compute";
import { generateIdempotencyKey } from "@/lib/rules-engine/idempotency";
import { simulatePayout } from "@/lib/connectors/mock/mockConnector";
import { RepartitionExecution, ExecutionLine } from "@/lib/types/domain";

export async function executeRepartitionAction(amountFcfa: number) {
  const userId = "usr_123"; // Utilisateur simulé
  const rules = await getUserRules(userId);
  
  // Dans la réalité, on choisirait la règle applicable ou la règle par défaut
  const activeRule = rules.find(r => r.status === "active");
  if (!activeRule) {
    throw new Error("Aucune règle active trouvée");
  }

  // 1. Calcul
  const computeResult = computeRepartition(amountFcfa, 100, activeRule.targets);

  // 2. Création de l'exécution (statut processing)
  const executionId = `exec_${Date.now()}`;
  const execution: RepartitionExecution = {
    id: executionId,
    userId,
    ruleId: activeRule.id,
    triggerSource: "manual",
    status: "processing",
    idempotencyKey: generateIdempotencyKey(userId, activeRule.id, []),
    sourceEntryIds: [],
    totalAmountFcfa: amountFcfa,
    commissionAmountFcfa: computeResult.commissionAmountFcfa,
    commissionRateBpsSnapshot: 100,
    planIdSnapshot: "starter",
    confirmedAt: new Date().toISOString(),
    confirmedBy: userId,
  };

  // 3. Simuler l'appel à l'agrégateur
  // On provoque une erreur partielle aléatoirement 1 fois sur 3 pour la démo
  const shouldSimulateFailure = Math.random() > 0.6;
  const payoutResult = await simulatePayout(computeResult, shouldSimulateFailure);

  // 4. Mise à jour du statut final
  execution.status = payoutResult.success ? "completed" : "partially_failed";
  
  await createExecution(execution);
  
  revalidatePath("/dashboard");
  revalidatePath("/historique");

  return { success: true, executionId, status: execution.status };
}
