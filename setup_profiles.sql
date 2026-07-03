-- 1. Création de la table profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  nom text,
  plan text default 'gratuit' check (plan in ('gratuit', 'pro', 'business')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Activation de RLS (Row Level Security)
alter table public.profiles enable row level security;

-- 3. Création des politiques de sécurité
-- L'utilisateur peut lire uniquement son propre profil
create policy "Les utilisateurs peuvent voir leur propre profil."
  on profiles for select
  using ( auth.uid() = id );

-- L'utilisateur peut modifier uniquement son propre profil
create policy "Les utilisateurs peuvent modifier leur propre profil."
  on profiles for update
  using ( auth.uid() = id );

-- L'insertion initiale se fait via un trigger sécurisé (Security Definer)

-- 4. Création de la fonction déclenchée lors de l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, plan)
  values (new.id, new.raw_user_meta_data->>'full_name', 'gratuit');
  return new;
end;
$$;

-- 5. Création du trigger attaché à auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
