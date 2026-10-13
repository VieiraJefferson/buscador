"""Workable: apply.workable.com/api/v1/widget/accounts/{slug}?details=true."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto, regime_de_texto
from ._comum import data_iso

TIPO = "workable"


def interpretar(dados: dict, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for j in dados.get("jobs") or []:
        locais = [j.get("city"), j.get("country")]
        paises = set()
        for loc in j.get("locations") or []:
            if loc.get("countryCode"):
                paises.add(loc["countryCode"])
            locais += [loc.get("city"), loc.get("country")]
        paises |= paises_de_texto(*locais)
        regime = "remoto" if j.get("telecommuting") else regime_de_texto(j.get("title"), *locais)
        url = j.get("url") or j.get("shortlink") or ""
        if not url.startswith("http"):
            continue
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(j.get("shortcode") or url),
                empresa_nome=dados.get("name") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=j.get("title") or "",
                url=url,
                descricao=html_para_texto(j.get("description")),
                paises=list(paises),
                europa_generica=europa_generica(j.get("title"), *locais),
                cidade=j.get("city"),
                regime=regime,
                senioridade=j.get("experience"),
                publicada_em=data_iso(j.get("published_on") or j.get("created_at")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(
        f"https://apply.workable.com/api/v1/widget/accounts/{slug}", params={"details": "true"}
    )
    return interpretar(r.json(), slug, nome) if r else []
