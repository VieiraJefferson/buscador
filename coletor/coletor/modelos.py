"""Formato padrão de vaga e de empresa, igual para todas as fontes."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Regime = Literal["remoto", "hibrido", "presencial", "desconhecido"]


class Vaga(BaseModel):
    fonte: str
    id_externo: str
    empresa_nome: str
    empresa_dominio: str | None = None
    ats_tipo: str | None = None
    ats_slug: str | None = None
    titulo: str
    url: str
    descricao: str = ""
    paises: list[str] = Field(default_factory=list)  # ISO-2, maiúsculas
    europa_generica: bool = False  # a vaga diz "Europe", "EU", "EMEA"... sem país
    cidade: str | None = None
    regime: Regime = "desconhecido"
    senioridade: str | None = None
    publicada_em: datetime | None = None
    contato_email: str | None = None
    contato_origem: str | None = None

    @field_validator("url")
    @classmethod
    def url_http(cls, v: str) -> str:
        if not v.startswith(("https://", "http://")):
            raise ValueError("url precisa ser http(s)")
        return v

    @field_validator("paises")
    @classmethod
    def paises_iso2(cls, v: list[str]) -> list[str]:
        return sorted({p.upper() for p in v if len(p) == 2 and p.isalpha()})


class Semente(BaseModel):
    """Empresa candidata vinda de uma lista aberta, antes de ser validada."""

    nome: str
    ats_tipo: str | None = None
    ats_slug: str | None = None
    dominio: str | None = None
    lista: str  # de que lista veio (kalil0321, veresk06, remote-es)
    pais_indicado: str | None = None  # quando a lista é de um país (remote-es = ES)
