"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "Est-ce que Réparto garde mon argent ?",
    answer: "Non, jamais. Réparto agit uniquement comme un contrôleur qui donne des ordres de transfert depuis votre passerelle de paiement (ex: FedaPay) vers vos comptes de destination. Nous ne stockons aucun fonds."
  },
  {
    question: "Comment vous vous rémunérez ?",
    answer: "Nous prenons une petite commission (entre 0,4% et 1,9% selon votre plan) uniquement sur les montants répartis avec succès. L'abonnement mensuel (pour les plans Pro et Business) nous permet de maintenir et sécuriser l'infrastructure."
  },
  {
    question: "Sur quels réseaux Mobile Money ça marche ?",
    answer: "Réparto est compatible avec la majorité des réseaux locaux couverts par votre passerelle de paiement, notamment MTN, Moov, Celtiis (Bénin), Wave (CI/Sénégal), etc."
  },
  {
    question: "Je peux annuler quand je veux ?",
    answer: "Oui, totalement. Il n'y a aucun engagement de durée. Vous pouvez repasser au plan Gratuit ou supprimer votre compte en un clic."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-[#FDFDFD] px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Questions fréquentes
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Tout ce que vous devez savoir avant de vous lancer.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div 
                key={index}
                className={`bg-white border ${isOpen ? 'border-primary/50 shadow-md' : 'border-black/5 shadow-sm'} rounded-3xl overflow-hidden transition-all`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <button
                  className="w-full px-6 py-6 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-bold text-lg pr-8">{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-primary text-white' : 'bg-[#F5F5F7] text-black'}`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-muted-foreground font-medium leading-relaxed border-t border-black/5 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
