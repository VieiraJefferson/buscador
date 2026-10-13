"""Teamtailor: {slug}.teamtailor.com/jobs.rss (feed RSS oficial)."""

from defusedxml import ElementTree as ET

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto
from ._comum import data_rfc2822

TIPO = "teamtailor"
_NS = "{https://teamtailor.com/locations}"
_REGIME = {"fully": "remoto", "remote": "remoto", "hybrid": "hibrido", "onsite": "presencial"}


def interpretar(xml: bytes | str, slug: str, nome: str) -> list[Vaga]:
    raiz = ET.fromstring(xml)
    vagas = []
    for item in raiz.iter("item"):
        locais = []
        for loc in item.iter(f"{_NS}location"):
            locais += [loc.findtext(f"{_NS}name"), loc.findtext(f"{_NS}city"),
                       loc.findtext(f"{_NS}country")]
        titulo = item.findtext("title") or ""
        link = item.findtext("link") or ""
        if not link.startswith("http"):
            continue
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=item.findtext("guid") or link,
                empresa_nome=item.findtext("company_name") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=titulo,
                url=link,
                descricao=html_para_texto(item.findtext("description")),
                paises=list(paises_de_texto(*locais)),
                europa_generica=europa_generica(titulo, *locais),
                cidade=next((x for x in locais if x), None),
                regime=_REGIME.get((item.findtext("remoteStatus") or "").lower(), "desconhecido"),
                publicada_em=data_rfc2822(item.findtext("pubDate")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(f"https://{slug}.teamtailor.com/jobs.rss")
    return interpretar(r.content, slug, nome) if r else []
