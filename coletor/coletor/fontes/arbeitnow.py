"""Arbeitnow: arbeitnow.com/api/job-board-api (grátis, sem chave; pede para não abusar)."""

from ..modelos import Vaga
from ..rede import Rede
from ..texto import europa_generica, html_para_texto, paises_de_texto, regime_de_texto
from ._comum import data_epoch

FONTE = "arbeitnow"
_MAX_PAGINAS = 3


def interpretar(dados: dict) -> list[Vaga]:
    vagas = []
    for j in dados.get("data") or []:
        url = j.get("url") or ""
        if not url.startswith("http") or not j.get("company_name"):
            continue
        local = j.get("location")
        regime = "remoto" if j.get("remote") else regime_de_texto(j.get("title"), local)
        vagas.append(
            Vaga(
                fonte=FONTE,
                id_externo=str(j.get("slug") or url),
                empresa_nome=j["company_name"],
                titulo=j.get("title") or "",
                url=url,
                descricao=html_para_texto(j.get("description")),
                paises=list(paises_de_texto(local)),
                europa_generica=europa_generica(j.get("title"), local),
                cidade=local,
                regime=regime,
                publicada_em=data_epoch(j.get("created_at")),
            )
        )
    return vagas


async def vagas(rede: Rede) -> list[Vaga]:
    todas: list[Vaga] = []
    for pagina in range(1, _MAX_PAGINAS + 1):
        r = await rede.get("https://www.arbeitnow.com/api/job-board-api", params={"page": pagina})
        if r is None:
            break
        dados = r.json()
        todas += interpretar(dados)
        if not (dados.get("links") or {}).get("next"):
            break
    return todas
