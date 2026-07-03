"use client";

import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Gratuit",
    target: "Pour tester et démarrer",
    price: "0",
    commission: "1,9%",
    features: [
      "1 Règle de répartition",
      "Jusqu'à 3 destinataires",
      "Déclenchement manuel",
      "Support par email"
    ],
    highlighted: false
  },
  {
    name: "Pro",
    target: "Choix n°1 des vendeurs",
    price: "5 000",
    commission: "0,8%",
    features: [
      "Règles illimitées",
      "Destinataires illimités",
      "Règles conditionnelles (SI... ALORS...)",
      "Déclenchement automatique",
      "Support prioritaire WhatsApp"
    ],
    highlighted: true
  },
  {
    name: "Business",
    target: "Pour les gros volumes",
    price: "15 000",
    commission: "0,4%",
    features: [
      "Toutes les fonctions Pro",
      "Multi-comptes d'encaissement",
      "API Développeur",
      "Accompagnement dédié",
      "Rapports comptables avancés"
    ],
    highlighted: false
  }
];

export function PricingSection() {
  return (
    <section id="tarifs" className="py-24 bg-white px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Un plan pour chaque étape de ta croissance.
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Commence gratuitement. Change de plan à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative bg-white rounded-[2.5rem] p-8 border ${
                plan.highlighted 
                  ? "border-primary shadow-2xl scale-100 lg:scale-105 z-10" 
                  : "border-black/10 shadow-sm"
              } flex flex-col`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-md">
                  <Star className="w-4 h-4 fill-white" />
                  {plan.target}
                </div>
              )}

              <div className="text-center mb-8 pt-4">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                {!plan.highlighted && (
                  <p className="text-sm text-muted-foreground font-medium mb-4">{plan.target}</p>
                )}
                <div className="flex items-end justify-center gap-1 mb-2">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground font-bold mb-1">FCFA</span>
                  <span className="text-muted-foreground font-medium text-sm mb-1.5">/mois</span>
                </div>
                <div className="inline-block bg-[#F5F5F7] px-4 py-2 rounded-xl mt-4">
                  <span className="text-sm font-semibold text-muted-foreground">Commission : </span>
                  <span className="text-lg font-black text-black">{plan.commission}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.highlighted ? "bg-primary/20 text-primary" : "bg-black/5 text-black"}`}>
                      <Check className="w-3 h-3 font-bold" />
                    </div>
                    <span className="font-medium text-[15px]">{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="/login" className="w-full">
                <Button 
                  className={`w-full py-6 rounded-2xl font-bold text-lg transition-all ${
                    plan.highlighted 
                      ? "bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5" 
                      : "bg-[#F5F5F7] hover:bg-black/5 text-black"
                  }`}
                >
                  Commencer
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
