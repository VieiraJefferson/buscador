"""Filtros de país, regime, senioridade, idioma, agência e perfil (ADR-0001)."""

from coletor.modelos import Vaga


def vaga(**campos) -> Vaga:
    base = {
        "fonte": "teste", "id_externo": "1", "empresa_nome": "Produto SL",
        "titulo": "Full Stack Developer", "url": "https://exemplo.com/v/1",
        "descricao": "We use React and Node. English is our working language.",
        "paises": ["ES"], "regime": "hibrido",
    }
    return Vaga(**(base | campos))


def test_aceita_e_prioriza_espanha(filtro):
    d = filtro.avaliar(vaga())
    assert d.aceita and d.pais == "ES" and d.prioridade == 1


def test_escolhe_o_pais_de_melhor_prioridade(filtro):
    d = filtro.avaliar(vaga(paises=["PT", "DE", "FR"]))
    assert d.pais == "DE" and d.prioridade == 2


def test_resto_da_ue_e_prioridade_4_e_fora_da_ue_rejeita(filtro):
    assert filtro.avaliar(vaga(paises=["FR"])).prioridade == 4
    assert filtro.avaliar(vaga(paises=["US"])).motivo == "fora_da_ue"
    assert filtro.avaliar(vaga(paises=["BR"])).motivo == "fora_da_ue"


def test_europa_sem_pais_so_vale_para_remoto(filtro):
    assert filtro.avaliar(vaga(paises=[], europa_generica=True, regime="remoto")).prioridade == 4
    assert filtro.avaliar(vaga(paises=[], europa_generica=True)).motivo == "fora_da_ue"


def test_presencial_e_rejeitado_desconhecido_passa(filtro):
    assert filtro.avaliar(vaga(regime="presencial")).motivo == "regime"
    assert filtro.avaliar(vaga(regime="desconhecido")).aceita


def test_senioridade_mid_e_senior(filtro):
    # Decisão de 2026-10-13: mid e senior entram; júnior, estágio, lead e acima ficam fora.
    for titulo in ("Junior React Developer", "Jr. Frontend Developer", "Lead Developer",
                   "Staff Engineer", "Frontend Architect", "Backend Engineering Manager",
                   "Software Engineer Intern", "Werkstudent Entwicklung", "Graduate Developer"):
        assert filtro.avaliar(vaga(titulo=titulo)).motivo in {"senioridade", "idioma"}, titulo
    for titulo in ("Senior Frontend Engineer", "Sr. Python Developer", "Full Stack Developer",
                   "Mid-level Backend Engineer"):
        assert filtro.avaliar(vaga(titulo=titulo)).aceita, titulo


def test_titulo_fora_do_perfil(filtro):
    assert filtro.avaliar(vaga(titulo="Account Executive - Spain")).motivo == "fora_do_perfil"
    assert filtro.avaliar(vaga(titulo="Sales Engineer")).motivo == "fora_do_perfil"
    assert filtro.avaliar(vaga(titulo="Office Manager")).motivo == "fora_do_perfil"
    assert filtro.avaliar(vaga(titulo="Business Developer Spain")).motivo == "fora_do_perfil"
    titulo = "AI-Enabled Revenue Operations Specialist"
    assert filtro.avaliar(vaga(titulo=titulo)).motivo == "fora_do_perfil"
    assert filtro.avaliar(vaga(titulo="AI Engineer")).aceita


def test_agencia_por_nome_e_por_texto(filtro):
    assert filtro.avaliar(vaga(empresa_nome="Michael Page")).motivo == "agencia"
    assert filtro.avaliar(vaga(empresa_nome="NTT DATA Europe & Latam")).motivo == "agencia"
    texto = "Para importante cliente del sector bancario buscamos desarrollador."
    assert filtro.avaliar(vaga(descricao=texto)).motivo == "agencia"
    texto = "On behalf of our client, a fintech..."
    assert filtro.avaliar(vaga(descricao=texto)).motivo == "agencia"


def test_nome_parecido_com_agencia_nao_e_bloqueado(filtro):
    # "ust" só bloqueia como palavra inteira
    assert filtro.avaliar(vaga(empresa_nome="Trustpilot")).aceita


def test_exigencia_de_alemao_ou_holandes(filtro):
    assert filtro.avaliar(vaga(descricao="Fluent German (C1) is required.")).motivo == "idioma"
    assert filtro.avaliar(vaga(descricao="Sehr gute Deutschkenntnisse.")).motivo == "idioma"
    assert filtro.avaliar(vaga(descricao="Vloeiend Nederlands is een must.")).motivo == "idioma"
    assert filtro.avaliar(vaga(titulo="Softwareentwickler Java")).motivo == "idioma"
    anuncio_de = " ".join(["Wir suchen dich und du bist mit uns bei der Arbeit für das Team."] * 6)
    assert filtro.avaliar(vaga(descricao=anuncio_de)).motivo == "idioma"


def test_espanhol_e_portugues_sao_aceitos(filtro):
    anuncio_es = " ".join(["Buscamos una persona desarrolladora para el equipo de producto."] * 8)
    assert filtro.avaliar(vaga(descricao=anuncio_es)).aceita
