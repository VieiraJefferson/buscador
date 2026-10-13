"""Reconhecimento do ATS e do domínio a partir de um URL (sem dependências internas)."""

import re
from urllib.parse import urlsplit

from .rede import slug_valido

# (padrão do host, onde está o slug: "caminho" ou "subdominio")
_PADROES_ATS = [
    (re.compile(r"^jobs\.ashbyhq\.com$"), "ashby", "caminho"),
    (re.compile(r"^jobs(\.eu)?\.lever\.co$"), "lever", "caminho"),
    (re.compile(r"^(job-)?boards\.greenhouse\.io$"), "greenhouse", "caminho"),
    (re.compile(r"^(careers|jobs)\.smartrecruiters\.com$"), "smartrecruiters", "caminho"),
    (re.compile(r"^apply\.workable\.com$"), "workable", "caminho"),
    (re.compile(r"^([^.]+)\.recruitee\.com$"), "recruitee", "subdominio"),
    (re.compile(r"^([^.]+)(\.[a-z]{2})?\.teamtailor\.com$"), "teamtailor", "subdominio"),
    (re.compile(r"^([^.]+)\.jobs\.personio\.(de|com)$"), "personio", "subdominio"),
]


def ats_de_url(url: str) -> tuple[str, str] | None:
    """Reconhece o ATS e o slug num link de página de vagas."""
    partes = urlsplit(url)
    host = (partes.hostname or "").lower()
    for padrao, tipo, onde in _PADROES_ATS:
        m = padrao.match(host)
        if not m:
            continue
        if onde == "subdominio":
            slug = m.group(1)
        else:
            caminho = [p for p in partes.path.split("/") if p]
            slug = caminho[0] if caminho else ""
        if slug_valido(slug) and slug not in {"www", "api", "careers", "jobs", "embed"}:
            return tipo, slug
    return None


def dominio_de_url(url: str) -> str | None:
    host = (urlsplit(url).hostname or "").lower()
    for prefixo in ("www.", "careers.", "jobs.", "join.", "work."):
        if host.startswith(prefixo):
            host = host[len(prefixo):]
    return host or None
