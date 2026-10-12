-- Esquema inicial do buscador de vagas.
-- Decisões: docs/decisions/ADR-0001 e ADR-0002; explicação: docs/planos/2026-10-12-esquema-banco.md
--
-- Acessos:
--   authenticated -> o Jefferson no site (RLS por owner_id = auth.uid())
--   coletor       -> o script do GitHub Actions (permissões só nas tabelas que ele grava)
--   anon          -> nenhum acesso
--
-- A senha do role coletor NÃO está aqui. Define-se à mão no SQL Editor:
--   alter role coletor with password '...';

-- ---------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- empresas
-- ---------------------------------------------------------------------------
create table public.empresas (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  nome           text not null,
  dominio        text check (dominio = lower(dominio)),
  pais           char(2) check (pais = upper(pais)),
  ats_tipo       text check (ats_tipo in ('ashby', 'lever', 'greenhouse', 'personio', 'recruitee',
                                          'teamtailor', 'smartrecruiters', 'workable', 'outro')),
  ats_slug       text,
  origem         text not null check (origem in ('lista', 'agregador', 'manual')),
  eh_agencia     boolean not null default false,
  motivo_agencia text,
  bloqueada      boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (ats_slug is null or ats_tipo is not null)
);

create unique index empresas_dominio_unico on public.empresas (owner_id, dominio) where dominio is not null;
create unique index empresas_ats_unico on public.empresas (owner_id, ats_tipo, ats_slug) where ats_slug is not null;

create trigger empresas_atualizado_em before update on public.empresas
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- contatos (RGPD: apagados após apagar_apos; preferência por emails genéricos)
-- ---------------------------------------------------------------------------
create table public.contatos (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  email        text not null check (email = lower(email) and email like '%_@_%._%'),
  tipo         text not null check (tipo in ('ats_mailbox', 'generico', 'nominal')),
  origem       text not null check (origem in ('recruitee', 'itjobs', 'join', 'site', 'padrao', 'hunter', 'manual')),
  mx_ok        boolean,
  apagar_apos  timestamptz not null default (now() + interval '12 months'),
  criado_em    timestamptz not null default now(),
  unique (owner_id, email)
);

create index contatos_empresa on public.contatos (empresa_id);
create index contatos_apagar_apos on public.contatos (apagar_apos);

-- ---------------------------------------------------------------------------
-- vagas
-- ---------------------------------------------------------------------------
create table public.vagas (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users (id) on delete cascade,
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  fonte               text not null,
  id_externo          text not null,
  chave_dedupe        text not null,          -- empresa + título normalizado, igual entre fontes
  url                 text not null,
  titulo              text not null,
  descricao           text,
  pais                char(2) check (pais = upper(pais)),
  cidade              text,
  regime              text not null default 'desconhecido'
                        check (regime in ('remoto', 'hibrido', 'presencial', 'desconhecido')),
  senioridade         text,
  idioma              text,
  prioridade_pais     smallint check (prioridade_pais between 1 and 4),
  nota                smallint check (nota between 1 and 5),
  nota_justificativa  text,
  publicada_em        timestamptz,
  vista_primeira_em   timestamptz not null default now(),
  vista_ultima_em     timestamptz not null default now(),
  ativa               boolean not null default true,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  unique (owner_id, fonte, id_externo),
  unique (owner_id, chave_dedupe)
);

create index vagas_lista_do_dia on public.vagas (owner_id, ativa, prioridade_pais, nota desc);
create index vagas_recentes on public.vagas (owner_id, vista_primeira_em desc);
create index vagas_empresa on public.vagas (empresa_id);

create trigger vagas_atualizado_em before update on public.vagas
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- emails_gerados (o banco recusa travessões: segunda barreira depois do validador do coletor)
-- ---------------------------------------------------------------------------
create table public.emails_gerados (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  vaga_id     uuid not null references public.vagas (id) on delete cascade,
  contato_id  uuid references public.contatos (id) on delete set null,
  idioma      text not null,
  assunto     text not null check (assunto !~ '[—–]'),
  corpo       text not null check (corpo !~ '[—–]'),
  modelo      text not null,
  gerado_em   timestamptz not null default now()
);

