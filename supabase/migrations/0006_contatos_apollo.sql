-- Contatos do Apollo (ADR-0005, 2026-11-02).
-- O Apollo só é consultado para empresas com vaga de nota 4 ou 5, uma vez por empresa.
-- RGPD: os contatos continuam com apagar_apos (12 meses) e nunca vão para o prompt da IA.

alter table public.contatos drop constraint contatos_origem_check;
alter table public.contatos add constraint contatos_origem_check
  check (origem in ('recruitee', 'itjobs', 'join', 'site', 'padrao', 'hunter', 'manual', 'apollo'));

-- Nome e cargo de quem recebe a candidatura (só para o site mostrar; o email é o mesmo dado).
alter table public.contatos add column nome text check (char_length(nome) <= 200);
alter table public.contatos add column cargo text check (char_length(cargo) <= 200);

-- Marca a consulta ao Apollo, achando ou não, para nunca gastar crédito duas vezes.
alter table public.empresas add column apollo_consultado_em timestamptz;
