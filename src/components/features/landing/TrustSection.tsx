"use client";

import { motion } from "framer-motion";
import { Lock, ShieldAlert } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-24 bg-black text-white px-4 relative overflow-hidden">
      {/* Background Décoratif */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -z-10 translate-x-1/3 -translate-y-1/3" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/10"
        >
          <Lock className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h2 
          className="text-3xl md:text-5xl font-black tracking-tight mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Ton argent ne passe <span className="text-primary">jamais</span> par Réparto.
        </motion.h2>

        <motion.p 
          className="text-xl text-white/70 font-medium leading-relaxed max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Réparto n'organise que la <strong className="text-white">sortie</strong> de ton argent, directement depuis ta passerelle vers tes numéros Mobile Money. Nous ne stockons rien, nous ne détenons rien.
        </motion.p>

        <motion.div 
          className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex flex-col sm:flex-row gap-4 items-start sm:items-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <ShieldAlert className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h4 className="font-bold text-lg mb-1">Le contrôle reste entre tes mains</h4>
            <p className="text-white/60 text-sm">Tu utilises tes propres clés d'API (FedaPay, Kkiapay...). Tu peux révoquer l'accès à Réparto à n'importe quel moment depuis ton propre fournisseur.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