create index emails_gerados_vaga on public.emails_gerados (vaga_id);
create index emails_gerados_contato on public.emails_gerados (contato_id);

-- ---------------------------------------------------------------------------
-- candidaturas (só o Jefferson; o coletor não tem acesso)
-- ---------------------------------------------------------------------------
create table public.candidaturas (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users (id) on delete cascade,
  vaga_id            uuid not null references public.vagas (id) on delete cascade,
  email_gerado_id    uuid references public.emails_gerados (id) on delete set null,
  estado             text not null default 'a_enviar'
                       check (estado in ('a_enviar', 'enviada', 'respondida', 'entrevista', 'recusada', 'sem_resposta')),
  enviada_em         timestamptz,
  notas              text,
  resposta_sugerida  text,                    -- só a resposta do assistente; o email colado não é guardado
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (owner_id, vaga_id),
  check (estado = 'a_enviar' or enviada_em is not null)
);

create index candidaturas_email_gerado on public.candidaturas (email_gerado_id);

create trigger candidaturas_atualizado_em before update on public.candidaturas
  for each row execute function public.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- execucoes (registro de cada varredura, alimenta o relatório)
-- ---------------------------------------------------------------------------
create table public.execucoes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  fonte         text not null,
  iniciada_em   timestamptz not null default now(),
  terminada_em  timestamptz,
  vagas_lidas   integer not null default 0 check (vagas_lidas >= 0),
  vagas_novas   integer not null default 0 check (vagas_novas >= 0),
  erros         jsonb not null default '[]'::jsonb
);

create index execucoes_recentes on public.execucoes (owner_id, iniciada_em desc);

-- ---------------------------------------------------------------------------
-- Privilégios: ninguém por omissão
-- ---------------------------------------------------------------------------
revoke all on public.empresas, public.contatos, public.vagas, public.emails_gerados,
              public.candidaturas, public.execucoes
  from anon, authenticated;

-- authenticated: o site. O RLS abaixo restringe ao próprio dono.
grant select, insert, update, delete on public.empresas, public.contatos, public.vagas,
                                        public.emails_gerados, public.candidaturas
  to authenticated;
grant select on public.execucoes to authenticated;

-- coletor: só o que o script precisa. Sem candidaturas, sem auth, sem DDL.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'coletor') then
    create role coletor login noinherit nocreatedb nocreaterole nobypassrls;
  end if;
end;
$$;

grant usage on schema public to coletor;
grant select, insert, update on public.empresas, public.vagas, public.emails_gerados, public.execucoes
  to coletor;
grant select, insert, update, delete on public.contatos to coletor;   -- delete: retenção RGPD

-- ---------------------------------------------------------------------------
-- RLS em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.empresas       enable row level security;
alter table public.contatos       enable row level security;
alter table public.vagas          enable row level security;
alter table public.emails_gerados enable row level security;
alter table public.candidaturas   enable row level security;
alter table public.execucoes      enable row level security;

-- Site: cada linha só para o dono
create policy dono_empresas on public.empresas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_contatos on public.contatos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_vagas on public.vagas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_emails_gerados on public.emails_gerados for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_candidaturas on public.candidaturas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy dono_execucoes on public.execucoes for select to authenticated
  using (owner_id = (select auth.uid()));

-- Coletor: as permissões (grants) já limitam as tabelas. As políticas permitem as linhas;
-- o owner_id é sempre enviado explicitamente pelo coletor.
create policy coletor_empresas on public.empresas for all to coletor using (true) with check (owner_id is not null);
create policy coletor_contatos on public.contatos for all to coletor using (true) with check (owner_id is not null);
create policy coletor_vagas on public.vagas for all to coletor using (true) with check (owner_id is not null);
create policy coletor_emails_gerados on public.emails_gerados for all to coletor using (true) with check (owner_id is not null);
create policy coletor_execucoes on public.execucoes for all to coletor using (true) with check (owner_id is not null);
