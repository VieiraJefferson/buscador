"""Bundesagentur für Arbeit, Jobsuche v6 (DE).

Chave pública fixa. `zeitarbeit=false&pav=false` exclui ETT e agências privadas. O filtro de
home office por parâmetro não funciona na v6, por isso usa-se o campo `homeofficemoeglich`.
"""

from ..modelos import Vaga
from ..rede import Rede
from ..texto import paises_de_texto
from ._comum import data_iso

FONTE = "bundesagentur"
_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs"
_CABECALHO = {"X-API-Key": "jobboerse-jobsuche"}  # chave pública documentada, não é segredo
BUSCAS = ("Softwareentwickler", "Webentwickler", "Frontend Developer", "Full Stack Developer",
          "Backend Developer")
_POR_PAGINA = 50
_MAX_PAGINAS = 2


def interpretar(dados: dict) -> list[Vaga]:
    vagas = []
    for j in dados.get("ergebnisliste") or []:
        refnr = j.get("referenznummer") or j.get("refnr")
        if not refnr or not j.get("firma"):
            continue
        locais = []
        for loc in j.get("stellenlokationen") or []:
            a = loc.get("adresse") or {}
            locais += [a.get("land"), a.get("ort")]
        url = j.get("externeURL") or f"https://www.arbeitsagentur.de/jobsuche/jobdetail/{refnr}"
        if not url.startswith("http"):
            continue
        vagas.append(
            Vaga(
                fonte=FONTE,
                id_externo=str(refnr),
                empresa_nome=j["firma"],
                titulo=j.get("stellenangebotsTitel") or j.get("hauptberuf") or "",
                url=url,
                paises=list(paises_de_texto(*locais)),
                cidade=next((x for x in locais[1::2] if x), None),
                regime="hibrido" if j.get("homeofficemoeglich") else "presencial",
                publicada_em=data_iso(j.get("datumErsteVeroeffentlichung")),
            )
        )
    return vagas


async def vagas(rede: Rede) -> list[Vaga]:
    todas: dict[str, Vaga] = {}
    for busca in BUSCAS:
        for pagina in range(1, _MAX_PAGINAS + 1):
            r = await rede.get(
                _URL,
                params={"was": busca, "page": pagina, "size": _POR_PAGINA,
                        "zeitarbeit": "false", "pav": "false"},
                headers=_CABECALHO,
            )
            if r is None:
                break
            lote = interpretar(r.json())
            for v in lote:
                todas[v.id_externo] = v
            if len(lote) < _POR_PAGINA:
                break
    return list(todas.values())
