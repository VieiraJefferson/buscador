"""Pedidos HTTP educados: concorrência limitada, timeout, novas tentativas e slugs validados."""

import asyncio
import logging
import re
from collections import defaultdict
from urllib.parse import urlsplit

import httpx

log = logging.getLogger(__name__)

USER_AGENT = "buscador-pessoal/0.1 (coletor de vagas para uso pessoal)"
_SLUG = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}")


def slug_valido(slug: str | None) -> bool:
    """Só deixa passar slugs simples, para nunca montar um URL fora do modelo do ATS."""
    return bool(slug) and _SLUG.fullmatch(slug) is not None and ".." not in slug


class ErroFonte(Exception):
    """A fonte falhou depois das novas tentativas."""


class Rede:
    def __init__(
        self,
        *,
        concorrencia: int = 16,
        por_host: int = 4,
        timeout: float = 20.0,
        tentativas: int = 3,
        espera_base: float = 1.0,
        cliente: httpx.AsyncClient | None = None,
    ) -> None:
        self._cliente = cliente or httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        self._geral = asyncio.Semaphore(concorrencia)
        self._hosts: dict[str, asyncio.Semaphore] = defaultdict(
            lambda: asyncio.Semaphore(por_host)
        )
        self._tentativas = tentativas
        self._espera_base = espera_base

    async def __aenter__(self) -> "Rede":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self._cliente.aclose()

    async def get(
        self, url: str, *, params: dict | None = None, headers: dict | None = None
    ) -> httpx.Response | None:
        """Devolve a resposta 2xx, ou None em 404/410. Levanta ErroFonte noutros casos."""
        host = urlsplit(url).hostname or ""
        ultimo_erro = ""
        for tentativa in range(self._tentativas):
            async with self._geral, self._hosts[host]:
                try:
                    r = await self._cliente.get(url, params=params, headers=headers)
                except httpx.TransportError as e:
                    ultimo_erro = type(e).__name__
                    r = None
            if r is not None:
                if r.status_code in (404, 410):
                    return None
                if r.is_success:
                    return r
                ultimo_erro = f"HTTP {r.status_code}"
                if r.status_code not in (429, 500, 502, 503, 504):
                    break
            if tentativa + 1 < self._tentativas:
                await asyncio.sleep(self._espera(r, tentativa))
        raise ErroFonte(f"{host}: {ultimo_erro}")

    def _espera(self, r: httpx.Response | None, tentativa: int) -> float:
        if r is not None and (valor := r.headers.get("Retry-After", "")).isdigit():
            return min(float(valor), 30.0)
        return self._espera_base * (2**tentativa)
