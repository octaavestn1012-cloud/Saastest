"use client";

import { motion } from "framer-motion";
import { XCircle, Link2, SlidersHorizontal, RefreshCw } from "lucide-react";

export function ProblemSolutionSection() {
  return (
    <section id="comment-ca-marche" className="py-20 md:py-32 bg-white px-4">
      <div className="max-w-7xl mx-auto space-y-32">
        
        {/* LE PROBLÈME */}
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
              Tu reçois tout ton argent au même endroit… et tu dépenses tout ?
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              Gérer son argent manuellement est un cauchemar. Sans système automatisé, il est impossible de faire grandir ses finances sainement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <motion.div 
              className="bg-[#FDFDFD] border border-black/5 rounded-3xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <XCircle className="w-8 h-8 text-danger mb-4" />
              <p className="font-bold text-black text-lg">
                Ventes, salaires, épargne, dépenses perso — tout est mélangé.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-[#FDFDFD] border border-black/5 rounded-3xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <XCircle className="w-8 h-8 text-danger mb-4" />
              <p className="font-bold text-black text-lg">
                Tu te dis toujours "je vais épargner plus tard"… et l'argent disparaît.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-[#FDFDFD] border border-black/5 rounded-3xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <XCircle className="w-8 h-8 text-danger mb-4" />
              <p className="font-bold text-black text-lg">
                Impossible de construire un patrimoine ou une entreprise dans ce désordre.
              </p>
            </motion.div>
          </div>
        </div>

        {/* LA SOLUTION (3 ÉTAPES) */}
        <div>
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Réparto s'en occupe pour toi,<br className="hidden md:block" /> en 3 étapes.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Ligne connectrice décorative */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-black/[0.05]" />

            <motion.div 
              className="relative text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-24 h-24 mx-auto bg-white border border-black/10 shadow-xl rounded-3xl flex items-center justify-center relative z-10">
                <Link2 className="w-10 h-10 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">1. Branche ton encaissement</h3>
                <p className="text-muted-foreground font-medium">Connecte ta passerelle de paiement (FedaPay, Kkiapay, etc.) en un clic sécurisé.</p>
              </div>
            </motion.div>

            <motion.div 
              className="relative text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-24 h-24 mx-auto bg-white border border-black/10 shadow-xl rounded-3xl flex items-center justify-center relative z-10">
                <SlidersHorizontal className="w-10 h-10 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">2. Définis tes règles</h3>
                <p className="text-muted-foreground font-medium">Exemple : 50% épargne, 30% dépenses, 20% loisirs... C'est toi qui décides.</p>
              </div>
            </motion.div>

            <motion.div 
              className="relative text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-24 h-24 mx-auto bg-white border border-black/10 shadow-xl rounded-3xl flex items-center justify-center relative z-10">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl animate-ping" />
                <RefreshCw className="w-10 h-10 text-primary relative z-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">3. Réparto agit tout seul</h3>
                <p className="text-muted-foreground font-medium">Dès que l'argent rentre, il part au bon endroit, automatiquement, selon tes règles.</p>
              </div>
            </motion.div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
