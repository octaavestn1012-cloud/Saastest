"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="bg-[#0A0A0A] rounded-[3rem] p-10 sm:p-20 text-center text-white shadow-[0_20px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          {/* Glowing Orb (Optimisé) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(circle,rgba(34,197,94,0.15)_0%,rgba(168,85,247,0.15)_50%,transparent_70%)] -z-10" />
          
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20" />

          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-white leading-[1.1]">
              Arrêtez de réfléchir.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Commencez à construire.</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/60 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
              Des milliers de transactions sont déjà réparties automatiquement chaque jour. Rejoignez le mouvement.
            </p>
            
            <Link href="/signup">
              <Button className="bg-white hover:bg-[#F5F5F7] text-black rounded-full px-10 py-8 text-xl font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-1 inline-flex items-center gap-3 group">
                Créer mon compte gratuit
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
