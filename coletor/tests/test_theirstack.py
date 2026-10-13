"""TheirStack: filtros no pedido, orçamento de créditos e empresa a partir do final_url."""

import json

import httpx
import respx

from coletor.__main__ import _agencias_para_api
from coletor.fontes import theirstack
from coletor.rede import Rede
from tests.conftest import amostra


def test_divide_orcamento_pela_prioridade_de_pais():
    assert theirstack.dividir(50) == [(("ES",), 25), (("NL", "DE"), 15), (("PT",), 10)]
    assert theirstack.dividir(5) == [(("ES",), 3), (("NL", "DE"), 1), (("PT",), 1)]
    assert theirstack.dividir(0) == []


def test_interpreta_vagas_e_reconhece_ats_pelo_final_url():
    v1, v2 = theirstack.interpretar(amostra("theirstack.json"))  # a terceira não tem URL
    assert (v1.ats_tipo, v1.ats_slug) == ("ashby", "produto")
    assert v1.paises == ["ES"] and v1.regime == "hibrido" and v1.senioridade == "mid_level"
    assert v1.url == "https://jobs.ashbyhq.com/produto/abc-123"
    assert v2.ats_slug is None and v2.empresa_dominio == "semats.nl" and v2.regime == "remoto"


@respx.mock
async def test_pedido_leva_os_filtros_e_respeita_o_orcamento():
    rota = respx.post(theirstack.URL).mock(
        return_value=httpx.Response(200, json=amostra("theirstack.json"))
    )
    async with Rede() as rede:
        await theirstack.vagas(rede, "chave-falsa", 5, ["michael page"])
    corpos = [json.loads(c.request.content) for c in rota.calls]
    assert [c["limit"] for c in corpos] == [3, 1, 1]  # soma = orçamento = créditos máximos
    c = corpos[0]
    assert c["company_type"] == "direct_employer"
    assert c["job_seniority_or"] == ["mid_level", "senior"]
    assert c["workplace_types_or"] == ["remote", "hybrid"]
    assert c["job_country_code_or"] == ["ES"]
    assert "lead" in c["job_title_not"] and c["company_name_partial_match_not"] == ["michael page"]
    assert rota.calls[0].request.headers["Authorization"] == "Bearer chave-falsa"


@respx.mock
async def test_sem_orcamento_nao_faz_pedido():
    rota = respx.post(theirstack.URL)
    async with Rede() as rede:
        assert await theirstack.vagas(rede, "chave-falsa", 0, []) == []
    assert rota.call_count == 0


def test_so_nomes_longos_de_agencia_vao_para_a_api():
    nomes = _agencias_para_api()
    assert "michael page" in nomes and "accenture" in nomes
    assert "ust" not in nomes and "ey" not in nomes and "hays" not in nomes
