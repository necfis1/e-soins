-- ============================================================
--  e-Soins — Script SQL Supabase
--  Copiez-collez ce script dans :
--  Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. UTILISATEURS (infirmiers + admin)
create table if not exists utilisateurs (
  id          bigserial primary key,
  login       text unique not null,
  password    text not null,
  prenom      text,
  nom         text not null,
  telephone   text,
  specialite  text,
  role        text default 'infirmier',   -- 'admin' | 'infirmier'
  statut      text default 'en_attente',  -- 'en_attente' | 'approuve' | 'refuse'
  created_at  timestamptz default now()
);

-- Compte admin par défaut (login: admin / mdp: benito1)
insert into utilisateurs (login, password, prenom, nom, role, statut)
values ('admin', 'benito1', '', 'Administrateur', 'admin', 'approuve')
on conflict (login) do nothing;

-- 2. PATIENTS
create table if not exists patients (
  id              bigserial primary key,
  nom             text not null,
  prenom          text not null,
  sexe            text default 'F',
  ddn             date,
  adresse         text,
  telephone       text,
  contact         text,
  groupe_sanguin  text default 'A+',
  antecedents     text,
  statut          text default 'stable',  -- 'stable' | 'critique'
  diagnostic      text,
  traitement      text,
  allergies       text,
  created_by      bigint references utilisateurs(id),
  created_at      timestamptz default now()
);

-- 3. VISITES
create table if not exists visites (
  id              bigserial primary key,
  patient_id      bigint references patients(id) on delete cascade,
  date            date not null,
  heure           text,
  soin            text not null,
  statut_visite   text default 'en attente',  -- 'fait' | 'en attente'
  cout            numeric(10,2) default 0,
  paye            numeric(10,2) default 0,
  mode            text default 'Espèces',
  notes           text,
  created_at      timestamptz default now()
);

-- 4. SIGNES VITAUX
create table if not exists vitaux (
  id            bigserial primary key,
  patient_id    bigint references patients(id) on delete cascade,
  date          date not null,
  heure         text,
  ta            text,
  temp          numeric(4,1),
  glycemie      text,
  spo2          numeric(5,1),
  poids         numeric(5,1),
  commentaire   text,
  created_at    timestamptz default now()
);

-- 5. SOINS APPLIQUÉS (journal infirmier)
create table if not exists soins_appliques (
  id            bigserial primary key,
  patient_id    bigint references patients(id) on delete cascade,
  date          date not null,
  heure         text,
  type_soin     text not null,
  description   text,
  produits      text,
  douleur       text,
  reaction      text,
  observations  text,
  prochaine     date,
  created_at    timestamptz default now()
);

-- 6. TARIFS / CATALOGUE
create table if not exists tarifs (
  id          bigserial primary key,
  nom         text not null,
  categorie   text default 'Acte infirmier',
  prix        numeric(10,2) not null,
  tva         numeric(4,1) default 0,
  description text,
  actif       boolean default true,
  created_at  timestamptz default now()
);

-- Tarifs par défaut
insert into tarifs (nom, categorie, prix, tva, description) values
  ('Prise de sang',         'Acte infirmier', 45.00, 0,   'Prélèvement veineux standard'),
  ('Injection insuline',    'Acte infirmier', 35.00, 0,   'Injection sous-cutanée insuline'),
  ('Pansement simple',      'Acte infirmier', 28.00, 0,   'Nettoyage et pansement de plaie simple'),
  ('Pansement complexe',    'Acte infirmier', 52.00, 0,   'Plaie profonde, escarres, etc.'),
  ('Nébulisation',          'Acte infirmier', 40.00, 0,   'Traitement par aérosol'),
  ('Glycémie capillaire',   'Acte infirmier', 18.00, 0,   'Mesure glycémie par piqûre au doigt'),
  ('Compresses stériles',   'Consommable',    2.50,  5.5, 'Boîte de 10 compresses'),
  ('Désinfectant Bétadine', 'Consommable',    4.80,  5.5, 'Flacon 250ml'),
  ('Seringue 5mL',          'Consommable',    0.90,  5.5, 'Seringue à usage unique'),
  ('Gants stériles',        'Consommable',    3.20,  5.5, 'Paire de gants stériles'),
  ('Déplacement domicile',  'Frais',         10.00, 20,   'Forfait déplacement à domicile')
on conflict do nothing;

-- 7. FACTURES
create table if not exists factures (
  id            bigserial primary key,
  patient_id    bigint references patients(id),
  infirmier_id  bigint references utilisateurs(id),
  date          date not null,
  mode          text default 'Espèces',
  paye          numeric(10,2) default 0,
  total_ttc     numeric(10,2) default 0,
  notes         text,
  created_at    timestamptz default now()
);

-- 8. LIGNES DE FACTURE
create table if not exists facture_lignes (
  id          bigserial primary key,
  facture_id  bigint references factures(id) on delete cascade,
  nom         text not null,
  description text,
  qte         numeric(8,2) default 1,
  prix        numeric(10,2) default 0,
  tva         numeric(4,1) default 0,
  total       numeric(10,2) default 0
);

-- ============================================================
--  SÉCURITÉ : Désactiver RLS pour commencer (simple)
--  Vous pourrez l'activer plus tard avec des politiques fines
-- ============================================================
alter table utilisateurs     disable row level security;
alter table patients         disable row level security;
alter table visites          disable row level security;
alter table vitaux           disable row level security;
alter table soins_appliques  disable row level security;
alter table tarifs           disable row level security;
alter table factures         disable row level security;
alter table facture_lignes   disable row level security;
