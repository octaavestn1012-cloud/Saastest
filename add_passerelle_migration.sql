-- Ajout de la colonne passerelle pour tracer d'où provient l'argent
ALTER TABLE public.execution_lignes ADD COLUMN IF NOT EXISTS passerelle text;
