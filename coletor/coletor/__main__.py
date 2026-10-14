"""Linha de comando do coletor.

    python -m coletor descobrir [--amostra N] [--dry-run]   # lista de empresas (semanal)
    python -m coletor varrer    [--amostra N] [--dry-run]   # vagas (diária)

Com --dry-run nada é gravado: mostra só os números e alguns exemplos.
"""

import argparse
import asyncio
import logging
import os
import random
from collections import Counter, defaultdict
from datetime import UTC, datetime

from . import contatos, empresas, fontes, relatorio
from .config import (
    carregar_agencias,
    carregar_env_local,
    carregar_perfil,
    chave_theirstack,
    config_banco,
)
from .filtros import Decisao, Filtro
from .fontes import theirstack
from .modelos import Semente, Vaga
from .rede import ErroFonte, Rede

log = logging.getLogger("coletor")


def _amostrar(sementes: list[Semente], n: int | None) -> list[Semente]:
    if not n or n >= len(sementes):
        return sementes
    return random.Random(42).sample(sementes, n)  # noqa: S311 (amostra reproduzível, não é segurança)


def _agencias_para_api() -> list[str]:
    """O TheirStack compara por substring: nomes curtos ("ust", "ey") excluiriam empresas
    legítimas. Só os longos vão no pedido; os curtos ficam no filtro local (palavra inteira)."""
    return [a for a in carregar_agencias().get("empresas") or [] if len(a) >= 6]


async def _theirstack(rede: Rede, orcamento: int) -> list[Vaga]:
    chave = chave_theirstack()
    if not chave or orcamento <= 0:
        return []
    try:
        return await theirstack.vagas(rede, chave, orcamento, _agencias_para_api())
    except ErroFonte as e:
        log.warning("TheirStack indisponível: %s", e)
        return []


async def descobrir(args: argparse.Namespace, filtro: Filtro) -> None:
    orcamento = 0
    if not args.dry_run:
        from .banco import Banco

        cfg = config_banco()
        with Banco(cfg.url, cfg.owner_id) as b:  # conexão curta: a rede pode demorar muito
            gasto = b.creditos_gastos_no_mes(theirstack.FONTE)
        orcamento = max(0, min(theirstack.ORCAMENTO_SEMANAL, theirstack.LIMITE_MENSAL - gasto))
        log.info("TheirStack: %d créditos gastos no mês; orçamento desta execução: %d",
                 gasto, orcamento)
    if args.theirstack is not None:  # teste explícito: gasta créditos mesmo em --dry-run
        orcamento = args.theirstack if args.dry_run else min(args.theirstack, orcamento)
    inicio = datetime.now(UTC)
    async with Rede() as rede:
        sementes = _amostrar(await empresas.carregar_sementes(rede), args.amostra)
        resultados = await empresas.validar_todas(rede, filtro, sementes)
        vagas_ts = await _theirstack(rede, orcamento)
    mantidas = [r for r in resultados if r.manter]
    decisoes_ts = [(v, filtro.avaliar(v)) for v in vagas_ts]
    log.info("TheirStack: %d vagas devolvidas (= créditos), %d aceitas, %d com ATS reconhecido",
             len(vagas_ts), sum(d.aceita for _, d in decisoes_ts),
             sum(1 for v in vagas_ts if v.ats_slug))
    erros = [r for r in resultados if r.erro]
    por_pais = Counter(r.pais for r in mantidas)
    log.info("descoberta: %d sementes, %d mantidas, %d com erro; por país: %s",
             len(resultados), len(mantidas), len(erros), dict(por_pais.most_common()))
    if args.dry_run:
        for r in mantidas[:15]:
            log.info("  %-35s %-15s %-4s vagas_ue=%d/%d", r.semente.nome[:35], r.semente.ats_tipo,
                     r.pais, r.vagas_ue, r.vagas_total)
        for v, d in decisoes_ts[:15]:
            log.info("  [TheirStack %s] %-28s | %s | ATS=%s/%s | %s",
                     "ok" if d.aceita else d.motivo, v.empresa_nome[:28], v.titulo[:50],
                     v.ats_tipo, v.ats_slug, v.regime)
        return
    with Banco(cfg.url, cfg.owner_id) as banco:
        if vagas_ts:  # primeiro, para o teto mensal contar os créditos gastos
            banco.registrar_execucao(theirstack.FONTE, inicio, len(vagas_ts), 0, [])
        for r in mantidas:
            banco.gravar_empresa(r.semente, r.pais)
        novas = 0
        for v, d in decisoes_ts:
            # A empresa entra no banco mesmo que esta vaga seja rejeitada: é empregadora direta
            # com vagas na UE, e a varredura diária lê o ATS dela de graça.
            if filtro.eh_agencia(v.empresa_nome):
                continue
            semente = Semente(nome=v.empresa_nome, ats_tipo=v.ats_tipo, ats_slug=v.ats_slug,
                              dominio=None if v.ats_slug else v.empresa_dominio,
                              lista="theirstack")
            empresa_id = banco.gravar_empresa(semente, d.pais, origem="agregador")
            if d.aceita:
                novas += banco.gravar_vaga(empresa_id, v, d)
    log.info("descoberta gravada: %d empresas das listas, %d vagas do TheirStack (%d novas)",
             len(mantidas), len(vagas_ts), novas)


