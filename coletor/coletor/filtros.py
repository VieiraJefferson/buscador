"""Filtros determinísticos (ADR-0001, seções 2 e 4). A IA da etapa 4 só recebe o que passa."""

import re
from dataclasses import dataclass

from .modelos import Vaga
from .texto import UE, contem_termo, normalizar


@dataclass(frozen=True)
class Decisao:
    aceita: bool
    motivo: str | None = None  # por que foi rejeitada
    pais: str | None = None
    prioridade: int | None = None
    consultoria: bool = False  # aceita, mas fica abaixo dos empregadores diretos


# O título precisa nomear uma função de desenvolvimento. Tecnologias soltas ("AI", "React")
# não bastam: "AI-Enabled Revenue Operations Specialist" não é vaga de dev.
_RELEVANTES = [
    "developer", "engineer", "programmer", "desarrollador", "desarrolladora",
    "programador", "programadora", "entwickler", "entwicklerin", "entwicklung",
    "softwareentwickler", "softwareentwicklerin", "webentwickler", "anwendungsentwickler",
    "informatiker", "fachinformatiker", "ontwikkelaar", "programmeur", "desenvolvedor",
    "desenvolvedora", "frontend", "front end", "backend", "back end", "fullstack",
    "full stack", "devops",
]
# Funções fora do perfil, mesmo com "engineer" no título
_IRRELEVANTES = [
    "business developer", "business development", "sales", "account executive",
    "account manager", "customer success", "recruiter",
    "talent acquisition", "marketing", "accountant", "accounting", "legal", "lawyer",
    "support agent", "call center", "warehouse", "driver", "nurse", "teacher",
    "mechanical engineer", "civil engineer", "electrical engineer", "hardware engineer",
    "quality engineer", "process engineer", "field engineer", "service engineer",
]
# Termos de nível excluído que não estão no perfil.yaml (estágio em várias línguas, cargos C).
_SENIORIDADE_EXTRA = [
    "werkstudent", "praktikum", "praktikant", "praktikantin", "becario", "becaria",
    "practicas", "estagio", "estagiario", "stagiair", "stage", "vp", "chief", "cto",
    "entry level", "junior developer", "jnr",
]

_DE_EXIGIDO = [
    re.compile(r"\b(fluent|native|business|professional|excellent|very good|strong|good)\b"
               r"[^.\n]{0,40}\bgerman\b", re.I),
    re.compile(r"\bgerman\b[^.\n]{0,30}\b(c1|c2|fluent|native|required|mandatory|is a must)\b",
               re.I),
    re.compile(r"deutschkenntnisse", re.I),
    re.compile(r"\bdeutsch\b[^.\n]{0,30}\b(flie(ss|ß)end|verhandlungssicher|c1|c2|muttersprach)",
               re.I),
    re.compile(r"verhandlungssicher", re.I),
]
_NL_EXIGIDO = [
    re.compile(r"\b(fluent|native|business|professional|excellent|very good|strong|good)\b"
               r"[^.\n]{0,40}\bdutch\b", re.I),
    re.compile(r"\bdutch\b[^.\n]{0,30}\b(c1|c2|fluent|native|required|mandatory|is a must)\b",
               re.I),
    re.compile(r"vloeiend nederlands|nederlandstalig|beheersing van de nederlandse taal", re.I),
    re.compile(r"\bnederlands\b[^.\n]{0,30}\b(vloeiend|moedertaal|c1|c2)", re.I),
]
_PALAVRAS_DE = {"und", "wir", "sie", "fur", "mit", "bei", "ihre", "unser", "unsere", "deine",
                "du", "bist", "eine", "einen", "der", "die", "das", "zur", "zum", "nicht",
                "oder", "auch", "sowie", "werden", "ist"}
_PALAVRAS_NL = {"wij", "jij", "je", "jouw", "onze", "ons", "het", "een", "van", "voor",
                "met", "bij", "naar", "zijn", "wordt", "werkzaamheden", "vacature", "ervaring"}
_PALAVRAS_EN = {"the", "and", "you", "we", "with", "for", "our", "your", "are", "will", "team",
                "of", "to", "in", "is"}
_TITULO_DE = ["entwickler", "entwicklerin", "softwareentwickler", "informatiker",
              "fachinformatiker", "anwendungsentwickler", "webentwickler"]


# Consultorias fora da lista negra: não são excluídas, só rebaixadas no ranking.
_NOME_CONSULTORIA = ["consulting", "consultancy", "consultoria", "consultores", "consultants",
                     "consultant", "consultora", "consultoras"]
# Vaga para cliente: uma sigla entre traços no título ("Front End – ADP – equipo").
_SIGLA_CLIENTE = re.compile(r"\s[–-]\s([A-Z0-9&]{2,6})\s[–-]\s")
_SIGLAS_COMUNS = {"AI", "ML", "UI", "UX", "QA", "EU", "UE", "ES", "PT", "NL", "DE", "UK", "US",
                  "EMEA", "API", "B2B", "B2C", "SAAS", "CTO", "HR", "IT", "R&D", "MVP", "ERP",
                  "CRM", "LLM", "NLP", "IOT", "GCP", "AWS", "OCI", "SRE"}


