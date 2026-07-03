-- ÉTAPE 2 : Création des tables de données et configuration de la sécurité (RLS)

-- ==========================================
-- 0. NETTOYAGE DES ANCIENNES TABLES
-- ==========================================
-- (Cette étape supprime vos anciennes tables de test en anglais et nettoie le terrain)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.transaction_splits CASCADE;
DROP TABLE IF EXISTS public.rules CASCADE;
DROP TABLE IF EXISTS public.recipients CASCADE;

DROP TABLE IF EXISTS public.execution_lignes CASCADE;
DROP TABLE IF EXISTS public.executions CASCADE;
DROP TABLE IF EXISTS public.distributions CASCADE;
DROP TABLE IF EXISTS public.regles CASCADE;
DROP TABLE IF EXISTS public.connexions CASCADE;
DROP TABLE IF EXISTS public.destinataires CASCADE;

-- ==========================================
-- 1. CRÉATION DES NOUVELLES TABLES
-- ==========================================

-- a) Table : destinataires
create table public.destinataires (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  libelle text not null,
  methode_mobile_money text not null,
  numero text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- b) Table : connexions
create table public.connexions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  nom text not null,
  passerelle text not null,
  statut text not null check (statut in ('actif', 'erreur')),
  cle_chiffree text,
  derniere_synchro timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- c) Table : regles
create table public.regles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  nom text not null,
  actif boolean default true not null,
  declencheur text not null check (declencheur in ('manuel', 'a_chaque_entree', 'quotidien', 'hebdo', 'mensuel')),
  declencheur_config jsonb,
  mode text not null check (mode in ('pourcentage', 'montant_fixe')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- d) Table : distributions
create table public.distributions (
  id uuid default gen_random_uuid() primary key,
  regle_id uuid references public.regles on delete cascade not null,
  destinataire_id uuid references public.destinataires on delete set null,
  libelle text not null,
  valeur numeric not null,
  ordre integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- e) Table : executions
create table public.executions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  regle_id uuid references public.regles on delete set null,
  montant_total numeric not null,
  statut text not null check (statut in ('reussi', 'partiel', 'echoue', 'en_cours')),
  date_execution timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- f) Table : execution_lignes
create table public.execution_lignes (
  id uuid default gen_random_uuid() primary key,
  execution_id uuid references public.executions on delete cascade not null,
  destinataire_libelle text not null,
  montant numeric not null,
  statut text not null check (statut in ('reussi', 'echoue')),
  est_commission boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- g) Table : transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  connexion_id uuid references public.connexions on delete set null,
  montant numeric not null,
  source text not null,
  statut text not null,
  date_reception timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ==========================================
-- 2. ACTIVATION DU RLS
-- ==========================================

alter table public.destinataires enable row level security;
alter table public.connexions enable row level security;
alter table public.regles enable row level security;
alter table public.distributions enable row level security;
alter table public.executions enable row level security;
alter table public.execution_lignes enable row level security;
alter table public.transactions enable row level security;


-- ==========================================
-- 3. POLITIQUES DE SÉCURITÉ (POLICIES)
-- ==========================================

-- a) destinataires
create policy "Accès complet à ses propres destinataires"
  on public.destinataires for all
  using (auth.uid() = user_id);

-- b) connexions
create policy "Accès complet à ses propres connexions"
  on public.connexions for all
  using (auth.uid() = user_id);

-- c) regles
create policy "Accès complet à ses propres regles"
  on public.regles for all
  using (auth.uid() = user_id);

-- d) distributions (accès via la règle parente)
create policy "Accès complet aux distributions de ses regles"
  on public.distributions for all
  using (
    exists (
      select 1 from public.regles
      where regles.id = distributions.regle_id
      and regles.user_id = auth.uid()
    )
  );

-- e) executions
create policy "Accès complet à ses propres executions"
  on public.executions for all
  using (auth.uid() = user_id);

-- f) execution_lignes (accès via l'exécution parente)
create policy "Accès complet aux lignes de ses executions"
  on public.execution_lignes for all
  using (
    exists (
      select 1 from public.executions
      where executions.id = execution_lignes.execution_id
      and executions.user_id = auth.uid()
    )
  );

-- g) transactions
create policy "Accès complet à ses propres transactions"
  on public.transactions for all
  using (auth.uid() = user_id);
