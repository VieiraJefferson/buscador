"""Listas de empresas, detecção de ATS por URL, dedupe, contatos, texto e rede."""

import httpx
import pytest
import respx

from coletor import contatos, empresas
from coletor.dedupe import chave
from coletor.modelos import Semente, Vaga
from coletor.rede import ErroFonte, Rede, slug_valido
from coletor.texto import html_para_texto, normalizar, paises_de_texto, regime_de_texto
from tests.conftest import amostra


@pytest.mark.parametrize(
    ("url", "esperado"),
    [
        ("https://jobs.ashbyhq.com/n8n", ("ashby", "n8n")),
        ("https://jobs.lever.co/spotify/abc", ("lever", "spotify")),
        ("https://jobs.eu.lever.co/mistral", ("lever", "mistral")),
        ("https://boards.greenhouse.io/gitlab", ("greenhouse", "gitlab")),
        ("https://job-boards.greenhouse.io/gitlab/jobs/1", ("greenhouse", "gitlab")),
        ("https://careers.smartrecruiters.com/Ubisoft2", ("smartrecruiters", "Ubisoft2")),
        ("https://apply.workable.com/blueground/", ("workable", "blueground")),
        ("https://vandebron.recruitee.com/", ("recruitee", "vandebron")),
        ("https://apiuxtech.na.teamtailor.com/jobs", ("teamtailor", "apiuxtech")),
        ("https://clidrive.jobs.personio.com/", ("personio", "clidrive")),
        ("https://alan.com/en/careers", None),
        ("https://jobs.lever.co/", None),
    ],
)
def test_ats_de_url(url, esperado):
    assert empresas.ats_de_url(url) == esperado


def test_listas_de_empresas():
    kalil = empresas.sementes_kalil("ashby", amostra("kalil_ashby.csv"))
    assert [(s.nome, s.ats_slug) for s in kalil] == [("0g Labs", "0g")]  # slug inválido fora

    veresk = empresas.sementes_veresk(amostra("veresk.json"))
    assert [(s.ats_tipo, s.ats_slug) for s in veresk] == [("greenhouse", "gitlab")]

    es = empresas.sementes_remote_es(amostra("remote_es.md"))
    assert [(s.nome, s.ats_tipo, s.ats_slug, s.dominio) for s in es] == [
        ("Alan", None, None, "alan.com"),
        ("Clidrive", "personio", "clidrive", None),
        ("Exemplo", "lever", "exemplo", None),
    ]
    assert all(s.pais_indicado == "ES" for s in es)


def test_juntar_remove_repetidas():
    a = Semente(nome="GitLab", ats_tipo="greenhouse", ats_slug="gitlab", lista="kalil0321")
    b = Semente(nome="gitlab", ats_tipo="greenhouse", ats_slug="GitLab", lista="veresk06")
    assert empresas.juntar([a], [b]) == [a]


def test_dedupe_ignora_sufixo_da_empresa_e_marcador_de_genero():
    assert chave("Exemplo GmbH", "Software Engineer (m/w/d)") == chave(
        "Exemplo", "Software Engineer"
    )


def test_contato_do_recruitee_normalizado():
    v = Vaga(fonte="recruitee", id_externo="1", empresa_nome="X", titulo="Dev",
             url="https://x.com", contato_email=" Job.A1@X.Recruitee.com ",
             contato_origem="recruitee")
    c = contatos.de_vaga(v)
    assert c.email == "job.a1@x.recruitee.com" and c.tipo == "ats_mailbox"
    assert contatos.de_vaga(v.model_copy(update={"contato_email": "nao-e-email"})) is None


def test_texto():
    assert html_para_texto("<p>Olá&nbsp;mundo</p><br>fim") == "Olá\xa0mundo\n\nfim"
    assert normalizar("Málaga, España") == "malaga espana"
    assert paises_de_texto("Remote, Germany", "Lisboa") == {"DE", "PT"}
    assert regime_de_texto("Hybrid - Madrid") == "hibrido"
    assert regime_de_texto("Barcelona") == "desconhecido"


def test_slug_valido():
    assert slug_valido("n8n") and slug_valido("1komma5grad") and slug_valido("Ubisoft2")
    for ruim in ("", "../x", "a/b", "x?y=1", "a b", ".oculto", "x" * 101):
        assert not slug_valido(ruim), ruim


def test_url_precisa_ser_http():
    with pytest.raises(ValueError):
        Vaga(fonte="x", id_externo="1", empresa_nome="X", titulo="T", url="javascript:alert(1)")


@respx.mock
async def test_rede_tenta_de_novo_em_503_e_devolve_none_em_404():
    rota = respx.get("https://exemplo.test/a").mock(
        side_effect=[httpx.Response(503), httpx.Response(200, json={"ok": True})]
    )
    respx.get("https://exemplo.test/b").mock(return_value=httpx.Response(404))
    async with Rede(espera_base=0) as rede:
        assert (await rede.get("https://exemplo.test/a")).json() == {"ok": True}
        assert await rede.get("https://exemplo.test/b") is None
    assert rota.call_count == 2


@respx.mock
async def test_rede_levanta_erro_apos_tentativas():
    respx.get("https://exemplo.test/c").mock(return_value=httpx.Response(500))
    async with Rede(espera_base=0, tentativas=2) as rede:
        with pytest.raises(ErroFonte):
            await rede.get("https://exemplo.test/c")
