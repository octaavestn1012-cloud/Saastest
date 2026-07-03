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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-black/[0.05] py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <Link href="/login">
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
            <Link href="/login" onClick={closeMenu} className="w-full">
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
