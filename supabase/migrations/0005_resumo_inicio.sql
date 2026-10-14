-- Contagens do Início feitas no banco, numa única chamada (plano do frontend, 2026-10-14).
-- Antes, o site trazia até 2000 vagas só para contar no navegador.
--
-- security invoker: roda com as permissões de quem chama (o site, role authenticated), e o
-- RLS de cada tabela continua valendo; o filtro por auth.uid() é explícito também.
-- Os mesmos critérios da lista de vagas: ativa, não descartada, nota >= 3, empresa não
-- bloqueada.

create or replace function public.resumo_inicio()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with dono as (
    select (select auth.uid()) as id
  ),
  visiveis as (
    select v.id, v.prioridade_pais, v.vista_primeira_em,
           exists (select 1 from public.emails_gerados g
                   where g.owner_id = v.owner_id and g.vaga_id = v.id) as tem_email,
           (select c.estado from public.candidaturas c
            where c.owner_id = v.owner_id and c.vaga_id = v.id limit 1) as estado
    from public.vagas v
    join public.empresas e on e.id = v.empresa_id
    where v.owner_id = (select id from dono)
      and v.ativa and not v.descartada and v.nota >= 3 and not e.bloqueada
  ),
  a_enviar as (
    select * from visiveis where estado is null or estado = 'a_enviar'
  )
  select jsonb_build_object(
    'novas_hoje', (select count(*) from visiveis
                   where vista_primeira_em >= date_trunc('day', now())),
    'com_email', (select count(*) from a_enviar where tem_email),
    'por_pais', (select coalesce(jsonb_object_agg(prioridade_pais, n), '{}'::jsonb)
                 from (select prioridade_pais, count(*) as n from a_enviar
                       where prioridade_pais is not null group by 1) x),
    'candidaturas', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb)
                     from (select estado, count(*) as n from public.candidaturas
                           where owner_id = (select id from dono) group by 1) y)
  );
$$;

revoke all on function public.resumo_inicio() from public, anon;
grant execute on function public.resumo_inicio() to authenticated;
