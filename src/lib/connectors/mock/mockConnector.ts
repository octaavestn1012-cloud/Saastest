import { ComputeResult } from "../../rules-engine/compute";

export interface PayoutSimulationResult {
  success: boolean;
  failedTargetIds: string[]; // Cibles pour lesquelles le virement a échoué
}

export async function simulatePayout(
  computeResult: ComputeResult,
  shouldSimulatePartialFailure: boolean = false
): Promise<PayoutSimulationResult> {
  // Simuler une latence réseau (1.5s à 3s)
  const delay = Math.random() * 1500 + 1500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (shouldSimulatePartialFailure && computeResult.lines.length > 0) {
    // Fait échouer la première ligne de paiement intentionnellement pour tester le statut "partially_failed"
    return {
      success: false,
      failedTargetIds: [computeResult.lines[0].targetId],
    };
  }

  return {
    success: true,
    failedTargetIds: [],
  };
}
