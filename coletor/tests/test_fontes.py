"""Cada fonte converte a resposta real (estrutura de 2026-10-13) no formato padrão."""

import httpx
import respx

from coletor.fontes import (
    arbeitnow,
    ashby,
    bundesagentur,
    greenhouse,
    himalayas,
    landing_jobs,
    lever,
    personio,
    recruitee,
    smartrecruiters,
    teamtailor,
    workable,
)
from coletor.rede import Rede
from tests.conftest import amostra


def test_ashby_le_paises_regime_e_ignora_nao_listadas():
    vagas = ashby.interpretar(amostra("ashby.json"), "exemplo", "Exemplo")
    assert len(vagas) == 1
    v = vagas[0]
    assert v.paises == ["ES", "PT"]
    assert v.regime == "remoto"
    assert v.europa_generica is True
    assert v.ats_tipo == "ashby" and v.ats_slug == "exemplo"


def test_lever_usa_country_e_workplace_type():
    v = lever.interpretar(amostra("lever.json"), "exemplo", "Exemplo")[0]
    assert v.paises == ["NL"]
    assert v.regime == "hibrido"
    assert "Build UI" in v.descricao
    assert v.senioridade is None  # "commitment" é tipo de contrato, não senioridade


def test_greenhouse_desfaz_escape_duplo_e_le_regime_da_localizacao():
    v = greenhouse.interpretar(amostra("greenhouse.json"), "exemplo", "Exemplo")[0]
    assert v.paises == ["DE"]
    assert v.regime == "remoto"
    assert v.descricao == "Node.js & Python"


def test_recruitee_traz_email_da_empresa():
    v = recruitee.interpretar(amostra("recruitee.json"), "exemplo", "Exemplo")[0]
    assert v.paises == ["NL"]
    assert v.regime == "hibrido"
    assert v.contato_origem == "recruitee"
    assert v.contato_email.endswith("@Exemplo.Recruitee.com")


def test_teamtailor_le_rss_com_namespace():
    v = teamtailor.interpretar(amostra("teamtailor.xml"), "exemplo", "Exemplo")[0]
    assert v.paises == ["ES"]
    assert v.regime == "hibrido"
    assert v.url.startswith("https://exemplo.teamtailor.com/")


def test_smartrecruiters_pais_minusculo_vira_iso2():
    v = smartrecruiters.interpretar(amostra("smartrecruiters.json"), "Exemplo", "Exemplo")[0]
    assert v.paises == ["PT"]
    assert v.regime == "hibrido"


def test_workable_telecommuting_e_remoto():
    v = workable.interpretar(amostra("workable.json"), "exemplo", "Exemplo")[0]
    assert v.paises == ["ES"]
    assert v.regime == "remoto"


def test_personio_le_xml_e_descricao():
    v = personio.interpretar(amostra("personio.xml"), "exemplo", "Exemplo")[0]
    assert v.paises == ["DE"]
    assert v.empresa_nome == "Exemplo GmbH"
    assert "TypeScript" in v.descricao
    assert v.url == "https://exemplo.jobs.personio.de/job/2502124"


def test_agregadores():
    a = arbeitnow.interpretar(amostra("arbeitnow.json"))[0]
    assert a.paises == ["DE"] and a.regime == "remoto"
    h = himalayas.interpretar(amostra("himalayas.json"), "ES")[0]
    assert h.paises == ["ES"] and h.regime == "remoto" and h.senioridade == "Mid-level"
    lj = landing_jobs.interpretar(amostra("landing.json"))[0]
    assert lj.empresa_nome == "Exemplo Lda" and lj.paises == ["PT"]
    b = bundesagentur.interpretar(amostra("ba.json"))[0]
    assert b.paises == ["DE"] and b.regime == "hibrido"
    assert b.url.endswith("/jobdetail/11949-1-S")


async def test_slug_invalido_nao_faz_pedido():
    async with Rede() as rede:
        with respx.mock(assert_all_called=False) as mock:
            assert await ashby.vagas(rede, "../admin", "x") == []
            assert mock.calls.call_count == 0


@respx.mock
async def test_lever_tenta_instancia_europeia_quando_global_da_404():
    respx.get("https://api.lever.co/v0/postings/exemplo").mock(return_value=httpx.Response(404))
    respx.get("https://api.eu.lever.co/v0/postings/exemplo").mock(
        return_value=httpx.Response(200, json=amostra("lever.json"))
    )
    async with Rede() as rede:
        vagas = await lever.vagas(rede, "exemplo", "Exemplo")
    assert len(vagas) == 1


@respx.mock
async def test_himalayas_pagina_por_page_e_nao_repete_vagas():
    pagina = amostra("himalayas.json")
    respx.get("https://himalayas.app/jobs/api/search").mock(
        return_value=httpx.Response(200, json=pagina)
    )
    async with Rede() as rede:
        vagas = await himalayas.vagas(rede)
    # a mesma vaga em todas as páginas: só uma por país, e para de paginar
    assert len(vagas) == len(himalayas.PAISES)
