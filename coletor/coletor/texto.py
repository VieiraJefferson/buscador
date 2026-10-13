"""Limpeza de HTML, normalização e reconhecimento de país e de regime em texto livre."""

import html
import re
import unicodedata

from .modelos import Regime

_TAG = re.compile(r"<[^>]+>")
_QUEBRA = re.compile(r"<(br|/p|/li|/h\d|/div|/tr)[^>]*>", re.IGNORECASE)


def html_para_texto(valor: str | None, limite: int = 20000) -> str:
    """Converte HTML (às vezes escapado duas vezes, como no Greenhouse) em texto simples."""
    if not valor:
        return ""
    t = html.unescape(html.unescape(valor))
    t = _QUEBRA.sub("\n", t)
    t = _TAG.sub(" ", t)
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n\n", t)
    return t.strip()[:limite]


def normalizar(texto: str | None) -> str:
    """Minúsculas, sem acentos, só letras e números separados por um espaço."""
    if not texto:
        return ""
    t = unicodedata.normalize("NFKD", texto)
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()


def contem_termo(texto_normalizado: str, termo: str) -> bool:
    """Procura o termo (já normalizável) como palavras inteiras."""
    alvo = normalizar(termo)
    return bool(alvo) and f" {alvo} " in f" {texto_normalizado} "


# --- Países -------------------------------------------------------------------

UE = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
    "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
}

_NOMES: dict[str, list[str]] = {
    "ES": ["spain", "espana", "espanha", "spanien", "spanje", "espagne", "spagna"],
    "NL": ["netherlands", "the netherlands", "nederland", "holland", "paises bajos",
           "holanda", "paises baixos", "niederlande", "pays bas"],
    "DE": ["germany", "deutschland", "alemania", "alemanha", "duitsland", "allemagne",
           "germania"],
    "PT": ["portugal"],
    "AT": ["austria", "osterreich", "oesterreich", "oostenrijk", "autriche"],
    "BE": ["belgium", "belgica", "belgien", "belgie", "belgique"],
    "BG": ["bulgaria", "bulgarien"],
    "HR": ["croatia", "croacia", "hrvatska", "kroatien"],
    "CY": ["cyprus", "chipre", "zypern"],
    "CZ": ["czechia", "czech republic", "chequia", "republica checa", "tschechien"],
    "DK": ["denmark", "dinamarca", "danmark", "danemark", "denemarken"],
    "EE": ["estonia", "estland"],
    "FI": ["finland", "finlandia", "finnland", "suomi"],
    "FR": ["france", "francia", "franca", "frankreich", "frankrijk"],
    "GR": ["greece", "grecia", "griechenland", "griekenland", "hellas"],
    "HU": ["hungary", "hungria", "ungarn", "hongarije"],
    "IE": ["ireland", "irlanda", "irland", "ierland"],
    "IT": ["italy", "italia", "italien", "italie"],
    "LV": ["latvia", "letonia", "lettland"],
    "LT": ["lithuania", "lituania", "litauen"],
    "LU": ["luxembourg", "luxemburgo", "luxemburg"],
    "MT": ["malta"],
    "PL": ["poland", "polonia", "polen", "pologne"],
    "RO": ["romania", "rumania", "rumanien", "roemenie"],
    "SK": ["slovakia", "eslovaquia", "slowakei"],
    "SI": ["slovenia", "eslovenia", "slowenien"],
    "SE": ["sweden", "suecia", "schweden", "zweden", "sverige"],
    # Fora da UE: reconhecidos para não confundir com cidades
    "GB": ["united kingdom", "uk", "england", "scotland", "great britain"],
    "US": ["united states", "usa", "united states of america"],
    "CH": ["switzerland", "suiza", "schweiz", "suica"],
    "NO": ["norway", "noruega", "norwegen", "norge"],
    "BR": ["brazil", "brasil"],
}

