"""Ashby: api.ashbyhq.com/posting-api/job-board/{slug}."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, paises_de_texto, regime_de_texto
from ._comum import data_iso

TIPO = "ashby"
_REGIME = {"remote": "remoto", "hybrid": "hibrido", "onsite": "presencial"}


def interpretar(dados: dict, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for j in dados.get("jobs") or []:
        if j.get("isListed") is False:
            continue
        locais = [j.get("location")]
        pais_principal = ((j.get("address") or {}).get("postalAddress") or {}).get(
            "addressCountry"
        )
        locais.append(pais_principal)
        for sec in j.get("secondaryLocations") or []:
            locais.append(sec.get("location"))
            locais.append(
                ((sec.get("address") or {}).get("postalAddress") or {}).get("addressCountry")
            )
        regime = _REGIME.get((j.get("workplaceType") or "").lower())
        if regime is None:
            regime = "remoto" if j.get("isRemote") else regime_de_texto(j.get("title"), *locais)
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(j["id"]),
                empresa_nome=nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=j.get("title") or "",
                url=j.get("jobUrl") or f"https://jobs.ashbyhq.com/{slug}/{j['id']}",
                descricao=(j.get("descriptionPlain") or "")[:20000],
                paises=list(paises_de_texto(*locais)),
                europa_generica=europa_generica(j.get("title"), *locais),
                cidade=((j.get("address") or {}).get("postalAddress") or {}).get(
                    "addressLocality"
                ),
                regime=regime,
                publicada_em=data_iso(j.get("publishedAt")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    return interpretar(r.json(), slug, nome) if r else []
