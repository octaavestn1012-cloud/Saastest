"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header 
      className={`fixed left-0 right-0 z-50 transition-all duration-500 ease-out flex justify-center ${
        isScrolled 
          ? "top-4 px-4 sm:px-6" 
          : "top-0 px-4 sm:px-6 lg:px-8 bg-transparent py-5 w-full"
      }`}
    >
      <div 
        className={`w-full transition-all duration-500 ${
          isScrolled 
            ? "max-w-5xl bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/40 rounded-full px-4 sm:px-6 py-3" 
            : "max-w-7xl mx-auto"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
              R
            </div>
            <span className="text-xl font-bold tracking-tight text-black">Réparto</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#comment-ca-marche" className="text-sm font-semibold text-muted-foreground hover:text-black transition-colors">
              Comment ça marche
            </Link>
            <Link href="#tarifs" className="text-sm font-semibold text-muted-foreground hover:text-black transition-colors">
              Tarifs
            </Link>
            <Link href="#faq" className="text-sm font-semibold text-muted-foreground hover:text-black transition-colors">
              FAQ
            </Link>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-black hover:opacity-70 transition-opacity">
              Se connecter
            </Link>
            <Link href="/signup">
              <Button className="bg-black hover:bg-black/80 text-white rounded-full px-6 font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                Commencer gratuitement
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-black"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-black/5 shadow-xl p-4 flex flex-col gap-4">
          <Link href="#comment-ca-marche" onClick={closeMenu} className="block px-4 py-3 text-lg font-bold hover:bg-black/5 rounded-xl">
            Comment ça marche
          </Link>
          <Link href="#tarifs" onClick={closeMenu} className="block px-4 py-3 text-lg font-bold hover:bg-black/5 rounded-xl">
            Tarifs
          </Link>
          <Link href="#faq" onClick={closeMenu} className="block px-4 py-3 text-lg font-bold hover:bg-black/5 rounded-xl">
            FAQ
          </Link>
          
          <div className="border-t border-black/5 pt-4 flex flex-col gap-3">
            <Link href="/login" onClick={closeMenu} className="w-full">
              <Button variant="outline" className="w-full rounded-xl py-6 text-base font-bold">
                Se connecter
              </Button>
            </Link>
            <Link href="/signup" onClick={closeMenu} className="w-full">
              <Button className="w-full bg-black hover:bg-black/80 text-white rounded-xl py-6 text-base font-bold shadow-md">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
