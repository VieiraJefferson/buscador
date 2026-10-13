"""Lever: api.lever.co/v0/postings/{slug}?mode=json."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto, regime_de_texto
from ._comum import data_epoch

TIPO = "lever"
_REGIME = {"remote": "remoto", "hybrid": "hibrido", "onsite": "presencial"}


def interpretar(dados: list, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for j in dados or []:
        cat = j.get("categories") or {}
        locais = [cat.get("location"), *(cat.get("allLocations") or [])]
        paises = paises_de_texto(*locais)
        if j.get("country"):
            paises.add(j["country"])
        regime = _REGIME.get((j.get("workplaceType") or "").lower()) or regime_de_texto(
            j.get("text"), *locais
        )
        partes = [j.get("descriptionPlain") or ""]
        partes += [f"{x.get('text', '')}\n{html_para_texto(x.get('content'))}" for x in
                   j.get("lists") or []]
        partes.append(j.get("additionalPlain") or "")
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(j["id"]),
                empresa_nome=nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=j.get("text") or "",
                url=j.get("hostedUrl") or f"https://jobs.lever.co/{slug}/{j['id']}",
                descricao="\n\n".join(p for p in partes if p)[:20000],
                paises=list(paises),
                europa_generica=europa_generica(j.get("text"), *locais),
                cidade=cat.get("location"),
                regime=regime,
                publicada_em=data_epoch(j.get("createdAt"), milissegundos=True),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(f"https://api.lever.co/v0/postings/{slug}", params={"mode": "json"})
    if r is None:  # empresas na instância europeia do Lever
        r = await rede.get(f"https://api.eu.lever.co/v0/postings/{slug}", params={"mode": "json"})
    return interpretar(r.json(), slug, nome) if r else []
