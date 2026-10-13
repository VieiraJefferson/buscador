"""Greenhouse: boards-api.greenhouse.io/v1/boards/{slug}/jobs."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto, regime_de_texto
from ._comum import data_iso

TIPO = "greenhouse"


def interpretar(dados: dict, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for j in dados.get("jobs") or []:
        locais = [(j.get("location") or {}).get("name")]
        for o in j.get("offices") or []:
            locais += [o.get("name"), o.get("location")]
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(j["id"]),
                empresa_nome=j.get("company_name") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=j.get("title") or "",
                url=j.get("absolute_url") or f"https://job-boards.greenhouse.io/{slug}/jobs/{j['id']}",
                descricao=html_para_texto(j.get("content")),
                paises=list(paises_de_texto(*locais)),
                europa_generica=europa_generica(j.get("title"), *locais),
                cidade=(j.get("location") or {}).get("name"),
                regime=regime_de_texto(j.get("title"), *locais),
                publicada_em=data_iso(j.get("first_published") or j.get("updated_at")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(
        f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs",
        params={"content": "true" if com_descricao else "false"},
    )
    return interpretar(r.json(), slug, nome) if r else []
