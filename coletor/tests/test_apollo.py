"""Apollo (ADR-0005): escolhas e custos com respostas simuladas; nenhuma chamada real."""

import json

import httpx
import respx

from coletor.fontes import apollo
from coletor.rede import Rede
from tests.conftest import amostra


def test_organizacao_so_aceita_nome_igual_e_limpa_dominio():
    org = apollo.escolher_organizacao(amostra("apollo_empresas.json"), "Exemplo")
    assert org == apollo.Organizacao(id="org-1", dominio="exemplo.com")
    assert apollo.escolher_organizacao(amostra("apollo_empresas.json"), "Outra") is None


def test_pessoas_por_faixa_de_cargo_e_so_com_email():
    ids = [p.id for p in apollo.escolher_pessoas(amostra("apollo_pessoas.json"))]
    assert ids == ["p-ta", "p-em", "p-ceo"]  # recrutamento > engenharia > fundador; sem vendas


def test_match_so_aceita_email_verificado():
    e = apollo.interpretar_match(amostra("apollo_match.json"))
    assert e == apollo.Encontrado(email="marta.silva@exemplo.com", nome="Marta Silva",
                                  cargo="Talent Acquisition Partner")
    nao_verificado = amostra("apollo_match.json")
    nao_verificado["person"]["email_status"] = "guessed"
    assert apollo.interpretar_match(nao_verificado) is None


@respx.mock
async def test_fluxo_sem_dominio_conta_creditos_e_nao_revela_email_pessoal():
    respx.post(f"{apollo.BASE}/mixed_companies/search").mock(
        return_value=httpx.Response(200, json=amostra("apollo_empresas.json")))
    pessoas = respx.post(f"{apollo.BASE}/mixed_people/api_search").mock(
        return_value=httpx.Response(200, json=amostra("apollo_pessoas.json")))
    match = respx.post(f"{apollo.BASE}/people/match").mock(
        return_value=httpx.Response(200, json=amostra("apollo_match.json")))
    async with Rede(tentativas=1) as rede:
        cliente = apollo.Apollo(rede, "chave-falsa")
        org, achado = await cliente.contato_da_empresa("Exemplo", None)
    assert org.dominio == "exemplo.com"
    assert achado.email == "marta.silva@exemplo.com"
    assert cliente.creditos == 2  # 1 busca de empresa + 1 match
    assert json.loads(pessoas.calls[0].request.content)["q_organization_domains_list"] == [
        "exemplo.com"]
    corpo_match = json.loads(match.calls[0].request.content)
    assert corpo_match["reveal_personal_emails"] is False
    assert match.calls[0].request.headers["x-api-key"] == "chave-falsa"


@respx.mock
async def test_com_dominio_nao_gasta_busca_de_empresa_e_limita_matches():
    empresas = respx.post(f"{apollo.BASE}/mixed_companies/search")
    respx.post(f"{apollo.BASE}/mixed_people/api_search").mock(
        return_value=httpx.Response(200, json=amostra("apollo_pessoas.json")))
    sem_email = {"person": {"id": "x", "email": None, "email_status": "unavailable"}}
    match = respx.post(f"{apollo.BASE}/people/match").mock(
        return_value=httpx.Response(200, json=sem_email))
    async with Rede(tentativas=1) as rede:
        cliente = apollo.Apollo(rede, "chave-falsa")
        org, achado = await cliente.contato_da_empresa("Exemplo", "exemplo.com")
    assert achado is None and org.dominio == "exemplo.com"
    assert not empresas.called
    assert match.call_count == apollo.MAX_PESSOAS_REVELADAS == cliente.creditos
