"use client";

import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-black/5 pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm">
                R
              </div>
              <span className="text-xl font-bold tracking-tight text-black">Réparto</span>
            </Link>
            <p className="text-muted-foreground font-medium max-w-sm">
              L'outil d'automatisation financière conçu pour les entrepreneurs africains. 
              Répartis tes revenus intelligemment, sans y penser.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Produit</h4>
            <ul className="space-y-3">
              <li><Link href="#comment-ca-marche" className="text-muted-foreground hover:text-black font-medium transition-colors">Comment ça marche</Link></li>
              <li><Link href="#tarifs" className="text-muted-foreground hover:text-black font-medium transition-colors">Tarifs</Link></li>
              <li><Link href="#faq" className="text-muted-foreground hover:text-black font-medium transition-colors">FAQ</Link></li>
              <li><Link href="/login" className="text-muted-foreground hover:text-black font-medium transition-colors">Se connecter</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Légal</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-muted-foreground hover:text-black font-medium transition-colors">Mentions légales</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-black font-medium transition-colors">Confidentialité</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-black font-medium transition-colors">CGV / CGU</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-black font-medium transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm font-medium">
            © {currentYear} Réparto. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-black font-bold text-sm transition-colors">TikTok</a>
            <a href="#" className="text-muted-foreground hover:text-black font-bold text-sm transition-colors">Instagram</a>
            <a href="#" className="text-muted-foreground hover:text-black font-bold text-sm transition-colors">X (Twitter)</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
