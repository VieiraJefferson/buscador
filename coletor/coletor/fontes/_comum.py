"""Utilitários partilhados pelas fontes."""

from datetime import UTC, datetime
from email.utils import parsedate_to_datetime


def data_iso(valor: str | None) -> datetime | None:
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor.replace(" UTC", "+00:00").replace("Z", "+00:00"))
    except ValueError:
        return None


def data_epoch(valor: float | int | None, *, milissegundos: bool = False) -> datetime | None:
    if not valor:
        return None
    try:
        return datetime.fromtimestamp(valor / 1000 if milissegundos else valor, tz=UTC)
    except (OverflowError, OSError, ValueError):
        return None


def data_rfc2822(valor: str | None) -> datetime | None:
    if not valor:
        return None
    try:
        return parsedate_to_datetime(valor)
    except (TypeError, ValueError):
        return None
