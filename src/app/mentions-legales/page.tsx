"use client";

import { PublicHeader } from "@/components/features/landing/PublicHeader";
import { PublicFooter } from "@/components/features/landing/PublicFooter";

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans">
      <PublicHeader />
      
      <main className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-black mb-8">Mentions Légales</h1>
        <p className="text-muted-foreground mb-12">Dernière mise à jour : 7 Juillet 2026</p>

        <div className="prose prose-lg max-w-none text-black/80 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-black mb-4">1. Éditeur du site</h2>
            <p>
              Le site <strong>Réparto</strong> est édité par :<br /><br />
              <strong>Nom de l'entreprise :</strong> Réparto SAS (en cours d'immatriculation)<br />
              <strong>Email de contact :</strong> contact@reparto.app<br />
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">2. Hébergement</h2>
            <p>
              Le site et la base de données de Réparto sont hébergés sur des serveurs Cloud internationaux hautement sécurisés, garantissant la disponibilité continue du service et la protection de vos données.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">3. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu présent sur le site Réparto (textes, images, logos, éléments graphiques, code source) est la propriété exclusive de l'éditeur du site ou fait l'objet d'une autorisation d'utilisation. 
              Toute reproduction, distribution, modification ou utilisation, même partielle, de ces éléments est strictement interdite sans l'accord préalable écrit de l'éditeur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4">4. Avertissement</h2>
            <p>
              Réparto fournit un outil logiciel (SaaS) d'automatisation. Réparto n'a pas le statut d'établissement bancaire, de monnaie électronique ou de service de paiement. 
              Les flux financiers transitent exclusivement via les prestataires de paiement tiers (FedaPay, KkiaPay, etc.) choisis et configurés par l'utilisateur.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
