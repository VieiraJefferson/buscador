"""Linha de comando do coletor.

    python -m coletor descobrir [--amostra N] [--dry-run]   # lista de empresas (semanal)
    python -m coletor varrer    [--amostra N] [--dry-run]   # vagas (diária)

Com --dry-run nada é gravado: mostra só os números e alguns exemplos.
"""

import argparse
import asyncio
import logging
import random
from collections import Counter, defaultdict
from datetime import UTC, datetime

from . import contatos, empresas, fontes
from .config import carregar_agencias, carregar_env_local, carregar_perfil, config_banco
from .filtros import Decisao, Filtro
from .modelos import Semente, Vaga
from .rede import ErroFonte, Rede

log = logging.getLogger("coletor")


def _amostrar(sementes: list[Semente], n: int | None) -> list[Semente]:
    if not n or n >= len(sementes):
        return sementes
    return random.Random(42).sample(sementes, n)  # noqa: S311 (amostra reproduzível, não é segurança)


async def descobrir(args: argparse.Namespace, filtro: Filtro) -> None:
    async with Rede() as rede:
        sementes = _amostrar(await empresas.carregar_sementes(rede), args.amostra)
        resultados = await empresas.validar_todas(rede, filtro, sementes)
    mantidas = [r for r in resultados if r.manter]
    erros = [r for r in resultados if r.erro]
    por_pais = Counter(r.pais for r in mantidas)
    log.info("descoberta: %d sementes, %d mantidas, %d com erro; por país: %s",
             len(resultados), len(mantidas), len(erros), dict(por_pais.most_common()))
    if args.dry_run:
        for r in mantidas[:15]:
            log.info("  %-35s %-15s %-4s vagas_ue=%d/%d", r.semente.nome[:35], r.semente.ats_tipo,
                     r.pais, r.vagas_ue, r.vagas_total)
        return
    from .banco import Banco

    cfg = config_banco()
    with Banco(cfg.url, cfg.owner_id) as banco:
        for r in mantidas:
            banco.gravar_empresa(r.semente, r.pais)
    log.info("descoberta gravada: %d empresas", len(mantidas))


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


async def varrer(args: argparse.Namespace, filtro: Filtro) -> None:
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
        banco = Banco(cfg.url, cfg.owner_id)
        alvos = _amostrar(banco.empresas_monitoradas(), args.amostra)
        async with Rede() as rede:
            de_empresas = await _vagas_das_empresas(rede, alvos)
            de_agregadores = await _vagas_dos_agregadores(rede)

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
        log.warning("erros em %s: %d (ex.: %s)", fonte, len(lista), lista[0])
    if args.dry_run:
        for v, d in sorted(aceitas, key=lambda x: x[1].prioridade or 9)[:20]:
            log.info("  [%s %s] %-28s | %s | %s", d.prioridade, d.pais or "UE", v.empresa_nome[:28],
                     v.titulo[:60], v.regime)


def main() -> None:
    parser = argparse.ArgumentParser(prog="coletor")
    parser.add_argument("comando", choices=["descobrir", "varrer"])
    parser.add_argument("--amostra", type=int, default=None, help="só N empresas (teste)")
    parser.add_argument("--dry-run", action="store_true", help="não grava nada no banco")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)  # não registrar URLs de cada pedido

    carregar_env_local()
    filtro = Filtro(carregar_perfil(), carregar_agencias())
    asyncio.run(descobrir(args, filtro) if args.comando == "descobrir" else varrer(args, filtro))


if __name__ == "__main__":
    main()
