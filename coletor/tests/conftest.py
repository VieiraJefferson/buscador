import json
from pathlib import Path

import pytest

from coletor.config import carregar_agencias, carregar_perfil
from coletor.filtros import Filtro

AMOSTRAS = Path(__file__).parent / "amostras"


def amostra(nome: str):
    caminho = AMOSTRAS / nome
    if caminho.suffix == ".json":
        return json.loads(caminho.read_text(encoding="utf-8"))
    return caminho.read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def filtro() -> Filtro:
    return Filtro(carregar_perfil(), carregar_agencias())
