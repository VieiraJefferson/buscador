"""Contatos de email vindos das próprias fontes (por agora, o mailbox do Recruitee)."""

import re
from dataclasses import dataclass

from .modelos import Vaga

_EMAIL = re.compile(r"[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+")
_TIPOS = {"recruitee": "ats_mailbox"}


@dataclass(frozen=True)
class Contato:
    email: str
    tipo: str  # ats_mailbox | generico | nominal (check do banco)
    origem: str  # check do banco: recruitee, itjobs, join, site, padrao, hunter, manual


def de_vaga(v: Vaga) -> Contato | None:
    if not v.contato_email or v.contato_origem not in _TIPOS:
        return None
    email = v.contato_email.strip().lower()
    if not _EMAIL.fullmatch(email):
        return None
    return Contato(email=email, tipo=_TIPOS[v.contato_origem], origem=v.contato_origem)
