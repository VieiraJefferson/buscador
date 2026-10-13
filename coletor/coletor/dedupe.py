"""Chave contra duplicados: a mesma vaga vinda de duas fontes tem a mesma chave."""

import re

from .texto import normalizar

_GENERO = re.compile(r"\((?:[mwfdx]\s*/\s*)+[mwfdx]\)|\b(?:[mwfdx]/)+[mwfdx]\b|\(all genders\)",
                     re.IGNORECASE)
_SUFIXOS_EMPRESA = {"gmbh", "ag", "bv", "b v", "sl", "s l", "sa", "s a", "ltd", "limited",
                    "inc", "llc", "lda", "se", "nv", "srl", "sas", "co"}


def _empresa(nome: str) -> str:
    palavras = normalizar(nome).split()
    while palavras and palavras[-1] in _SUFIXOS_EMPRESA:
        palavras.pop()
    return " ".join(palavras)


def chave(empresa: str, titulo: str) -> str:
    return f"{_empresa(empresa)}|{normalizar(_GENERO.sub(' ', titulo))}"
