"use client";

import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A0A0A] pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-bold text-sm shadow-sm">
                R
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Réparto</span>
            </Link>
            <p className="text-white/50 font-medium max-w-sm leading-relaxed text-lg">
              L'infrastructure de répartition financière conçue pour les entrepreneurs modernes.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 tracking-wide uppercase text-sm">Produit</h4>
            <ul className="space-y-4">
              <li><Link href="#comment-ca-marche" className="text-white/50 hover:text-white font-medium transition-colors">Comment ça marche</Link></li>
              <li><Link href="#tarifs" className="text-white/50 hover:text-white font-medium transition-colors">Tarifs</Link></li>
              <li><Link href="#faq" className="text-white/50 hover:text-white font-medium transition-colors">FAQ</Link></li>
              <li><Link href="/login" className="text-white/50 hover:text-white font-medium transition-colors">Se connecter</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 tracking-wide uppercase text-sm">Légal</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-white/50 hover:text-white font-medium transition-colors">Mentions légales</Link></li>
              <li><Link href="#" className="text-white/50 hover:text-white font-medium transition-colors">Confidentialité</Link></li>
              <li><Link href="#" className="text-white/50 hover:text-white font-medium transition-colors">CGV / CGU</Link></li>
              <li><Link href="#" className="text-white/50 hover:text-white font-medium transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm font-medium">
            © {currentYear} Réparto. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/40 hover:text-white font-bold text-sm transition-colors">TikTok</a>
            <a href="#" className="text-white/40 hover:text-white font-bold text-sm transition-colors">Instagram</a>
            <a href="#" className="text-white/40 hover:text-white font-bold text-sm transition-colors">X (Twitter)</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
