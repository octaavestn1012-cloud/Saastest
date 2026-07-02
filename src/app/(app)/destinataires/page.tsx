"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RecipientModal, Recipient } from "@/components/features/destinataires/RecipientModal";

const INITIAL_RECIPIENTS: Recipient[] = [
  { id: "1", name: "Maman", network: "MTN", phone: "97 00 00 00" },
  { id: "2", name: "Épargne Urgence", network: "MTN", phone: "97 00 00 01" },
  { id: "3", name: "Salaire Closer", network: "Moov", phone: "60 00 00 00" },
];

export default function DestinatairesPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('reparto_recipients');
    if (saved) {
      setRecipients(JSON.parse(saved));
    } else {
      setRecipients(INITIAL_RECIPIENTS);
      localStorage.setItem('reparto_recipients', JSON.stringify(INITIAL_RECIPIENTS));
    }
    setIsLoaded(true);
  }, []);

  const saveRecipient = (recipient: Recipient) => {
    let updated: Recipient[];
    if (recipients.find(r => r.id === recipient.id)) {
      // Update
      updated = recipients.map(r => r.id === recipient.id ? recipient : r);
    } else {
      // Add
      updated = [...recipients, recipient];
    }
    setRecipients(updated);
    localStorage.setItem('reparto_recipients', JSON.stringify(updated));
    setIsModalOpen(false);
    setEditingRecipient(undefined);
  };

  const deleteRecipient = (id: string) => {
    const updated = recipients.filter(r => r.id !== id);
    setRecipients(updated);
    localStorage.setItem('reparto_recipients', JSON.stringify(updated));
  };

  const openEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setIsModalOpen(true);
    setDropdownOpen(null);
  };

  const openNew = () => {
    setEditingRecipient(undefined);
    setIsModalOpen(true);
  };

  if (!isLoaded) return null;

  return (
    <div className="space-y-8 pb-20 sm:pb-8">
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(null)} 
        />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Destinataires</h2>
          <p className="text-muted-foreground text-sm mt-1">Ton carnet de bénéficiaires. Enregistre un numéro une fois, réutilise-le partout.</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
          <Plus className="w-5 h-5 mr-2" />
          Nouveau destinataire
        </Button>
      </div>

      {recipients.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-black/[0.05] p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
            <Users className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-3">Aucun destinataire enregistré</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            Ajoute tes destinataires une fois pour aller plus vite ensuite lors de la création de tes règles.
          </p>
          <Button onClick={openNew} className="bg-black hover:bg-black/80 text-white rounded-2xl h-14 px-8 text-lg font-semibold shadow-lg transition-transform hover:-translate-y-1">
            Ajouter un destinataire
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipients.map((recipient, index) => (
            <motion.div 
              key={recipient.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[1.5rem] p-5 border border-black/[0.05] shadow-sm flex items-center gap-4 relative group"
            >
              <div className="w-12 h-12 rounded-full bg-[#F5F5F7] text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {recipient.name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[16px] tracking-tight truncate">{recipient.name}</h3>
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5">
                  <span className="font-medium text-black/70">{recipient.network}</span>
                  <span>•</span>
                  <span className="font-mono tracking-wide">{recipient.phone}</span>
                </div>
              </div>

              <div className="relative shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(dropdownOpen === recipient.id ? null : recipient.id);
                  }}
                  className="text-muted-foreground hover:text-black transition-colors p-2 rounded-xl hover:bg-black/5"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {dropdownOpen === recipient.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 py-2 z-50 overflow-hidden"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEdit(recipient); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold hover:bg-black/5 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Modifier
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteRecipient(recipient.id); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <RecipientModal 
          recipient={editingRecipient} 
          onClose={() => setIsModalOpen(false)} 
          onSave={saveRecipient} 
        />
      )}
    </div>
  );
}
