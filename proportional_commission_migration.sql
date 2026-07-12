-- Ajout de la logique de commission proportionnelle sur les lignes d'exécution
ALTER TABLE public.execution_lignes 
ADD COLUMN IF NOT EXISTS commission_associee numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS commission_statut text DEFAULT 'en_attente' NOT NULL 
  CHECK (commission_statut IN ('en_attente', 'due', 'collectee', 'non_applicable'));
