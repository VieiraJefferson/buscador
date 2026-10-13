"""Personio: {slug}.jobs.personio.de/xml (ou .com)."""

from defusedxml import ElementTree as ET

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto, regime_de_texto
from ._comum import data_iso

TIPO = "personio"


def interpretar(xml: bytes | str, slug: str, nome: str, dominio: str = "de") -> list[Vaga]:
    raiz = ET.fromstring(xml)
    vagas = []
    for p in raiz.iter("position"):
        pid = p.findtext("id")
        if not pid:
            continue
        locais = [p.findtext("office")]
        locais += [o.text for o in p.iter("office") if o.text]
        partes = []
        for d in p.iter("jobDescription"):
            partes.append(f"{d.findtext('name') or ''}\n{html_para_texto(d.findtext('value'))}")
        titulo = p.findtext("name") or ""
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=pid,
                empresa_nome=p.findtext("subcompany") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=titulo,
                url=f"https://{slug}.jobs.personio.{dominio}/job/{pid}",
                descricao="\n\n".join(partes)[:20000],
                paises=list(paises_de_texto(*locais)),
                europa_generica=europa_generica(titulo, *locais),
                cidade=p.findtext("office"),
                regime=regime_de_texto(titulo, *locais),
                senioridade=p.findtext("seniority"),
                publicada_em=data_iso(p.findtext("createdAt")),
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    for dominio in ("de", "com"):
        r = await rede.get(f"https://{slug}.jobs.personio.{dominio}/xml")
        if r is not None:
            return interpretar(r.content, slug, nome, dominio)
    return []
