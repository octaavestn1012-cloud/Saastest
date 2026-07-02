export function generateIdempotencyKey(
  userId: string,
  ruleId: string,
  entryIds: string[]
): string {
  // Une clé unique par utilisateur, par règle et pour un ensemble d'entrées
  // Cela garantit qu'on ne répartit pas deux fois les mêmes entrées pour la même règle
  const sortedEntries = [...entryIds].sort().join("-");
  return `${userId}-${ruleId}-${sortedEntries}`;
}
