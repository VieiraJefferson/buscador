-- Perfil editável pelo site e agenda interna de entrevistas (plano de 2026-10-14).
--   perfis                  -> os dados do Jefferson (antes em config/perfil.yaml)
--   agenda_disponibilidade  -> horários semanais livres para entrevistas
--   agenda_bloqueios        -> períodos sem disponibilidade (férias, compromissos)
--   entrevistas             -> entrevistas marcadas
-- O coletor só lê o perfil. Agenda e entrevistas são só do site.

-- ---------------------------------------------------------------------------
-- perfis
-- ---------------------------------------------------------------------------
create table public.perfis (
  owner_id       uuid primary key references auth.users (id) on delete cascade,
  dados          jsonb not null check (jsonb_typeof(dados) = 'object'),
  atualizado_em  timestamptz not null default now()
);

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- agenda
-- ---------------------------------------------------------------------------
create table public.agenda_disponibilidade (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  inicio      time not null,
  fim         time not null,
  fuso        text not null default 'Europe/Lisbon',
  criado_em   timestamptz not null default now(),
  check (fim > inicio)
);

create index agenda_disponibilidade_dono on public.agenda_disponibilidade (owner_id, dia_semana);

create table public.agenda_bloqueios (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  inicio     timestamptz not null,
  fim        timestamptz not null,
  motivo     text,
  criado_em  timestamptz not null default now(),
  check (fim > inicio)
);

create index agenda_bloqueios_dono on public.agenda_bloqueios (owner_id, inicio);

create table public.entrevistas (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  candidatura_id  uuid references public.candidaturas (id) on delete set null,
  empresa_id      uuid references public.empresas (id) on delete set null,
  titulo          text not null,
  inicio          timestamptz not null,
  fim             timestamptz not null,
  link            text check (link is null or link ~ '^https?://'),
  notas           text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check (fim > inicio)
);

create index entrevistas_dono on public.entrevistas (owner_id, inicio);

create trigger entrevistas_atualizado_em before update on public.entrevistas
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
revoke all on public.perfis, public.agenda_disponibilidade, public.agenda_bloqueios,
              public.entrevistas
  from anon, authenticated;

grant select, insert, update, delete on public.perfis, public.agenda_disponibilidade,
                                        public.agenda_bloqueios, public.entrevistas
  to authenticated;

grant select on public.perfis to coletor;  -- o coletor só lê o perfil

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.perfis                 enable row level security;
alter table public.agenda_disponibilidade enable row level security;
alter table public.agenda_bloqueios       enable row level security;
alter table public.entrevistas            enable row level security;

create policy dono_perfis on public.perfis for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_agenda_disponibilidade on public.agenda_disponibilidade for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_agenda_bloqueios on public.agenda_bloqueios for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_entrevistas on public.entrevistas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy coletor_perfis on public.perfis for select to coletor using (true);
