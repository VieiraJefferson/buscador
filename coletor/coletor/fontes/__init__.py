"""Fontes de vagas.

ATS: cada módulo expõe `TIPO`, `async vagas(rede, slug, nome, com_descricao=True)` e uma
função pura `interpretar(...)` usada pelos testes.
Agregadores: cada módulo expõe `FONTE` e `async vagas(rede)`.
"""

from . import (
    arbeitnow,
    ashby,
    bundesagentur,
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

AGREGADORES = [arbeitnow, himalayas, landing_jobs, bundesagentur]
