import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export type Recipient = {
  id: string;
  name: string;
  network: string;
  phone: string;
};

interface RecipientModalProps {
  recipient?: Recipient;
  onClose: () => void;
  onSave: (recipient: Recipient) => void;
}

import { useScrollLock } from "@/hooks/useScrollLock";

export function RecipientModal({ recipient, onClose, onSave }: RecipientModalProps) {
  const [name, setName] = useState(recipient?.name || "");
  const [network, setNetwork] = useState(recipient?.network || "MTN");
  const [phone, setPhone] = useState(recipient?.phone || "");

  useScrollLock();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    onSave({
      id: recipient?.id || "",
      name,
      network,
      phone
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 md:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight">
            {recipient ? "Modifier le destinataire" : "Nouveau destinataire"}
          </h2>
          <button onClick={onClose} className="p-2 bg-black/[0.03] hover:bg-black/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto overscroll-contain">
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Nom / Libellé</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maman, Propriétaire..."
              className="w-full bg-[#F5F5F7] rounded-[1rem] px-4 py-3.5 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Réseau</label>
              <select 
                value={network} 
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-[#F5F5F7] rounded-[1rem] px-4 py-3.5 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="MTN">MTN BJ</option>
                <option value="Moov">Moov BJ</option>
                <option value="Celtiis">Celtiis BJ</option>
                <option value="Wave">Wave CI</option>
              </select>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Numéro de téléphone</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="00 00 00 00"
                className="w-full bg-[#F5F5F7] rounded-[1rem] px-4 py-3.5 text-[15px] font-mono font-medium outline-none focus:ring-2 focus:ring-primary tracking-wide"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={!name || !phone}
              className="w-full bg-black text-white hover:bg-black/80 disabled:opacity-50 disabled:pointer-events-none rounded-[1rem] h-14 font-semibold shadow-md transition-transform active:scale-95"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