_CIDADES: dict[str, list[str]] = {
    "ES": ["madrid", "barcelona", "valencia", "sevilla", "seville", "malaga", "bilbao",
           "zaragoza", "alicante", "palma", "las palmas", "granada", "murcia", "valladolid",
           "vigo", "a coruna", "san sebastian", "donostia", "pamplona", "santander",
           "gijon", "oviedo", "cordoba", "tenerife"],
    "NL": ["amsterdam", "rotterdam", "utrecht", "eindhoven", "den haag", "the hague",
           "haarlem", "groningen", "leiden", "delft", "nijmegen", "arnhem", "tilburg",
           "breda", "amersfoort", "hilversum", "zwolle"],
    "DE": ["berlin", "munich", "munchen", "muenchen", "hamburg", "frankfurt", "cologne",
           "koln", "koeln", "stuttgart", "dusseldorf", "duesseldorf", "leipzig", "dresden",
           "hannover", "nuremberg", "nurnberg", "bremen", "essen", "dortmund", "karlsruhe",
           "mannheim", "bonn", "heidelberg", "potsdam", "aachen", "freiburg"],
    "PT": ["lisbon", "lisboa", "porto", "oporto", "braga", "coimbra", "aveiro", "faro",
           "funchal", "setubal", "leiria", "guimaraes"],
    "IE": ["dublin", "cork"],
    "FR": ["paris", "lyon", "toulouse", "marseille", "nantes", "bordeaux"],
    "IT": ["milan", "milano", "rome", "roma", "turin", "torino"],
    "AT": ["vienna", "wien", "graz", "linz"],
    "BE": ["brussels", "bruxelles", "brussel", "antwerp", "antwerpen", "ghent", "gent"],
    "PL": ["warsaw", "warszawa", "krakow", "wroclaw", "gdansk", "poznan"],
    "CZ": ["prague", "praha", "brno"],
    "DK": ["copenhagen", "kobenhavn", "aarhus"],
    "SE": ["stockholm", "gothenburg", "goteborg", "malmo"],
    "FI": ["helsinki", "espoo", "tampere"],
    "EE": ["tallinn", "tartu"],
    "LV": ["riga"],
    "LT": ["vilnius", "kaunas"],
    "HU": ["budapest"],
    "RO": ["bucharest", "bucuresti", "cluj"],
    "BG": ["sofia"],
    "GR": ["athens", "thessaloniki"],
    "SI": ["ljubljana"],
    "HR": ["zagreb"],
    "SK": ["bratislava"],
    "MT": ["valletta"],
    "CY": ["nicosia", "limassol"],
    "GB": ["london", "manchester", "edinburgh"],
    "US": ["new york", "san francisco", "seattle"],
}

_TERMOS_PAIS = [(t, iso) for iso, ts in _NOMES.items() for t in ts] + [
    (t, iso) for iso, ts in _CIDADES.items() for t in ts
]


def paises_de_texto(*textos: str | None) -> set[str]:
    """Reconhece países (ISO-2) por nome em várias línguas ou por cidades conhecidas.

    Usar só em campos de localização: em descrições, palavras como "Essen" dariam falsos
    positivos.
    """
    alvo = f" {normalizar(' '.join(t for t in textos if t))} "
    achados: set[str] = set()
    for termo, iso in _TERMOS_PAIS:
        if f" {termo} " in alvo:
            achados.add(iso)
    return achados


_EUROPA = ["europe", "european union", "eu", "emea", "europa", "cet", "cest", "eea"]


def europa_generica(*textos: str | None) -> bool:
    """A localização fala em Europa sem país. Usar só em campos de localização e título."""
    alvo = normalizar(" ".join(t for t in textos if t))
    return any(contem_termo(alvo, t) for t in _EUROPA)


# --- Regime -------------------------------------------------------------------

_HIBRIDO = ["hybrid", "hibrido", "hybride", "hybrido"]
_REMOTO = ["remote", "remoto", "teletrabajo", "teletrabalho", "home office", "homeoffice",
           "thuiswerken", "fully remote", "work from home", "anywhere"]
_PRESENCIAL = ["on site", "onsite", "presencial", "vor ort", "op kantoor", "in office"]


def regime_de_texto(*textos: str | None) -> Regime:
    alvo = normalizar(" ".join(t for t in textos if t))
    if any(contem_termo(alvo, t) for t in _HIBRIDO):
        return "hibrido"
    if any(contem_termo(alvo, t) for t in _REMOTO):
        return "remoto"
    if any(contem_termo(alvo, t) for t in _PRESENCIAL):
        return "presencial"
    return "desconhecido"
