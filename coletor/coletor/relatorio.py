"""Relatório diário por email via Resend (ADR-0001 seção 8, decisão de 2026-10-13).

Sem domínio próprio, o remetente é onboarding@resend.dev e o destino tem de ser o email da
conta Resend (documentação oficial). A chave tem permissão só de envio.
"""

import html
import logging
from collections import defaultdict

from .rede import Rede

log = logging.getLogger(__name__)

URL_RESEND = "https://api.resend.com/emails"
REMETENTE = "Buscador <onboarding@resend.dev>"
_GRUPOS = {1: "Espanha", 2: "Holanda e Alemanha", 3: "Portugal", 4: "Resto da UE"}
_PRIORIDADE_POR_PAIS = {"ES": 1, "NL": 2, "DE": 2, "PT": 3}


def montar(vagas: list[tuple], novas: int, lidas: int, url_site: str | None) -> tuple[str, str]:
    """Devolve (assunto, html). vagas: linhas de Banco.vagas_do_relatorio."""
    grupos: dict[str, list[tuple]] = defaultdict(list)
    for v in vagas:
        grupos[_GRUPOS[_PRIORIDADE_POR_PAIS.get(v[2] or "", 4)]].append(v)
    com_email = sum(1 for v in vagas if v[7])
    assunto = f"Buscador: {novas} vagas novas hoje ({com_email} com email pronto)"

    def linha(v: tuple) -> str:
        titulo, empresa, pais, regime, nota, consultoria, url, tem_email, justificativa = v
        marcas = []
        if nota:
            marcas.append(f"nota {nota}/5")
        marcas.append(regime)
        if consultoria:
            marcas.append("consultoria")
        if tem_email:
            marcas.append("email pronto")
        just = f"<br><span style='color:#5f6575'>{html.escape(justificativa)}</span>" \
            if justificativa else ""
        return (f"<li style='margin-bottom:10px'><a href='{html.escape(url, quote=True)}' "
                f"style='color:#0b0c10;font-weight:600'>{html.escape(titulo)}</a> · "
                f"{html.escape(empresa)} ({html.escape(pais or 'UE')})<br>"
                f"<span style='color:#0b6e77'>{html.escape(' · '.join(marcas))}</span>{just}</li>")

    partes = [f"<p style='font-family:Inter,Arial,sans-serif'>{lidas} vagas lidas, "
              f"<b>{novas} novas</b> nos seus filtros.</p>"]
    for grupo in _GRUPOS.values():
        if grupos.get(grupo):
            partes.append(f"<h3 style='font-family:Montserrat,Arial,sans-serif'>{grupo}</h3><ul>"
                          + "".join(linha(v) for v in grupos[grupo]) + "</ul>")
    if not vagas:
        partes.append("<p>Nenhuma vaga nova passou nos filtros hoje.</p>")
    if url_site:
        partes.append(f"<p><a href='{html.escape(url_site, quote=True)}'>Abrir o buscador</a></p>")
    return assunto, "<div style='font-family:Inter,Arial,sans-serif'>" + "".join(partes) + "</div>"


async def enviar(rede: Rede, chave: str, destino: str, assunto: str, corpo_html: str) -> bool:
    r = await rede.post(
        URL_RESEND,
        json={"from": REMETENTE, "to": [destino], "subject": assunto, "html": corpo_html},
        headers={"Authorization": f"Bearer {chave}"},
    )
    ok = r is not None
    log.info("relatório %s", "enviado" if ok else "não enviado")
    return ok
