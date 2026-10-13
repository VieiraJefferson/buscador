-- Consultorias deixam de ser só "excluídas ou aceitas": as que não estão na lista negra
-- ficam visíveis, mas abaixo dos empregadores diretos (decisão de 2026-10-13).
-- Ordem da lista: prioridade do país, depois empregador direto antes de consultoria,
-- depois a nota de compatibilidade.
--
-- O role coletor já tem insert/update na tabela inteira; a coluna nova fica coberta.

alter table public.vagas
  add column consultoria boolean not null default false;

drop index if exists public.vagas_lista_do_dia;
create index vagas_lista_do_dia
  on public.vagas (owner_id, ativa, prioridade_pais, consultoria, nota desc);
