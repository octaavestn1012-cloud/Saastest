import { test, expect } from '@playwright/test';

test.describe('Flux de Répartition', () => {
  test('devrait pouvoir lancer une répartition depuis le dashboard', async ({ page }) => {
    // 1. Navigation vers le dashboard (qui est l'accueil par défaut)
    await page.goto('/');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Vérifier la présence du bouton de répartition
    const repartirBtn = page.getByRole('button', { name: /Répartir maintenant/i });
    await expect(repartirBtn).toBeVisible();

    // 3. Cliquer pour aller sur la page de répartition
    await repartirBtn.click();
    await expect(page).toHaveURL(/.*repartir/);

    // 4. Vérifier l'aperçu avant exécution
    await expect(page.getByText('150 000 FCFA')).toBeVisible();
    await expect(page.getByText('Commission Réparto')).toBeVisible();

    // 5. Lancer la répartition
    const confirmBtn = page.getByRole('button', { name: /Confirmer et envoyer/i });
    await confirmBtn.click();

    // 6. Vérifier l'état de chargement
    await expect(confirmBtn).toBeDisabled();

    // 7. Vérifier le résultat (soit succès soit succès partiel selon le mock)
    // On attend l'apparition de l'un des deux textes possibles (Succès ou Partiel)
    await expect(
      page.getByRole('heading', { name: /Répartition réussie !|Répartition partielle/i })
    ).toBeVisible({ timeout: 10000 });

    // 8. Cliquer sur "Voir l'historique"
    await page.getByRole('button', { name: /Voir l'historique/i }).click();
    await expect(page).toHaveURL(/.*historique/);

    // 9. Vérifier que la nouvelle transaction apparait dans l'historique
    // Comme le mock génère une transaction avec triggerSource = 'manual', on vérifie sa présence
    await expect(page.getByText('manual').first()).toBeVisible();
  });
});
