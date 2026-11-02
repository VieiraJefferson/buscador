"""Fontes de vagas.

ATS: cada módulo expõe `TIPO`, `async vagas(rede, slug, nome, com_descricao=True)` e uma
função pura `interpretar(...)` usada pelos testes.
Agregadores: cada módulo expõe `FONTE` e `async vagas(rede)`.
"""

from . import (
    arbeitnow,
    ashby,
    bundesagentur,  # noqa: F401 (desligada, mas o módulo e os testes continuam)
    greenhouse,
    himalayas,
    landing_jobs,
    lever,
    personio,
    recruitee,
    smartrecruiters,
    teamtailor,
    workable,
)

ATS = {
    m.TIPO: m
    for m in (ashby, lever, greenhouse, recruitee, teamtailor, smartrecruiters, workable,
              personio)
}

# Bundesagentur desligada em 2026-11-02 (só vagas na Alemanha, que saiu da busca).
AGREGADORES = [arbeitnow, himalayas, landing_jobs]
