"use client";

import { motion } from "framer-motion";
import { Coffee, Brain, ShieldCheck, FileText } from "lucide-react";

const benefits = [
  {
    title: "Tranquillité d'esprit",
    description: "Ne pense plus à gérer ton argent, on le fait. Concentre-toi sur ton business ou ta vie.",
    icon: Coffee,
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    title: "Discipline automatique",
    description: "Épargne et réinvestis sans effort de volonté. La règle est fixée, elle est respectée.",
    icon: Brain,
    color: "bg-primary",
    bgColor: "bg-primary/10"
  },
  {
    title: "Tu gardes le contrôle",
    description: "Aperçu avant chaque envoi, tu peux confirmer manuellement si tu préfères.",
    icon: ShieldCheck,
    color: "bg-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    title: "Transparence totale",
    description: "Chaque répartition génère un reçu détaillé. Tu sais exactement où va chaque franc.",
    icon: FileText,
    color: "bg-purple-500",
    bgColor: "bg-purple-500/10"
  }
];

export function BenefitsSection() {
  return (
    <section className="py-24 bg-[#F5F5F7] px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Pourquoi tu vas adorer Réparto
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-[2rem] p-8 sm:p-10 border border-black/5 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`w-16 h-16 rounded-2xl ${benefit.bgColor} ${benefit.color.replace('bg-', 'text-')} flex items-center justify-center mb-6`}>
                <benefit.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground font-medium text-lg">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
