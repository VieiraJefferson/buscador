"""Descoberta de empresas a partir de listas abertas (ver docs/planos/2026-10-13-*).

As listas são lidas na hora (não são copiadas para o repositório):
- kalil0321/ats-scrapers (MIT): um CSV por ATS, colunas name,slug,url;
- veresk06/open-ats-feed (MIT): slugs vivos por ATS;
- remote-es/remotes (sem licença: só consulta): empresas com contrato espanhol.
"""

import asyncio
import csv
import io
import logging
import re
from collections import Counter
from dataclasses import dataclass

from . import fontes
from .filtros import Filtro
from .modelos import Semente
from .rede import ErroFonte, Rede, slug_valido
from .urls import ats_de_url, dominio_de_url  # noqa: F401 (reexportados)

log = logging.getLogger(__name__)

URL_KALIL = "https://raw.githubusercontent.com/kalil0321/ats-scrapers/main/ats-companies/{ats}.csv"
URL_VERESK = "https://raw.githubusercontent.com/veresk06/open-ats-feed/main/actor/data/companies.json"
URL_REMOTE_ES = "https://raw.githubusercontent.com/remote-es/remotes/master/README.md"

_LINHA_REMOTE_ES = re.compile(r"^\s*[*-]\s+(?P<nome>[^\[]+?)\s*\[[^\]]*\]\((?P<url>https?://[^)\s]+)\)")


def sementes_kalil(ats: str, texto_csv: str) -> list[Semente]:
    sementes = []
    for linha in csv.DictReader(io.StringIO(texto_csv)):
        slug = (linha.get("slug") or "").strip()
        if slug_valido(slug):
            sementes.append(Semente(nome=(linha.get("name") or slug).strip(), ats_tipo=ats,
                                    ats_slug=slug, lista="kalil0321"))
    return sementes


def sementes_veresk(dados: dict) -> list[Semente]:
    sementes = []
    for ats, info in (dados.get("providers") or {}).items():
        if ats not in fontes.ATS:
            continue
        for item in (info or {}).get("live") or []:
            slug = item[0] if isinstance(item, list) and item else None
            if slug_valido(slug):
                sementes.append(Semente(nome=slug, ats_tipo=ats, ats_slug=slug, lista="veresk06"))
    return sementes


def sementes_remote_es(markdown: str) -> list[Semente]:
    sementes = []
    for linha in markdown.splitlines():
        m = _LINHA_REMOTE_ES.match(linha)
        if not m:
            continue
        nome, url = m.group("nome").strip(), m.group("url")
        ats = ats_de_url(url)
        sementes.append(Semente(
            nome=nome,
            ats_tipo=ats[0] if ats else None,
            ats_slug=ats[1] if ats else None,
            dominio=None if ats else dominio_de_url(url),
            lista="remote-es",
            pais_indicado="ES",
        ))
    return sementes


def juntar(*listas: list[Semente]) -> list[Semente]:
    """Remove repetidas por (ATS, slug) ou domínio, mantendo a primeira (a de melhor nome)."""
    vistas: set[tuple] = set()
    resultado = []
    for lista in listas:
        for s in lista:
            chave = (s.ats_tipo, s.ats_slug.lower()) if s.ats_slug else ("dominio", s.dominio)
            if chave in vistas or chave == ("dominio", None):
                continue
            vistas.add(chave)
            resultado.append(s)
    return resultado


async def carregar_sementes(rede: Rede) -> list[Semente]:
    kalil: list[Semente] = []
    for ats in fontes.ATS:
        try:
            r = await rede.get(URL_KALIL.format(ats=ats))
            kalil += sementes_kalil(ats, r.text) if r else []
        except ErroFonte as e:
            log.warning("lista kalil0321/%s indisponível: %s", ats, e)
    veresk: list[Semente] = []
    try:
        r = await rede.get(URL_VERESK)
        veresk = sementes_veresk(r.json()) if r else []
    except ErroFonte as e:
        log.warning("lista veresk06 indisponível: %s", e)
    remote_es: list[Semente] = []
    try:
        r = await rede.get(URL_REMOTE_ES)
        remote_es = sementes_remote_es(r.text) if r else []
    except ErroFonte as e:
        log.warning("lista remote-es indisponível: %s", e)
    log.info("sementes: kalil0321=%d veresk06=%d remote-es=%d", len(kalil), len(veresk),
             len(remote_es))
    return juntar(remote_es, kalil, veresk)


@dataclass
class Resultado:
    semente: Semente
    pais: str | None = None  # país mais frequente entre as vagas na UE
    vagas_ue: int = 0
    vagas_total: int = 0
    erro: str | None = None

    @property
    def manter(self) -> bool:
        """Fica no banco se tem vagas na UE, ou se veio da lista espanhola sem ATS."""
        return self.vagas_ue > 0 or (self.semente.ats_tipo is None and bool(self.semente.dominio))


async def validar(rede: Rede, filtro: Filtro, s: Semente) -> Resultado:
    if not s.ats_tipo or not s.ats_slug:
        return Resultado(s, pais=s.pais_indicado)
    try:
        vagas = await fontes.ATS[s.ats_tipo].vagas(rede, s.ats_slug, s.nome, com_descricao=False)
    except ErroFonte as e:
        return Resultado(s, erro=str(e))
    except (ValueError, KeyError, TypeError) as e:  # resposta em formato inesperado
        return Resultado(s, erro=f"formato: {type(e).__name__}")
    paises = Counter()
    for v in vagas:
        pais, prioridade = filtro.prioridade_pais(v)
        if prioridade is not None:
            paises[pais] += 1
    return Resultado(
        s,
        pais=(paises.most_common(1)[0][0] if paises else None) or s.pais_indicado,
        vagas_ue=sum(paises.values()),
        vagas_total=len(vagas),
    )


async def validar_todas(rede: Rede, filtro: Filtro, sementes: list[Semente]) -> list[Resultado]:
    feitos = 0

    async def uma(s: Semente) -> Resultado:
        nonlocal feitos
        r = await validar(rede, filtro, s)
        feitos += 1
        if feitos % 500 == 0:
            log.info("descoberta: %d/%d empresas verificadas", feitos, len(sementes))
        return r

    return await asyncio.gather(*(uma(s) for s in sementes))
