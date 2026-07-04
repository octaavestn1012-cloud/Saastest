-- ==========================================
-- MISE A JOUR SCHEMA POUR L'HISTORIQUE DETAILLE
-- ==========================================

-- 1. Modification de la contrainte sur le statut des lignes pour accepter 'en_cours'
ALTER TABLE public.execution_lignes DROP CONSTRAINT IF EXISTS execution_lignes_statut_check;
ALTER TABLE public.execution_lignes ADD CONSTRAINT execution_lignes_statut_check CHECK (statut in ('reussi', 'echoue', 'en_cours'));

-- 2. Ajout des nouvelles colonnes pour tracer en détail chaque envoi
ALTER TABLE public.execution_lignes ADD COLUMN IF NOT EXISTS destinataire_numero text;
ALTER TABLE public.execution_lignes ADD COLUMN IF NOT EXISTS destinataire_reseau text;
ALTER TABLE public.execution_lignes ADD COLUMN IF NOT EXISTS erreur_message text;
ALTER TABLE public.execution_lignes ADD COLUMN IF NOT EXISTS reference_transaction text;
