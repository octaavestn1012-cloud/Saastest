"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, MoreVertical, Edit2, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RecipientModal, Recipient } from "@/components/features/destinataires/RecipientModal";
import { getDestinataires, saveDestinataire, deleteDestinataire } from "@/app/actions/destinataires";

export default function DestinatairesPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecipients = async () => {
    setIsLoading(true);
    const { data, error } = await getDestinataires();
    if (data) {
      setRecipients(data.map(d => ({
        id: d.id,
        name: d.libelle,
        country: d.pays || "Bénin",
        network: d.methode_mobile_money,
        phone: d.numero
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleSaveRecipient = async (recipient: Recipient) => {
    setIsSaving(true);
    const formData = new FormData();
    if (recipient.id && !recipient.id.startsWith("temp_")) {
      formData.append("id", recipient.id);
    }
    formData.append("libelle", recipient.name);
    if (recipient.country) formData.append("pays", recipient.country);
    formData.append("reseau", recipient.network);
    formData.append("numero", recipient.phone);

    const res = await saveDestinataire(formData);
    if (!res.error) {
      await fetchRecipients();
      setIsModalOpen(false);
      setEditingRecipient(undefined);
      showToast("Destinataire enregistré avec succès", "success");
    } else {
      console.error(res.error);
      showToast(res.error || "Erreur lors de l'enregistrement", "error");
    }
    setIsSaving(false);
  };

  const handleDeleteRecipient = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer ce destinataire ?")) {
      await deleteDestinataire(id);
      await fetchRecipients();
    }
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

  return (
    <div className="space-y-8 pb-20 sm:pb-8 relative">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[150] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold text-sm ${
              toast.type === 'success' ? 'bg-black text-white' : 'bg-danger text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#C4F042]" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(null)} 
        />
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mes numéros</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez votre carnet d'adresses pour vos répartitions.</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
          <Plus className="w-5 h-5 mr-2" />
          Nouveau destinataire
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      ) : recipients.length === 0 ? (
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
              className="bg-white rounded-[1.5rem] p-5 border border-black/[0.05] shadow-sm flex items-center gap-4 relative group hover:border-black/10 transition-colors"
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecipient(recipient.id); }}
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
        <div className="relative z-[60]">
          <RecipientModal 
            recipient={editingRecipient} 
            onClose={() => !isSaving && setIsModalOpen(false)} 
            onSave={handleSaveRecipient} 
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