async def _vagas_das_empresas(rede: Rede, alvos: list[tuple]) -> list[tuple]:
    """alvos: (empresa_id|None, nome, ats_tipo, ats_slug). Devolve (alvo, vagas, erro)."""

    async def uma(alvo: tuple) -> tuple:
        _, nome, tipo, slug = alvo
        try:
            return alvo, await fontes.ATS[tipo].vagas(rede, slug, nome), None
        except ErroFonte as e:
            return alvo, [], str(e)
        except (ValueError, KeyError, TypeError) as e:
            return alvo, [], f"{tipo}/{slug}: formato {type(e).__name__}"

    return await asyncio.gather(*(uma(a) for a in alvos))


async def _vagas_dos_agregadores(rede: Rede) -> list[tuple]:
    resultados = []
    for modulo in fontes.AGREGADORES:
        try:
            resultados.append((modulo.FONTE, await modulo.vagas(rede), None))
        except ErroFonte as e:
            resultados.append((modulo.FONTE, [], str(e)))
        except (ValueError, KeyError, TypeError) as e:
            resultados.append((modulo.FONTE, [], f"formato {type(e).__name__}"))
    return resultados


async def varrer(args: argparse.Namespace, filtro: Filtro, perfil: dict) -> None:
    inicio = datetime.now(UTC)
    banco = None
    if args.dry_run:
        async with Rede() as rede:
            sementes = [s for s in await empresas.carregar_sementes(rede) if s.ats_slug]
            alvos = [(None, s.nome, s.ats_tipo, s.ats_slug) for s in
                     _amostrar(sementes, args.amostra or 30)]
            de_empresas = await _vagas_das_empresas(rede, alvos)
            de_agregadores = await _vagas_dos_agregadores(rede)
    else:
        from .banco import Banco

        cfg = config_banco()
        with Banco(cfg.url, cfg.owner_id) as b:  # conexão curta: a rede demora minutos
            alvos = _amostrar(b.empresas_monitoradas(), args.amostra)
        async with Rede() as rede:
            de_empresas = await _vagas_das_empresas(rede, alvos)
            de_agregadores = await _vagas_dos_agregadores(rede)
        banco = Banco(cfg.url, cfg.owner_id)

    motivos: Counter = Counter()
    lidas: Counter = Counter()
    novas: Counter = Counter()
    erros: dict[str, list[str]] = defaultdict(list)
    aceitas: list[tuple[Vaga, Decisao]] = []

    def avaliar(v: Vaga) -> Decisao:
        d = filtro.avaliar(v)
        motivos["aceita" if d.aceita else d.motivo] += 1
        return d

    try:
        for (empresa_id, nome, tipo, _), vagas, erro in de_empresas:
            if filtro.eh_agencia(nome):
                motivos["agencia"] += len(vagas)
                if banco:
                    banco.marcar_agencia(empresa_id, "lista negra de agências")
                continue
            lidas[tipo] += len(vagas)
            if erro:
                erros[tipo].append(erro)
            for v in vagas:
                d = avaliar(v)
                if not d.aceita:
                    continue
                aceitas.append((v, d))
                if banco:
                    novas[tipo] += banco.gravar_vaga(empresa_id, v, d)
                    if c := contatos.de_vaga(v):
                        banco.gravar_contato(empresa_id, c)
            if banco and not erro:
                banco.desativar_ausentes(tipo, inicio, empresa_id)

        for fonte, vagas, erro in de_agregadores:
            lidas[fonte] += len(vagas)
            if erro:
                erros[fonte].append(erro)
            for v in vagas:
                d = avaliar(v)
                if not d.aceita:
                    continue
                aceitas.append((v, d))
                if banco:
                    empresa_id = banco.empresa_de_agregador(v.empresa_nome, d.pais)
                    novas[fonte] += banco.gravar_vaga(empresa_id, v, d)
            if banco and not erro:
                banco.desativar_ausentes(fonte, inicio, None)

        if banco:
            for fonte in set(lidas) | set(erros):
                banco.registrar_execucao(fonte, inicio, lidas[fonte], novas[fonte], erros[fonte])
            apagados = banco.aplicar_retencao()
            banco.commit()
            log.info("retenção RGPD: %d contatos apagados", apagados)
    except Exception:
        if banco:
            banco.conn.rollback()
        raise
    finally:
        if banco:
            banco.conn.close()

    log.info("lidas por fonte: %s", dict(lidas))
    log.info("decisões: %s", dict(motivos))
    if banco:
        log.info("novas por fonte: %s", dict(novas))
    for fonte, lista in erros.items():
        if lista:  # registrar_execucao lê erros[fonte] e cria listas vazias no defaultdict
            log.warning("erros em %s: %d (ex.: %s)", fonte, len(lista), lista[0])
    if args.dry_run:
        ordem = sorted(aceitas, key=lambda x: (x[1].prioridade or 9, x[1].consultoria))
        for v, d in ordem[:20]:
            log.info("  [%s %s%s] %-28s | %s | %s", d.prioridade, d.pais or "UE",
                     " consultoria" if d.consultoria else "", v.empresa_nome[:28], v.titulo[:60],
                     v.regime)
        return
    await _ia(cfg, perfil)
    await _relatorio(cfg, inicio, sum(lidas.values()), sum(novas.values()))


