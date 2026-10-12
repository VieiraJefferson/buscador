#!/usr/bin/env python3
"""SessionStart hook — injeta o bloco de regras de trabalho no contexto da sessão.

Procura o MEMORY.md do projeto ativo e extrai o bloco de regras inegociáveis,
devolvendo-o como additionalContext para que sejam seguidas sem o utilizador repetir.

Independente de projeto: o caminho da memória é derivado do diretório de trabalho.
Falha em silêncio (exit 0, sem output) se não houver memória — nunca bloqueia a sessão.
"""
import json
import os
import sys

HEADING = "## ⚠️ LER PRIMEIRO"
BASE = os.path.expanduser("~/.claude/projects")


def cwd_da_sessao():
    try:
        data = json.load(sys.stdin)
        return data.get("cwd") or data.get("workspace") or os.getcwd()
    except Exception:
        return os.getcwd()


def caminhos_de_memoria(cwd):
    """Candidatos, do mais específico para o mais geral."""
    # 1. memória do projeto ativo — o slug é o caminho com '/' trocado por '-'
    yield os.path.join(BASE, cwd.replace(os.sep, "-").replace("/", "-"),
                       "memory", "MEMORY.md")
    # 2. ficheiro de regras dentro do próprio projeto
    yield os.path.join(cwd, ".claude", "REGRAS.md")


def extrai_bloco(caminho):
    try:
        linhas = open(caminho, encoding="utf-8").read().splitlines()
    except Exception:
        return ""
    bloco, a_capturar = [], False
    for ln in linhas:
        if ln.startswith(HEADING):
            a_capturar = True
            bloco.append(ln)
            continue
        if a_capturar and ln.startswith("## "):
            break
        if a_capturar:
            bloco.append(ln)
    return "\n".join(bloco).strip()


def main():
    cwd = cwd_da_sessao()
    texto = ""
    for caminho in caminhos_de_memoria(cwd):
        texto = extrai_bloco(caminho)
        if texto:
            break
    if not texto:
        sys.exit(0)

    contexto = (
        "[Regras de trabalho do utilizador para este projeto — LER e SEGUIR nesta "
        "sessão, sem o utilizador precisar repetir. Fluxo obrigatório: pesquisar → "
        "plano (técnico + não-técnico) → aprovação → implementar.]\n\n" + texto
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": contexto,
        }
    }))


if __name__ == "__main__":
    main()
