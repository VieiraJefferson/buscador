"""Apollo (plano Basic): email profissional de quem recruta em empresas com vaga de nota 4 ou 5.

Decisão: ADR-0005. Só roda depois da busca, dos filtros e da nota da IA; uma consulta por
empresa (empresas.apollo_consultado_em), nunca por vaga.

Custos (docs.apollo.io/docs/api-pricing, 2026-11-02):
- busca de empresas (`mixed_companies/search`): 1 crédito por página;
- busca de pessoas (`mixed_people/api_search`): 0 créditos, não devolve email;
- `people/match`: 1 crédito quando encontra dados (email ou demografia).

RGPD: `reveal_personal_emails` fica desligado; só emails profissionais com status `verified`.
A chave vai no cabeçalho `x-api-key` e nunca nos logs.
"""

import re
import unicodedata
from dataclasses import dataclass

from ..rede import Rede

FONTE = "apollo"
BASE = "https://api.apollo.io/api/v1"

# Ordem de preferência: quem recruta, depois RH, depois quem lidera engenharia.
FAIXAS_DE_CARGO: list[tuple[str, ...]] = [
    ("talent acquisition", "recruit", "recruiting", "recruiter", "reclut", "recrut", "sourcer"),
    ("people", "human resources", "hr ", "hr,", "rrhh", "recursos humanos", "personal"),
    ("engineering manager", "head of engineering", "vp engineering", "cto",
     "chief technology", "director of engineering"),
    ("founder", "ceo", "co-founder"),
]
TITULOS_BUSCA = [
    "recruiter", "technical recruiter", "talent acquisition", "talent partner", "head of talent",
    "people partner", "hr manager", "human resources", "engineering manager",
    "head of engineering", "cto", "founder",
]
MAX_PESSOAS_REVELADAS = 2  # no máximo 2 créditos de match por empresa


@dataclass(frozen=True)
class Organizacao:
    id: str
    dominio: str | None


@dataclass(frozen=True)
class Pessoa:
    id: str
    cargo: str


@dataclass(frozen=True)
class Encontrado:
    email: str
    nome: str | None
    cargo: str | None


def _normalizar(nome: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    sem_sufixo = re.sub(r"\b(gmbh|s\.?l\.?u?|s\.?a\.?|b\.?v\.?|ltd|inc|lda|ag|se|plc|llc)\b\.?",
                        " ", sem_acento.lower())
    return re.sub(r"[^a-z0-9]+", " ", sem_sufixo).strip()


def _dominio_limpo(valor: str | None) -> str | None:
    if not valor:
        return None
    d = valor.strip().lower().removeprefix("www.")
    return d if re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", d) else None


def escolher_organizacao(dados: dict, nome: str) -> Organizacao | None:
    """Só aceita a empresa cujo nome normalizado é igual ao nosso: evita gastar o crédito do
    match numa homônima."""
    alvo = _normalizar(nome)
    for o in (dados.get("organizations") or []) + (dados.get("accounts") or []):
        if o.get("id") and _normalizar(o.get("name") or "") == alvo:
            return Organizacao(id=o["id"], dominio=_dominio_limpo(o.get("primary_domain")))
    return None


def _faixa(cargo: str) -> int | None:
    c = f" {cargo.lower()} "
    for i, termos in enumerate(FAIXAS_DE_CARGO):
        if any(t in c for t in termos):
            return i
    return None


def escolher_pessoas(dados: dict) -> list[Pessoa]:
    """Pessoas com email disponível, da faixa de cargo mais relevante para a menos."""
    candidatas = []
    for p in dados.get("people") or []:
        cargo = (p.get("title") or "").strip()
        faixa = _faixa(cargo)
        if p.get("id") and p.get("has_email") and faixa is not None:
            candidatas.append((faixa, Pessoa(id=p["id"], cargo=cargo)))
    candidatas.sort(key=lambda x: x[0])
    return [p for _, p in candidatas]


def interpretar_match(dados: dict) -> Encontrado | None:
    p = dados.get("person") or {}
    email = (p.get("email") or "").strip().lower()
    if not email or p.get("email_status") != "verified" or "@" not in email:
        return None
    nome = " ".join(x for x in (p.get("first_name"), p.get("last_name")) if x) or None
    return Encontrado(email=email, nome=nome, cargo=p.get("title") or None)


class Apollo:
    """Conta os créditos gastos em `creditos`, para o teto mensal."""

    def __init__(self, rede: Rede, chave: str) -> None:
        self._rede = rede
        self._cabecalho = {"x-api-key": chave, "Cache-Control": "no-cache"}
        self.creditos = 0

    async def _post(self, caminho: str, corpo: dict) -> dict:
        r = await self._rede.post(f"{BASE}/{caminho}", json=corpo, headers=self._cabecalho)
        return r.json() if r is not None else {}

    async def organizacao(self, nome: str) -> Organizacao | None:
        self.creditos += 1
        dados = await self._post("mixed_companies/search",
                                 {"q_organization_name": nome, "page": 1, "per_page": 5})
        return escolher_organizacao(dados, nome)

    async def pessoas(self, org: Organizacao) -> list[Pessoa]:
        corpo: dict = {"person_titles": TITULOS_BUSCA, "include_similar_titles": True,
                       "page": 1, "per_page": 25}
        if org.dominio:
            corpo["q_organization_domains_list"] = [org.dominio]
        else:
            corpo["organization_ids"] = [org.id]
        return escolher_pessoas(await self._post("mixed_people/api_search", corpo))

    async def revelar(self, pessoa: Pessoa) -> Encontrado | None:
        self.creditos += 1
        dados = await self._post("people/match", {"id": pessoa.id,
                                                  "reveal_personal_emails": False,
                                                  "reveal_phone_number": False})
        return interpretar_match(dados)

    async def contato_da_empresa(self, nome: str, dominio: str | None
                                 ) -> tuple[Organizacao | None, Encontrado | None]:
        """Devolve a organização (para gravar o domínio) e o contato verificado, se houver."""
        org = Organizacao(id="", dominio=dominio) if dominio else await self.organizacao(nome)
        if org is None:
            return None, None
        for pessoa in (await self.pessoas(org))[:MAX_PESSOAS_REVELADAS]:
            if achado := await self.revelar(pessoa):
                return org, achado
        return org, None
