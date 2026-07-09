"use client";

import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Gratuit",
    target: "Démarrer et tester.",
    price: "0",
    commission: "1,9%",
    features: [
      "1,9% de commission par répartition",
      "20 répartitions / mois maximum",
      "Plafond 500 000 FCFA / mois",
      "Jusqu'à 3 règles actives",
      "Max 3 destinataires/répartition",
      "Répartition manuelle"
    ],
    highlighted: false
  },
  {
    name: "Pro",
    target: "Choix n°1 des vendeurs",
    price: "5 000",
    commission: "0,8%",
    features: [
      "0,8% de commission (au lieu de 1,9%)",
      "Répartitions ILLIMITÉES",
      "Aucun plafond de volume",
      "Règles ILLIMITÉES",
      "Règles auto (quotidien, hebdo, etc.)",
      "Conditions avancées (SI...)",
      "Ordre de priorité + ligne \"reste\"",
      "Notifications personnalisées",
      "Destinataires illimités"
    ],
    highlighted: true
  },
  {
    name: "Business",
    target: "Pour les gros volumes.",
    price: "15 000",
    commission: "0,4%",
    features: [
      "Tout ce qui est dans Pro, PLUS :",
      "0,4% de commission (la plus basse)",
      "Rapports avancés et exports",
      "Support prioritaire",
      "Multi-utilisateurs (Bientôt)"
    ],
    highlighted: false
  }
];

export function PricingSection() {
  return (
    <section id="tarifs" className="py-24 bg-white px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-[#111]">
            Simple, transparent, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">sans surprise.</span>
          </h2>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
            Commencez gratuitement aujourd'hui. Ne payez que quand vous gagnez.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative rounded-[2.5rem] p-px ${
                plan.highlighted 
                  ? "bg-gradient-to-b from-primary via-purple-500 to-transparent shadow-[0_20px_80px_-20px_rgba(99,102,241,0.3)] scale-100 lg:scale-105 z-10" 
                  : "bg-black/[0.05]"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`relative h-full bg-white rounded-[2.5rem] p-8 flex flex-col`}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 text-white px-5 py-1.5 rounded-full text-sm font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-primary/30">
                    <Star className="w-4 h-4 fill-white" />
                    {plan.target.toUpperCase()}
                  </div>
                )}

                <div className="text-center mb-8 pt-4">
                  <h3 className="text-xl font-bold mb-2 text-[#111]">{plan.name}</h3>
                  {!plan.highlighted && (
                    <p className="text-sm text-muted-foreground font-medium mb-4">{plan.target}</p>
                  )}
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-5xl font-black tracking-tighter text-[#111]">{plan.price}</span>
                    <span className="text-muted-foreground font-bold mb-1.5">F</span>
                    <span className="text-muted-foreground font-medium text-sm mb-2">/mois</span>
                  </div>
                  <div className="inline-flex flex-col items-center mt-6">
                    <div className="bg-[#F5F5F7] px-4 py-2 rounded-xl flex items-center gap-2 border border-black/5">
                      <span className="text-sm font-semibold text-muted-foreground">Commission Réparto</span>
                      <span className="text-lg font-black text-primary">{plan.commission}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${plan.highlighted ? "bg-primary/10 text-primary" : "bg-[#F5F5F7] text-black/40"}`}>
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </div>
                      <span className="font-medium text-[15px] text-[#444] leading-tight mt-0.5">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/signup" className="w-full mt-auto">
                  <Button 
                    className={`w-full py-6 rounded-2xl font-bold text-lg transition-all ${
                      plan.highlighted 
                        ? "bg-[#111] hover:bg-black text-white shadow-xl hover:shadow-2xl hover:-translate-y-1" 
                        : "bg-[#F5F5F7] hover:bg-black/5 text-[#111] shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    Sélectionner
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
