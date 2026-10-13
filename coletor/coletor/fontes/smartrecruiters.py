"""SmartRecruiters: api.smartrecruiters.com/v1/companies/{slug}/postings (paginado)."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, paises_de_texto
from ._comum import data_iso

TIPO = "smartrecruiters"
_POR_PAGINA = 100
_MAX_PAGINAS = 10


def interpretar(dados: dict, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for j in dados.get("content") or []:
        loc = j.get("location") or {}
        paises = paises_de_texto(loc.get("fullLocation"))
        if loc.get("country"):
            paises.add(loc["country"].upper())
        if loc.get("remote"):
            regime = "remoto"
        elif loc.get("hybrid"):
            regime = "hibrido"
        else:
            regime = "presencial"  # a API marca remoto e híbrido explicitamente
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(j["id"]),
                empresa_nome=(j.get("company") or {}).get("name") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=j.get("name") or "",
                url=f"https://jobs.smartrecruiters.com/{slug}/{j['id']}",
                paises=list(paises),
                europa_generica=europa_generica(j.get("name"), loc.get("fullLocation")),
                cidade=loc.get("city"),
                regime=regime,
                senioridade=(j.get("experienceLevel") or {}).get("id"),
                publicada_em=data_iso(j.get("releasedDate")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    todas: list[Vaga] = []
    for pagina in range(_MAX_PAGINAS):
        r = await rede.get(
            f"https://api.smartrecruiters.com/v1/companies/{slug}/postings",
            params={"limit": _POR_PAGINA, "offset": pagina * _POR_PAGINA},
        )
        if r is None:
            break
        dados = r.json()
        todas += interpretar(dados, slug, nome)
        if (pagina + 1) * _POR_PAGINA >= (dados.get("totalFound") or 0):
            break
    return todas
