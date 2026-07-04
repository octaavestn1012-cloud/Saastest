"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, CheckCircle2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-4 min-h-screen flex items-center justify-center">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-[#FAFAFA]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[150px] mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-24 relative z-10">
        
        {/* Text Content */}
        <motion.div 
          className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/[0.08] shadow-[0_2px_10px_rgb(0,0,0,0.04)] text-sm font-bold text-black mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            Nouveau : Connectez vos comptes locaux
          </motion.div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-black tracking-[-0.04em] text-[#111] leading-[1.05] mb-6">
            Répartis ton argent, <br className="hidden lg:block" />
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-blue-600">selon TES règles.</span>
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[#666] font-medium mb-10 max-w-2xl leading-relaxed">
            Connectez FedaPay ou Mobile Money. Créez vos règles. Réparto s'occupe de diviser chaque franc gagné vers vos poches d'épargne ou de dépense. Automatiquement.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-[#111] hover:bg-black text-white rounded-full px-8 py-7 text-lg font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#comment-ca-marche" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm border-black/10 hover:bg-white text-black rounded-full px-8 py-7 text-lg font-bold transition-all">
                Voir la démo
              </Button>
            </Link>
          </div>
          
          <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 text-sm font-semibold text-[#666]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Gratuit pour démarrer</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>0 franc stocké chez nous</span>
            </div>
          </div>
        </motion.div>

        {/* Visualisation Animée Premium */}
        <motion.div 
          className="flex-1 w-full max-w-xl lg:max-w-none relative perspective-[2000px]"
          initial={{ opacity: 0, rotateY: 10, x: 40 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="relative transform-gpu preserve-3d">
            {/* Glow Behind */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-[80px] rounded-full transform -translate-z-10" />
            
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
              
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#F5F5F7] px-3 py-1.5 rounded-lg mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold text-black uppercase tracking-wider">Entrée FedaPay</span>
                  </div>
                  <div className="text-4xl font-black text-black tracking-tight">+ 150 000 F</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-black/60" />
                </div>
              </div>

              {/* Lignes de flux animées */}
              <div className="relative pt-6 border-t border-black/[0.05]">
                {/* Ligne principale descendant */}
                <div className="absolute top-0 left-[32px] w-0.5 h-full bg-gradient-to-b from-black/10 to-transparent" />
                
                <div className="space-y-4">
                  {[
                    { color: "text-money-in", bg: "bg-money-in/10", label: "Épargne", perc: "50%", amount: "75 000 F", delay: 0.4 },
                    { color: "text-primary", bg: "bg-primary/10", label: "Dépenses", perc: "30%", amount: "45 000 F", delay: 0.6 },
                    { color: "text-purple-600", bg: "bg-purple-600/10", label: "Loisirs", perc: "20%", amount: "30 000 F", delay: 0.8 },
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: item.delay, type: "spring", stiffness: 100 }}
                      className="bg-white border border-black/[0.05] shadow-sm p-4 rounded-2xl flex justify-between items-center ml-12 relative group hover:shadow-md transition-shadow"
                    >
                      {/* Connecteur horizontal */}
                      <div className="absolute top-1/2 -left-12 w-12 h-0.5 bg-black/10" />
                      {/* Point de connexion */}
                      <div className="absolute top-1/2 -left-[49px] w-2 h-2 rounded-full bg-black/20" />
                      
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center font-black text-sm`}>
                          {item.perc}
                        </div>
                        <span className="font-bold text-black">{item.label}</span>
                      </div>
                      <span className="font-black text-lg">{item.amount}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
