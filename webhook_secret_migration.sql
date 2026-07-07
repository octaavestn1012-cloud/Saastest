-- Ajout de la colonne webhook_secret_chiffre pour stocker le secret webhook chiffré
ALTER TABLE public.connexions ADD COLUMN IF NOT EXISTS webhook_secret_chiffre text;
