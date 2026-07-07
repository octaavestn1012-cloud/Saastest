"use client";

import { PublicHeader } from "@/components/features/landing/PublicHeader";
import { PublicFooter } from "@/components/features/landing/PublicFooter";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      <PublicHeader />
      
      <main className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-black mb-8">Politique de Confidentialité</h1>
        <p className="text-muted-foreground mb-12">Dernière mise à jour : 7 Juillet 2026</p>

        <div className="prose prose-lg max-w-none text-black/80 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Collecte des Données</h2>
            <p>
              Pour fournir notre service d'automatisation, Réparto collecte les données suivantes :
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Vos informations de profil (Nom, Email, Photo de profil).</li>
              <li>Vos clés API d'intégration (FedaPay, KkiaPay, etc.).</li>
              <li>L'historique des répartitions effectuées via notre plateforme (montants, numéros destinataires) pour la génération de vos rapports.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. Sécurité et Chiffrement</h2>
            <p>
              La sécurité de vos clés API est notre priorité absolue. **Toutes les clés secrètes saisies sur Réparto sont chiffrées en base de données** à l'aide d'algorithmes de cryptographie de haut niveau. 
              Même en cas d'intrusion, ces clés seraient illisibles et inutilisables sans nos protocoles internes de sécurité.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. Utilisation des Données</h2>
            <p>
              Vos données ne sont utilisées **que dans le cadre exclusif du fonctionnement du service Réparto** (déclenchement des règles de répartition, calcul des commissions, et génération de vos reçus). 
              <br /><br />
              <strong>Nous ne revendons jamais vos données à des tiers</strong> et nous ne partageons aucune information avec d'autres prestataires que nos partenaires techniques strictement nécessaires à l'hébergement et à l'envoi de vos reçus.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Vos Droits</h2>
            <p>
              Conformément à la réglementation sur la protection des données personnelles, vous disposez d'un droit d'accès, de modification et de suppression totale de vos données. 
              La suppression de votre compte depuis les paramètres entraîne l'effacement définitif de toutes vos clés et historiques.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
