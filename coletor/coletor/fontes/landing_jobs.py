"""Landing.jobs: landing.jobs/api/v1/jobs.

Atenção: pertence a uma consultora (Damia Group); o filtro de agências é obrigatório.
"""

from urllib.parse import urlsplit

from ..modelos import Vaga
from ..rede import Rede
from ..texto import html_para_texto, paises_de_texto
from ._comum import data_iso

FONTE = "landing_jobs"


def _empresa(url: str) -> str | None:
    """O nome da empresa só vem no caminho do URL: /at/{empresa}/{vaga}."""
    partes = urlsplit(url).path.strip("/").split("/")
    if len(partes) >= 2 and partes[0] == "at":
        return partes[1].replace("-", " ").title()
    return None


def interpretar(dados: list) -> list[Vaga]:
    vagas = []
    for j in dados or []:
        url = j.get("url") or ""
        empresa = _empresa(url)
        if not url.startswith("http") or not empresa:
            continue
        locs = j.get("locations") or []
        paises = {loc["country_code"] for loc in locs if loc.get("country_code")}
        cidades = [loc.get("city") for loc in j.get("locations") or []]
        paises |= paises_de_texto(*cidades)
        partes = [html_para_texto(j.get(c)) for c in ("role_description", "main_requirements",
                                                       "nice_to_have", "perks")]
        vagas.append(
            Vaga(
                fonte=FONTE,
                id_externo=str(j.get("id") or url),
                empresa_nome=empresa,
                titulo=j.get("title") or "",
                url=url,
                descricao="\n\n".join(p for p in partes if p)[:20000],
                paises=list(paises),
                cidade=next((c for c in cidades if c), None),
                regime="remoto" if j.get("remote") else "desconhecido",
                publicada_em=data_iso(j.get("published_at")),
            )
        )
    return vagas


async def vagas(rede: Rede) -> list[Vaga]:
    r = await rede.get("https://landing.jobs/api/v1/jobs")
    return interpretar(r.json()) if r else []
