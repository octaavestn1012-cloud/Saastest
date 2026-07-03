"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, CheckCircle2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
        
        {/* Contenu Texte */}
        <motion.div 
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Nouveau : Connectez vos passerelles locales
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-black leading-[1.1] mb-6">
            Répartis automatiquement ton argent, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              selon TES règles.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Réparto envoie ton argent où tu veux, quand tu veux — sans que tu y penses. 
            Tu arrêtes de tout dépenser, tu construis enfin.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-black hover:bg-black/80 text-white rounded-full px-8 py-7 text-lg font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-sm font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-money-in" />
              <span>Gratuit pour démarrer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-money-in" />
              <span>On ne stocke pas ton argent</span>
            </div>
          </div>
        </motion.div>

        {/* Visualisation (Mockup animé) */}
        <motion.div 
          className="flex-1 w-full max-w-lg lg:max-w-none relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Décoration d'arrière plan */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-[100px] -z-10 rounded-full" />
          
          <div className="bg-white rounded-[2.5rem] border border-black/[0.05] shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-purple-500" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Entrée (FedaPay)</p>
                <div className="text-3xl font-black text-black">150 000 F</div>
              </div>
              <Wallet className="w-10 h-10 text-black/10" />
            </div>

            {/* Animation de flux */}
            <div className="relative pt-6 border-t border-black/[0.05]">
              <div className="absolute top-0 left-[20px] w-0.5 h-6 bg-black/10" />
              <div className="absolute top-[12px] left-[20px] w-8 h-0.5 bg-black/10" />
              
              <div className="space-y-4">
                {/* Ligne 1 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="bg-[#F5F5F7] p-4 rounded-2xl flex justify-between items-center ml-8 relative"
                >
                  <div className="absolute top-1/2 -left-8 w-8 h-0.5 bg-black/10" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-money-in/20 text-money-in flex items-center justify-center font-bold text-xs">50%</div>
                    <span className="font-bold">Épargne (MTN)</span>
                  </div>
                  <span className="font-black">75 000 F</span>
                </motion.div>

                {/* Ligne 2 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                  className="bg-[#F5F5F7] p-4 rounded-2xl flex justify-between items-center ml-8 relative"
                >
                  <div className="absolute top-1/2 -left-8 w-8 h-0.5 bg-black/10" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">30%</div>
                    <span className="font-bold">Dépenses (Moov)</span>
                  </div>
                  <span className="font-black">45 000 F</span>
                </motion.div>

                {/* Ligne 3 */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  className="bg-[#F5F5F7] p-4 rounded-2xl flex justify-between items-center ml-8 relative"
                >
                  <div className="absolute top-1/2 -left-8 w-8 h-0.5 bg-black/10" />
                  <div className="absolute -top-16 left-[-32px] w-0.5 h-[90px] bg-black/10" />
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center font-bold text-xs">20%</div>
                    <span className="font-bold">Loisirs (MTN)</span>
                  </div>
                  <span className="font-black">30 000 F</span>
                </motion.div>
              </div>
            </div>
            
          </div>
        </motion.div>

      </div>
    </section>
  );
}
