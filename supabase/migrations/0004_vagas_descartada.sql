-- "A vaga ainda existe na fonte" (ativa) e "a vaga foi tirada da lista" (descartada) passam
-- a ser colunas separadas (decisão de 2026-10-14).
--
-- Antes, a varredura punha ativa = true em toda vaga vista de novo e desfazia o descarte
-- feito no site e o descarte feito pela IA (recrutadora, presencial, idioma exigido).
-- Agora:
--   ativa       = a fonte ainda mostra a vaga (a varredura liga e desliga);
--   descartada  = o Jefferson ou a IA tiraram a vaga da lista (a varredura nunca desfaz).
--
-- O role coletor já tem insert/update na tabela inteira; a coluna nova fica coberta.

alter table public.vagas
  add column descartada boolean not null default false;

drop index if exists public.vagas_lista_do_dia;
create index vagas_lista_do_dia
  on public.vagas (owner_id, ativa, descartada, prioridade_pais, consultoria, nota desc);
