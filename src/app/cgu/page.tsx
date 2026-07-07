"use client";

import { PublicHeader } from "@/components/features/landing/PublicHeader";
import { PublicFooter } from "@/components/features/landing/PublicFooter";

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      <PublicHeader />
      
      <main className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-black mb-8">Conditions Générales d'Utilisation (CGU)</h1>
        <p className="text-muted-foreground mb-12">Dernière mise à jour : 7 Juillet 2026</p>

        <div className="prose prose-lg max-w-none text-black/80 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation ont pour objet d'encadrer l'accès et l'utilisation du service <strong>Réparto</strong>. 
              En créant un compte sur notre plateforme, vous acceptez pleinement et sans réserve ces conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. Description du Service</h2>
            <p>
              Réparto est un SaaS (Software as a Service) d'automatisation de répartition de fonds. Le service permet à l'utilisateur de connecter ses propres clés d'API bancaires (FedaPay, KkiaPay, etc.) afin d'automatiser des virements et des répartitions financières selon des règles prédéfinies par ses soins.
            </p>
            <p className="mt-4 text-danger font-semibold">
              Attention : Réparto n'est ni une banque, ni un établissement de monnaie électronique. Réparto agit uniquement en tant qu'outil d'automatisation (interface logicielle) et ne séquestre jamais l'argent de ses utilisateurs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. Utilisation et Sécurité des Clés API</h2>
            <p>
              L'Utilisateur est seul responsable des clés API qu'il renseigne dans l'application. 
              Réparto s'engage à chiffrer (AES-256) toutes les clés secrètes stockées dans sa base de données. 
              Néanmoins, Réparto ne pourra être tenu responsable des pertes financières résultant de règles mal configurées par l'Utilisateur ou du piratage du compte FedaPay/KkiaPay d'origine de l'Utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Tarification et Commissions</h2>
            <p>
              L'utilisation du service Réparto est assujettie au paiement de frais sous forme de commission prélevée sur chaque répartition ou via un abonnement mensuel (Pro, Business). Les taux applicables (1,9%, 0,8%, 0,4%) sont clairement indiqués lors de la configuration de l'abonnement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">5. Résiliation</h2>
            <p>
              L'Utilisateur peut à tout moment résilier son compte depuis son interface d'administration. Les clés API associées seront immédiatement révoquées et supprimées de nos bases de données.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