# Limites por execução (custo controlado; o teto mensal fica no console da Anthropic).
MAX_AVALIACOES = int(os.environ.get("COLETOR_MAX_AVALIACOES", "200"))
MAX_EMAILS = int(os.environ.get("COLETOR_MAX_EMAILS", "20"))
NOTA_MINIMA_EMAIL = 4


async def _ia(cfg, perfil: dict) -> None:
    """Etapa 4: Haiku avalia as vagas sem nota; Sonnet escreve os emails das melhores."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        log.info("IA: ANTHROPIC_API_KEY ausente, etapa pulada")
        return
    from .banco import Banco
    from .ia import IA, MODELO_EMAIL

    ia = IA(perfil)
    sem = asyncio.Semaphore(4)
    with Banco(cfg.url, cfg.owner_id) as b:
        pendentes = b.vagas_sem_avaliacao(MAX_AVALIACOES)

    async def avaliar(linha):
        vaga_id, empresa_id, titulo, empresa, local, descricao = linha
        async with sem:
            try:
                return vaga_id, empresa_id, await ia.avaliar(titulo, empresa, local, descricao)
            except Exception as e:  # noqa: BLE001 (uma vaga com erro não para as outras)
                log.warning("IA: avaliação falhou (%s)", type(e).__name__)
                return vaga_id, empresa_id, None

    avaliacoes = await asyncio.gather(*(avaliar(x) for x in pendentes))
    with Banco(cfg.url, cfg.owner_id) as b:
        for vaga_id, empresa_id, a in avaliacoes:
            if a:
                b.gravar_avaliacao(vaga_id, empresa_id, a)
        candidatas = b.vagas_para_email(MAX_EMAILS, NOTA_MINIMA_EMAIL)
    log.info("IA: %d vagas avaliadas (%d sem resposta); %d candidatas a email",
             sum(1 for *_, a in avaliacoes if a), sum(1 for *_, a in avaliacoes if not a),
             len(candidatas))

    async def escrever(linha):
        vaga_id, empresa_id, titulo, empresa, local, descricao, idioma = linha
        async with sem:
            try:
                e = await ia.escrever_email(titulo, empresa, local, descricao, idioma)
            except Exception as erro:  # noqa: BLE001
                log.warning("IA: email falhou (%s)", type(erro).__name__)
                e = None
        return vaga_id, empresa_id, idioma, e

    emails = await asyncio.gather(*(escrever(x) for x in candidatas))
    with Banco(cfg.url, cfg.owner_id) as b:
        for vaga_id, empresa_id, idioma, e in emails:
            if e:
                b.gravar_email(vaga_id, empresa_id, idioma, e.assunto, e.corpo, MODELO_EMAIL)
    log.info("IA: %d emails gerados", sum(1 for *_, e in emails if e))


async def _relatorio(cfg, inicio: datetime, lidas: int, novas: int) -> None:
    """Etapa 5: relatório diário pelo Resend."""
    chave, destino = os.environ.get("RESEND_API_KEY"), os.environ.get("RELATORIO_DESTINO")
    if not chave or not destino:
        log.info("relatório: RESEND_API_KEY ou RELATORIO_DESTINO ausente, etapa pulada")
        return
    from .banco import Banco

    with Banco(cfg.url, cfg.owner_id) as b:
        vagas = b.vagas_do_relatorio(inicio, 40)
    assunto, corpo = relatorio.montar(vagas, novas, lidas, os.environ.get("SITE_URL"))
    async with Rede() as rede:
        try:
            await relatorio.enviar(rede, chave, destino, assunto, corpo)
        except ErroFonte as e:
            log.warning("relatório não enviado: %s", e)


def main() -> None:
    parser = argparse.ArgumentParser(prog="coletor")
    parser.add_argument("comando", choices=["descobrir", "varrer"])
    parser.add_argument("--amostra", type=int, default=None, help="só N empresas (teste)")
    parser.add_argument("--dry-run", action="store_true", help="não grava nada no banco")
    parser.add_argument("--theirstack", type=int, default=None,
                        help="descobrir: máximo de vagas (= créditos) do TheirStack nesta execução")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)  # não registrar URLs de cada pedido

    carregar_env_local()
    perfil = _perfil_efetivo(args.dry_run)
    filtro = Filtro(perfil, carregar_agencias())
    if args.comando == "descobrir":
        asyncio.run(descobrir(args, filtro))
    else:
        asyncio.run(varrer(args, filtro, perfil))


def _perfil_efetivo(dry_run: bool) -> dict:
    """O perfil editado no site (tabela perfis) manda; config/perfil.yaml é a reserva."""
    if not dry_run:
        from .banco import Banco

        cfg = config_banco()
        with Banco(cfg.url, cfg.owner_id) as b:
            try:
                dados = b.perfil()
            except Exception:  # noqa: BLE001 (tabela ainda não criada: migration 0003)
                b.conn.rollback()
                dados = None
        if dados:
            log.info("perfil: lido do banco")
            return dados
    log.info("perfil: lido de config/perfil.yaml")
    return carregar_perfil()


if __name__ == "__main__":
    main()
