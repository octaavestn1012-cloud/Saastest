-- ==========================================
-- SCRIPT DE MIGRATION : PERFORMANCE & IDEMPOTENCE
-- ==========================================

-- 1. Indexation pour l'optimisation des requêtes
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON public.executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_statut ON public.executions(statut);
CREATE INDEX IF NOT EXISTS idx_execution_lignes_execution_id ON public.execution_lignes(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_lignes_statut ON public.execution_lignes(statut);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_connexions_user_id ON public.connexions(user_id);
CREATE INDEX IF NOT EXISTS idx_regles_user_id ON public.regles(user_id);
CREATE INDEX IF NOT EXISTS idx_destinataires_user_id ON public.destinataires(user_id);

-- 2. Idempotence des transactions webhooks (anti-doublons)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_externe text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_reference_externe'
    ) THEN
        ALTER TABLE public.transactions ADD CONSTRAINT unique_reference_externe UNIQUE (reference_externe);
    END IF;
END $$;
