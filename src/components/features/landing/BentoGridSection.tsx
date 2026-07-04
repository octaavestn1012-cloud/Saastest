"use client";

import { motion } from "framer-motion";
import { Zap, Shield, SplitSquareHorizontal, ArrowRightLeft } from "lucide-react";

const features = [
  {
    title: "100% Automatique",
    description: "Une fois configuré, vous n'avez plus rien à faire. Chaque dépôt est détecté et réparti instantanément vers vos poches.",
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    className: "md:col-span-2 bg-[#FAFAFA] border border-black/5",
  },
  {
    title: "Sécurité Absolue",
    description: "L'argent ne s'arrête jamais chez nous. Il transite directement vers vos destinataires.",
    icon: <Shield className="w-6 h-6 text-emerald-500" />,
    className: "md:col-span-1 bg-[#FAFAFA] border border-black/5",
  },
  {
    title: "Flexibilité Totale",
    description: "Répartissez en pourcentage (50%) ou en montant fixe (10 000 F) selon la logique qui vous convient.",
    icon: <SplitSquareHorizontal className="w-6 h-6 text-purple-500" />,
    className: "md:col-span-1 bg-[#FAFAFA] border border-black/5",
  },
  {
    title: "Interopérabilité Mobile",
    description: "Compatible FedaPay, MTN Mobile Money, Moov Money et Celtiis. Payez d'où vous voulez, vers où vous voulez.",
    icon: <ArrowRightLeft className="w-6 h-6 text-blue-500" />,
    className: "md:col-span-2 bg-[#FAFAFA] border border-black/5",
  },
];

export function BentoGridSection() {
  return (
    <section id="comment-ca-marche" className="py-32 px-4 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight mb-6">
            La puissance d'une infrastructure financière, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">sans la complexité.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Oubliez les transferts manuels et les calculs d'apothicaire à chaque fin de mois. Réparto agit comme votre routeur d'argent personnel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-[2rem] p-8 sm:p-10 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all ${feature.className}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-black mb-3">{feature.title}</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">{feature.description}</p>
              
              {/* Subtle hover effect background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
