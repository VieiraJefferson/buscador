"""TheirStack (plano grátis): descobridor semanal de empregadores diretos.

Cada vaga devolvida custa 1 crédito (doc oficial, 2026-10-13). O plano grátis dá 200 por mês,
por isso os filtros vão no próprio pedido e o orçamento é dividido por prioridade de país.
O `final_url` de cada vaga revela o ATS da empresa, que passa a ser varrida de graça.
"""

from ..modelos import Vaga
from ..rede import Rede
from ..texto import paises_de_texto
from ..urls import ats_de_url, dominio_de_url
from ._comum import data_iso

FONTE = "theirstack"
URL = "https://api.theirstack.com/v1/jobs/search"
LIMITE_MENSAL = 200
ORCAMENTO_SEMANAL = 50
# Divisão do orçamento semanal pela prioridade de país (ADR-0001, seção 2)
DIVISAO = [(("ES",), 25), (("NL", "DE"), 15), (("PT",), 10)]

TITULOS = [
    "full stack", "fullstack", "frontend", "front end", "backend", "back end",
    "react developer", "react engineer", "node developer", "node engineer",
    "software engineer", "software developer", "ai engineer", "typescript", "python developer",
]
TITULOS_EXCLUIDOS = ["lead", "staff", "principal", "architect", "manager", "director", "head",
                     "intern", "junior"]


def corpo(paises: tuple[str, ...], limite: int, agencias: list[str]) -> dict:
    return {
        "posted_at_max_age_days": 7,
        "job_country_code_or": list(paises),
        "company_type": "direct_employer",
        "job_seniority_or": ["mid_level", "senior"],
        "workplace_types_or": ["remote", "hybrid"],
        "job_title_or": TITULOS,
        "job_title_not": TITULOS_EXCLUIDOS,
        "company_name_partial_match_not": agencias,
        "limit": limite,
        "page": 0,
    }


def dividir(orcamento: int) -> list[tuple[tuple[str, ...], int]]:
    """Reparte o orçamento disponível mantendo a proporção 25/15/10."""
    if orcamento <= 0:
        return []
    total = sum(n for _, n in DIVISAO)
    partes = [(p, orcamento * n // total) for p, n in DIVISAO]
    sobra = orcamento - sum(n for _, n in partes)
    partes[0] = (partes[0][0], partes[0][1] + sobra)  # o resto vai para a Espanha
    return [(p, n) for p, n in partes if n > 0]


def interpretar(dados: dict) -> list[Vaga]:
    vagas = []
    for j in dados.get("data") or []:
        url = j.get("final_url") or j.get("url") or ""
        if not url.startswith(("https://", "http://")) or not j.get("company"):
            continue
        ats = ats_de_url(url)
        paises = paises_de_texto(j.get("location"), j.get("long_location"))
        for p in [j.get("country_code"), *(j.get("country_codes") or [])]:
            if p:
                paises.add(p)
        if j.get("remote"):
            regime = "remoto"
        elif j.get("hybrid"):
            regime = "hibrido"
        else:
            regime = "desconhecido"
        dominio = j.get("company_domain") or dominio_de_url(url)
        vagas.append(
            Vaga(
                fonte=FONTE,
                id_externo=str(j.get("id") or url),
                empresa_nome=j["company"],
                empresa_dominio=dominio,
                ats_tipo=ats[0] if ats else None,
                ats_slug=ats[1] if ats else None,
                titulo=j.get("job_title") or "",
                url=url,
                descricao=(j.get("description") or "")[:20000],
                paises=list(paises),
                cidade=j.get("short_location") or j.get("location"),
                regime=regime,
                senioridade=j.get("seniority"),
                publicada_em=data_iso(j.get("date_posted")),
            )
        )
    return vagas


async def vagas(rede: Rede, chave: str, orcamento: int, agencias: list[str]) -> list[Vaga]:
    """Faz no máximo `orcamento` vagas (= créditos). A chave nunca vai para os logs."""
    cabecalho = {"Authorization": f"Bearer {chave}"}
    todas: list[Vaga] = []
    for paises, limite in dividir(orcamento):
        r = await rede.post(URL, json=corpo(paises, limite, agencias), headers=cabecalho)
        if r is not None:
            todas += interpretar(r.json())
    return todas
