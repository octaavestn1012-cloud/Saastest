"use client";

import { useState } from "react";
import { MessageCircle, ChevronDown, HelpCircle, ShieldCheck, Zap, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaqItemProps {
  question: string;
  answer: string;
  icon: React.ElementType;
}

function FaqItem({ question, answer, icon: Icon }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-black/[0.08] rounded-2xl overflow-hidden bg-white transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-[#F5F5F7] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-[15px] text-black pr-4">{question}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-5 pt-0 text-[14px] leading-relaxed text-muted-foreground border-t border-black/[0.04]">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const faqs = [
    {
      question: "Réparto garde-t-il mon argent ?",
      answer: "Non, absolument pas ! Réparto ne stocke jamais vos fonds. Nous ne faisons qu'ordonner à votre passerelle de paiement (ex: FedaPay, Paystack) de transférer automatiquement l'argent selon vos règles. Votre argent reste toujours en sécurité sur votre compte principal ou est directement viré à vos destinataires.",
      icon: ShieldCheck,
    },
    {
      question: "Comment brancher ma passerelle ?",
      answer: "Réparto se connecte directement à votre compte de paiement via une clé API ou OAuth. Allez dans l'onglet \"Connexions\" depuis le menu, sélectionnez votre passerelle et suivez les instructions. Cela prend moins de 2 minutes.",
      icon: Zap,
    },
    {
      question: "Comment créer une règle de répartition ?",
      answer: "Allez dans l'onglet \"Règles\" puis cliquez sur le bouton \"Créer une règle\". Vous pourrez définir très simplement quel pourcentage (ou montant fixe) d'une transaction doit être envoyé à quel partenaire. Tout sera calculé automatiquement à chaque paiement.",
      icon: HelpCircle,
    },
    {
      question: "Que se passe-t-il si un envoi échoue ?",
      answer: "Si votre passerelle rencontre une erreur (ex: solde insuffisant, compte du destinataire bloqué), la transaction apparaîtra en statut \"Échouée\" dans votre Historique. Vous recevrez une notification et pourrez la relancer manuellement une fois le problème résolu.",
      icon: AlertTriangle,
    },
    {
      question: "Comment changer de plan ?",
      answer: "Notre tarification s'adapte à votre volume. Pour changer de plan ou augmenter vos limites mensuelles, rendez-vous dans les paramètres de votre compte (Menu > Facturation) et sélectionnez le forfait qui correspond à vos nouveaux besoins.",
      icon: CreditCard,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Support & Aide</h1>
        <p className="text-muted-foreground font-medium">
          Trouvez rapidement des réponses à vos questions ou contactez-nous si besoin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ Section */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FaqItem key={index} {...faq} />
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 sticky top-24">
            <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-2xl flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-bold text-black mb-2">
              Besoin d'aide ?
            </h3>
            <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
              Si vous n'avez pas trouvé la réponse dans notre FAQ, n'hésitez pas à nous écrire directement sur WhatsApp.
            </p>

            <div className="bg-[#F5F5F7] rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-black">On répond sous 24h - 48h</span>
              </div>
            </div>

            {/* Replace the phone number below with your actual WhatsApp number, including country code, no +, no spaces */}
            <a 
              href="https://wa.me/22900000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-xl py-6 font-bold text-base shadow-sm">
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
