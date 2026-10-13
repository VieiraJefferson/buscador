"""Recruitee: {slug}.recruitee.com/api/offers/. Traz o email de candidaturas da empresa."""

from ..modelos import Vaga
from ..rede import Rede, slug_valido
from ..texto import europa_generica, html_para_texto, paises_de_texto
from ._comum import data_iso

TIPO = "recruitee"


def interpretar(dados: dict, slug: str, nome: str) -> list[Vaga]:
    vagas = []
    for o in dados.get("offers") or []:
        paises = {o["country_code"]} if o.get("country_code") else set()
        locais = [o.get("location"), o.get("city"), o.get("country")]
        for loc in o.get("locations") or []:
            if loc.get("country_code"):
                paises.add(loc["country_code"])
            locais += [loc.get("city"), loc.get("country")]
        paises |= paises_de_texto(*locais)
        if o.get("remote"):
            regime = "remoto"
        elif o.get("hybrid"):
            regime = "hibrido"
        elif o.get("on_site"):
            regime = "presencial"
        else:
            regime = "desconhecido"
        vagas.append(
            Vaga(
                fonte=TIPO,
                id_externo=str(o["id"]),
                empresa_nome=o.get("company_name") or nome,
                ats_tipo=TIPO,
                ats_slug=slug,
                titulo=o.get("title") or "",
                url=o.get("careers_url") or f"https://{slug}.recruitee.com/o/{o.get('slug')}",
                descricao=html_para_texto(o.get("description")),
                paises=list(paises),
                europa_generica=europa_generica(o.get("title"), *locais),
                cidade=o.get("city"),
                regime=regime,
                senioridade=o.get("experience_code"),
                publicada_em=data_iso(o.get("published_at") or o.get("created_at")),
                contato_email=o.get("mailbox_email"),
                contato_origem="recruitee",
            )
        )
    return vagas


async def vagas(rede: Rede, slug: str, nome: str, com_descricao: bool = True) -> list[Vaga]:
    if not slug_valido(slug):
        return []
    r = await rede.get(f"https://{slug}.recruitee.com/api/offers/")
    return interpretar(r.json(), slug, nome) if r else []
