import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export type Recipient = {
  id: string;
  name: string;
  country?: string;
  network: string;
  phone: string;
};

export const COUNTRIES_NETWORKS: Record<string, string[]> = {
  "Bénin": ["MTN BJ", "Moov BJ", "Celtiis BJ"],
  "Côte d'Ivoire": ["Wave CI", "Orange CI", "MTN CI", "Moov CI"],
  "Sénégal": ["Wave SN", "Orange SN", "Free SN", "Expresso SN"],
  "Togo": ["TMoney TG", "Moov TG"],
  "Cameroun": ["Orange CM", "MTN CM"],
  "Mali": ["Orange ML", "Moov ML", "Telecel ML"]
};

export const COUNTRY_CODES: Record<string, string> = {
  "Bénin": "+229",
  "Côte d'Ivoire": "+225",
  "Sénégal": "+221",
  "Togo": "+228",
  "Cameroun": "+237",
  "Mali": "+223"
};

export const COUNTRY_PHONE_LENGTHS: Record<string, number> = {
  "Bénin": 10,
  "Côte d'Ivoire": 10,
  "Sénégal": 9,
  "Togo": 8,
  "Cameroun": 9,
  "Mali": 8
};

interface RecipientModalProps {
  recipient?: Recipient;
  onClose: () => void;
  onSave: (recipient: Recipient) => void;
}

import { useScrollLock } from "@/hooks/useScrollLock";

export function RecipientModal({ recipient, onClose, onSave }: RecipientModalProps) {
  const [name, setName] = useState(recipient?.name || "");
  const [country, setCountry] = useState(recipient?.country || "Bénin");
  const [network, setNetwork] = useState(recipient?.network || "MTN BJ");
  
  const defaultPrefix = COUNTRY_CODES[recipient?.country || "Bénin"] || "+229";
  const initialPhone = recipient?.phone ? recipient.phone.replace(defaultPrefix, "").replace(/[^0-9]/g, "") : "";
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");

  useScrollLock();

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const availableNetworks = COUNTRIES_NETWORKS[newCountry];
    if (availableNetworks && availableNetworks.length > 0) {
      setNetwork(availableNetworks[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setError("");

    const expectedLength = COUNTRY_PHONE_LENGTHS[country] || 8;
    const cleanPhone = phone.replace(COUNTRY_CODES[country] || "", "").replace(/[^0-9]/g, '');
    
    if (cleanPhone.length !== expectedLength) {
      setError(`Le numéro de téléphone pour ce pays (${country}) doit comporter exactement ${expectedLength} chiffres (vous en avez saisi ${cleanPhone.length}).`);
      return;
    }

    onSave({
      id: recipient?.id || "",
      name,
      country,
      network,
      phone: `${COUNTRY_CODES[country] || "+229"}${cleanPhone}`
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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

          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Pays</label>
            <select 
              value={country} 
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-[#F5F5F7] rounded-[1rem] px-4 py-3.5 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              {Object.keys(COUNTRIES_NETWORKS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Réseau</label>
              <select 
                value={network} 
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-[#F5F5F7] rounded-[1rem] px-4 py-3.5 text-[15px] font-semibold outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                {(COUNTRIES_NETWORKS[country] || COUNTRIES_NETWORKS["Bénin"]).map((net) => (
                  <option key={net} value={net}>{net}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">Téléphone</label>
              <div className={`relative flex items-center bg-[#F5F5F7] rounded-[1rem] transition-all border-2 ${error ? 'border-red-500/50 focus-within:ring-red-500/20' : 'border-transparent focus-within:border-black/10'}`}>
                <div className="pl-4 pr-2 py-3.5 text-[15px] font-mono font-bold text-muted-foreground select-none flex items-center h-full">
                  {COUNTRY_CODES[country] || "+229"}
                </div>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={Array(COUNTRY_PHONE_LENGTHS[country] || 8).fill("0").join("").replace(/(.{2})/g, "$1 ").trim()}
                  className="flex-1 bg-transparent pr-4 py-3.5 text-[15px] font-mono font-medium outline-none tracking-wide"
                  required
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs font-bold mt-2 ml-1">{error}</p>
              )}
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
