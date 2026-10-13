"""Gravação no Supabase com o usuário Postgres `coletor` (permissões restritas, sem bypassrls).

Toda consulta leva `owner_id` explícito (contrato APOIO: não presumir o isolamento pelo banco).
Mensagens de erro nunca incluem a string de conexão.
"""

import logging
from datetime import datetime
from uuid import UUID

import psycopg
from psycopg.types.json import Jsonb

from .contatos import Contato
from .dedupe import chave
from .filtros import Decisao
from .modelos import Semente, Vaga

log = logging.getLogger(__name__)


class Banco:
    def __init__(self, url: str, owner_id: str) -> None:
        self.owner = str(UUID(owner_id))  # valida o formato antes de usar
        try:
            self.conn = psycopg.connect(url, autocommit=False, connect_timeout=15)
        except psycopg.OperationalError as e:
            # A mensagem do driver pode citar o host; nunca a senha. Mostra só o tipo.
            raise SystemExit(f"Falha ao conectar ao banco ({type(e).__name__}).") from None

    def __enter__(self) -> "Banco":
        return self

    def __exit__(self, tipo, *_: object) -> None:
        if tipo is None:
            self.conn.commit()
        else:
            self.conn.rollback()
        self.conn.close()

    # --- empresas ---------------------------------------------------------------

    def gravar_empresa(self, s: Semente, pais: str | None, origem: str = "lista") -> UUID:
        with self.conn.cursor() as cur:
            if s.ats_slug:
                cur.execute(
                    """
                    insert into public.empresas (owner_id, nome, pais, ats_tipo, ats_slug, origem)
                    values (%s, %s, %s, %s, %s, %s)
                    on conflict (owner_id, ats_tipo, ats_slug) where ats_slug is not null
                    do update set pais = coalesce(excluded.pais, empresas.pais)
                    returning id
                    """,
                    (self.owner, s.nome, pais, s.ats_tipo, s.ats_slug, origem),
                )
            elif s.dominio:
                cur.execute(
                    """
                    insert into public.empresas (owner_id, nome, dominio, pais, origem)
                    values (%s, %s, %s, %s, %s)
                    on conflict (owner_id, dominio) where dominio is not null
                    do update set pais = coalesce(excluded.pais, empresas.pais)
                    returning id
                    """,
                    (self.owner, s.nome, s.dominio, pais, origem),
                )
            else:
                return self._empresa_por_nome(cur, s.nome, pais, origem)
            return cur.fetchone()[0]

    def empresa_de_agregador(self, nome: str, pais: str | None) -> UUID:
        with self.conn.cursor() as cur:
            return self._empresa_por_nome(cur, nome, pais, "agregador")

    def _empresa_por_nome(self, cur, nome: str, pais: str | None, origem: str) -> UUID:
        cur.execute(
            "select id from public.empresas where owner_id = %s and lower(nome) = lower(%s) "
            "order by criado_em limit 1",
            (self.owner, nome),
        )
        linha = cur.fetchone()
        if linha:
            return linha[0]
        cur.execute(
            "insert into public.empresas (owner_id, nome, pais, origem) values (%s, %s, %s, %s) "
            "returning id",
            (self.owner, nome, pais, origem),
        )
        return cur.fetchone()[0]

    def empresas_monitoradas(self) -> list[tuple[UUID, str, str, str]]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                select id, nome, ats_tipo, ats_slug from public.empresas
                where owner_id = %s and ats_slug is not null
                  and not bloqueada and not eh_agencia
                order by nome
                """,
                (self.owner,),
            )
            return cur.fetchall()

    def marcar_agencia(self, empresa_id: UUID, motivo: str) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                "update public.empresas set eh_agencia = true, motivo_agencia = %s "
                "where owner_id = %s and id = %s",
                (motivo, self.owner, empresa_id),
            )

    # --- vagas ------------------------------------------------------------------

    def gravar_vaga(self, empresa_id: UUID, v: Vaga, d: Decisao) -> bool:
        """Grava ou atualiza a vaga. Devolve True se for nova."""
        campos = (v.titulo, v.url, v.descricao or None, d.pais, v.cidade, v.regime,
                  v.senioridade, d.prioridade, v.publicada_em)
        with self.conn.cursor() as cur:
            cur.execute(
                """
                update public.vagas set titulo = %s, url = %s, descricao = %s, pais = %s,
                    cidade = %s, regime = %s, senioridade = %s, prioridade_pais = %s,
                    publicada_em = %s, vista_ultima_em = now(), ativa = true
                where owner_id = %s and fonte = %s and id_externo = %s
                returning id
                """,
                (*campos, self.owner, v.fonte, v.id_externo),
            )
            if cur.fetchone():
                return False
            cur.execute(
                """
                insert into public.vagas (owner_id, empresa_id, fonte, id_externo, chave_dedupe,
                    titulo, url, descricao, pais, cidade, regime, senioridade, prioridade_pais,
                    publicada_em)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (owner_id, chave_dedupe)
                do update set vista_ultima_em = now(), ativa = true
                returning (xmax = 0) as inserida
                """,
                (self.owner, empresa_id, v.fonte, v.id_externo, chave(v.empresa_nome, v.titulo),
                 *campos),
            )
            return bool(cur.fetchone()[0])

    def desativar_ausentes(self, fonte: str, inicio: datetime, empresa_id: UUID | None) -> int:
        """Vagas que a fonte deixou de mostrar nesta execução passam a inativas."""
        filtro_empresa = "and empresa_id = %s" if empresa_id else ""
        params = [self.owner, fonte, inicio] + ([empresa_id] if empresa_id else [])
        with self.conn.cursor() as cur:
            cur.execute(
                f"update public.vagas set ativa = false where owner_id = %s and fonte = %s "  # noqa: S608
                f"and vista_ultima_em < %s and ativa {filtro_empresa}",
                params,
            )
            return cur.rowcount

    # --- contatos, execuções e retenção ------------------------------------------

    def gravar_contato(self, empresa_id: UUID, c: Contato) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                insert into public.contatos (owner_id, empresa_id, email, tipo, origem)
                values (%s, %s, %s, %s, %s)
                on conflict (owner_id, email) do nothing
                """,
                (self.owner, empresa_id, c.email, c.tipo, c.origem),
            )

    def registrar_execucao(self, fonte: str, inicio: datetime, lidas: int, novas: int,
                           erros: list[str]) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                insert into public.execucoes (owner_id, fonte, iniciada_em, terminada_em,
                    vagas_lidas, vagas_novas, erros)
                values (%s, %s, %s, now(), %s, %s, %s)
                """,
                (self.owner, fonte, inicio, lidas, novas, Jsonb(erros[:50])),
            )

    def creditos_gastos_no_mes(self, fonte: str) -> int:
        """Vagas devolvidas pela fonte no mês corrente (no TheirStack, 1 vaga = 1 crédito)."""
        with self.conn.cursor() as cur:
            cur.execute(
                "select coalesce(sum(vagas_lidas), 0) from public.execucoes "
                "where owner_id = %s and fonte = %s "
                "and iniciada_em >= date_trunc('month', now())",
                (self.owner, fonte),
            )
            return int(cur.fetchone()[0])

    def aplicar_retencao(self) -> int:
        """RGPD: apaga contatos com apagar_apos vencido."""
        with self.conn.cursor() as cur:
            cur.execute(
                "delete from public.contatos where owner_id = %s and apagar_apos < now()",
                (self.owner,),
            )
            return cur.rowcount

    def commit(self) -> None:
        self.conn.commit()