def eh_consultoria(empresa: str, titulo: str) -> bool:
    nome = normalizar(empresa)
    if any(contem_termo(nome, t) for t in _NOME_CONSULTORIA):
        return True
    return any(m.group(1) not in _SIGLAS_COMUNS for m in _SIGLA_CLIENTE.finditer(f" {titulo} "))


def _lingua_predominante(texto: str) -> str | None:
    """Detecta anúncios escritos em alemão ou holandês (que, na prática, exigem a língua)."""
    palavras = normalizar(texto).split()
    if len(palavras) < 40:
        return None
    de = sum(p in _PALAVRAS_DE for p in palavras)
    nl = sum(p in _PALAVRAS_NL for p in palavras)
    en = sum(p in _PALAVRAS_EN for p in palavras)
    if de >= 15 and de > en and de > nl:
        return "de"
    if nl >= 15 and nl > en and nl > de:
        return "nl"
    return None


class Filtro:
    def __init__(self, perfil: dict, agencias: dict) -> None:
        self._agencias = [normalizar(a) for a in agencias.get("empresas") or []]
        self._palavras_agencia = [normalizar(p) for p in agencias.get("palavras") or []]
        self._excluir_senioridade = [
            normalizar(s) for s in (perfil.get("senioridade") or {}).get("excluir") or []
        ] + _SENIORIDADE_EXTRA
        self._excluir_idiomas = set(
            (perfil.get("idiomas") or {}).get("exigencias_excluidas") or []
        )
        self._excluir_paises = set((perfil.get("localidade") or {}).get("excluir_paises") or [])
        self._prioridade: dict[str, int] = {}
        self._prioridade_ue: int | None = None
        self._regimes: dict[int, set[str]] = {}
        for p in (perfil.get("localidade") or {}).get("prioridades") or []:
            self._regimes[p["ordem"]] = set(p.get("regimes") or [])
            for pais in p.get("paises") or []:
                if pais == "UE_RESTANTE":
                    self._prioridade_ue = p["ordem"]
                else:
                    self._prioridade[pais] = p["ordem"]

    # --- partes reutilizáveis -------------------------------------------------

    def eh_agencia(self, empresa: str, texto: str = "") -> bool:
        nome = normalizar(empresa)
        if any(contem_termo(nome, a) for a in self._agencias):
            return True
        corpo = normalizar(texto)
        return any(contem_termo(corpo, p) for p in self._palavras_agencia)

    def prioridade_pais(self, v: Vaga) -> tuple[str | None, int | None]:
        """Escolhe o país da vaga com melhor prioridade. (None, 4) = "Europa" sem país."""
        melhor: tuple[str | None, int | None] = (None, None)
        for pais in v.paises:
            if pais in self._excluir_paises:
                continue
            ordem = self._prioridade.get(pais)
            if ordem is None and pais in UE:
                ordem = self._prioridade_ue
            if ordem is not None and (melhor[1] is None or ordem < melhor[1]):
                melhor = (pais, ordem)
        if melhor[1] is None and v.europa_generica and v.regime == "remoto":
            return None, self._prioridade_ue
        return melhor

    # --- decisão completa -------------------------------------------------------

    def avaliar(self, v: Vaga) -> Decisao:
        titulo = normalizar(v.titulo)
        if self.eh_agencia(v.empresa_nome, f"{v.titulo}\n{v.descricao}"):
            return Decisao(False, "agencia")
        if not any(contem_termo(titulo, t) for t in _RELEVANTES) or any(
            contem_termo(titulo, t) for t in _IRRELEVANTES
        ):
            return Decisao(False, "fora_do_perfil")
        senioridade = normalizar(f"{v.titulo} {v.senioridade or ''}")
        if any(contem_termo(senioridade, s) for s in self._excluir_senioridade):
            return Decisao(False, "senioridade")
        pais, prioridade = self.prioridade_pais(v)
        if prioridade is None:
            return Decisao(False, "fora_da_ue")
        if v.regime == "presencial" or (
            v.regime != "desconhecido" and v.regime not in self._regimes.get(prioridade, set())
        ):
            return Decisao(False, "regime")
        if self._exige_idioma_excluido(v):
            return Decisao(False, "idioma")
        return Decisao(True, None, pais, prioridade, eh_consultoria(v.empresa_nome, v.titulo))

    def _exige_idioma_excluido(self, v: Vaga) -> bool:
        texto = f"{v.titulo}\n{v.descricao}"
        lingua = _lingua_predominante(v.descricao)
        if "alemao" in self._excluir_idiomas:
            if lingua == "de" or any(r.search(texto) for r in _DE_EXIGIDO):
                return True
            if any(contem_termo(normalizar(v.titulo), t) for t in _TITULO_DE):
                return True
        if "holandes" in self._excluir_idiomas:
            if lingua == "nl" or any(r.search(texto) for r in _NL_EXIGIDO):
                return True
        return False
