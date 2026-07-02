"use client";

import React, { createContext, useContext, useState } from "react";
import { RepartitionModal } from "@/components/features/repartition/RepartitionModal";

export type PreviewTarget = {
  id: string;
  label: string;
  method: string;
  number: string;
  amount: number;
  percent?: number;
};

export type PreviewRule = {
  name: string;
  totalAvailable: number;
  commission: number;
  targets: PreviewTarget[];
};

interface RepartitionContextType {
  isOpen: boolean;
  previewData?: PreviewRule;
  openModal: (data?: PreviewRule) => void;
  closeModal: () => void;
}

const RepartitionContext = createContext<RepartitionContextType | undefined>(undefined);

export function RepartitionProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRule | undefined>(undefined);

  const openModal = (data?: PreviewRule) => {
    setPreviewData(data);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    // On garde previewData quelques ms pour l'animation de fermeture
    setTimeout(() => setPreviewData(undefined), 300);
  };

  return (
    <RepartitionContext.Provider value={{ isOpen, previewData, openModal, closeModal }}>
      {children}
      {isOpen && <RepartitionModal onClose={closeModal} customData={previewData} />}
    </RepartitionContext.Provider>
  );
}

export function useRepartition() {
  const context = useContext(RepartitionContext);
  if (context === undefined) {
    throw new Error("useRepartition must be used within a RepartitionProvider");
  }
  return context;
}
