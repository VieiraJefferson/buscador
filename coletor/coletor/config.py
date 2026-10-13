"""Único lugar que lê variáveis de ambiente e arquivos de configuração.

Os valores nunca são impressos. Se faltar uma variável obrigatória, o erro diz só o nome.
"""

import os
from dataclasses import dataclass
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
PERFIL = RAIZ / "config" / "perfil.yaml"
AGENCIAS = Path(__file__).resolve().parent / "dados" / "agencias.yaml"


def carregar_env_local(caminho: Path = RAIZ / ".env") -> None:
    """Carrega o .env da raiz para o ambiente, sem sobrescrever o que já existe.

    No GitHub Actions o arquivo não existe e as variáveis vêm dos Secrets.
    """
    if not caminho.is_file():
        return
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        nome, _, valor = linha.partition("=")
        nome, valor = nome.strip(), valor.strip()
        if nome and valor and nome not in os.environ:
            os.environ[nome] = valor


@dataclass(frozen=True)
class ConfigBanco:
    url: str
    owner_id: str


def config_banco() -> ConfigBanco:
    faltando = [n for n in ("SUPABASE_DB_URL", "OWNER_ID") if not os.environ.get(n)]
    if faltando:
        raise SystemExit(f"Variáveis de ambiente em falta: {', '.join(faltando)}")
    return ConfigBanco(url=os.environ["SUPABASE_DB_URL"], owner_id=os.environ["OWNER_ID"])


def carregar_yaml(caminho: Path) -> dict:
    with caminho.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def carregar_perfil() -> dict:
    return carregar_yaml(PERFIL)


def carregar_agencias() -> dict:
    return carregar_yaml(AGENCIAS)
