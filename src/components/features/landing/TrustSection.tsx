"use client";

import { motion } from "framer-motion";
import { Lock, ShieldAlert } from "lucide-react";

export function TrustSection() {
  const brands = [
    { name: "FedaPay", color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "MTN Mobile Money", color: "text-yellow-600", bg: "bg-yellow-500/10" },
    { name: "Moov Money", color: "text-blue-700", bg: "bg-blue-700/10" },
    { name: "Celtiis Pay", color: "text-green-600", bg: "bg-green-600/10" },
    { name: "KkiaPay", color: "text-red-500", bg: "bg-red-500/10" },
    { name: "Visa", color: "text-indigo-600", bg: "bg-indigo-600/10" },
    { name: "Mastercard", color: "text-orange-600", bg: "bg-orange-600/10" },
  ];

  // Double the array for seamless infinite scroll
  const marqueeItems = [...brands, ...brands];

  return (
    <section className="py-24 bg-[#0A0A0A] text-white px-4 relative overflow-hidden">
      {/* Background Décoratif */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[150px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto w-full relative z-10 mb-20">
        <p className="text-center text-white/50 font-bold uppercase tracking-[0.2em] text-sm mb-10">Compatible avec vos outils préférés</p>
        
        {/* Infinite Marquee */}
        <div className="relative w-full flex overflow-hidden group">
          {/* Gradients pour cacher les bords */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10" />
          
          <motion.div 
            className="flex items-center gap-6 whitespace-nowrap"
            animate={{ x: [0, -1920] }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          >
            {marqueeItems.map((brand, idx) => (
              <div 
                key={idx} 
                className={`px-8 py-4 rounded-2xl ${brand.bg} border border-white/5 flex items-center justify-center`}
              >
                <span className={`font-black text-xl tracking-tight ${brand.color}`}>{brand.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10 mt-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="w-20 h-20 mx-auto bg-white/5 backdrop-blur-md rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          <Lock className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h2 
          className="text-4xl md:text-6xl font-black tracking-tighter mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Ton argent ne passe <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">jamais</span> par Réparto.
        </motion.h2>

        <motion.p 
          className="text-xl md:text-2xl text-white/50 font-medium leading-relaxed max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Réparto n'organise que la <strong className="text-white">sortie</strong> de ton argent, directement depuis ta passerelle vers tes numéros Mobile Money.
        </motion.p>

        <motion.div 
          className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-left flex flex-col sm:flex-row gap-6 items-start sm:items-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-xl text-white mb-2">Le contrôle absolu</h4>
            <p className="text-white/50 text-base leading-relaxed">Tu utilises tes propres clés d'API (FedaPay, Kkiapay...). Tu peux révoquer l'accès à Réparto à n'importe quel moment depuis ton propre fournisseur. Nous ne détenons aucun fond.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
