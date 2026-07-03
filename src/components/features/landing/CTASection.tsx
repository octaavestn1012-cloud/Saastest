"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          className="bg-gradient-to-br from-primary to-purple-600 rounded-[3rem] p-8 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          {/* Cercles de décoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Prêt à reprendre le contrôle de ton argent ?
            </h2>
            <p className="text-xl text-white/80 font-medium mb-10 max-w-2xl mx-auto">
              Rejoins les vendeurs intelligents qui automatisent leur trésorerie avec Réparto.
            </p>
            
            <Link href="/login">
              <Button className="bg-white hover:bg-gray-100 text-primary rounded-full px-8 py-7 text-lg font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 inline-flex items-center gap-2">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
