"""Himalayas: himalayas.app/jobs/api/search?country=XX (só remoto; atribuição exigida)."""

from ..modelos import Vaga
from ..rede import Rede
from ..texto import html_para_texto
from ._comum import data_epoch

FONTE = "himalayas"
PAISES = ("ES", "NL", "DE", "PT")
_POR_PAGINA = 20
_MAX_PAGINAS = 3


def interpretar(dados: dict, pais: str) -> list[Vaga]:
    vagas = []
    for j in dados.get("jobs") or []:
        url = j.get("applicationLink") or j.get("guid") or ""
        if not url.startswith("http") or not j.get("companyName"):
            continue
        senioridade = ", ".join(j.get("seniority") or []) or None
        vagas.append(
            Vaga(
                fonte=FONTE,
                id_externo=str(j.get("guid") or url),
                empresa_nome=j["companyName"],
                titulo=j.get("title") or "",
                url=url,
                descricao=html_para_texto(j.get("description")),
                paises=[pais],  # a busca já foi feita por país
                regime="remoto",
                senioridade=senioridade,
                publicada_em=data_epoch(j.get("pubDate")),
            )
        )
    return vagas


async def vagas(rede: Rede) -> list[Vaga]:
    """A busca pagina por `page` (o `offset` é ignorado: testado em 2026-10-13)."""
    todas: dict[tuple[str, str], Vaga] = {}
    for pais in PAISES:
        for pagina in range(1, _MAX_PAGINAS + 1):
            r = await rede.get(
                "https://himalayas.app/jobs/api/search",
                params={"country": pais, "exclude_worldwide": "true", "page": pagina},
            )
            if r is None:
                break
            lote = interpretar(r.json(), pais)
            novas = [v for v in lote if (pais, v.id_externo) not in todas]
            for v in novas:
                todas[(pais, v.id_externo)] = v
            if len(lote) < _POR_PAGINA or not novas:
                break
    return list(todas.values())
