import os
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    else:
        return url

    # asyncpg doesn't understand libpq query params like sslmode/channel_binding;
    # SQLAlchemy's asyncpg dialect understands a plain "ssl" query param instead.
    parts = urlsplit(url)
    query = parse_qs(parts.query)
    query.pop("sslmode", None)
    query.pop("channel_binding", None)
    query["ssl"] = ["require"]
    return urlunsplit(parts._replace(query=urlencode(query, doseq=True)))


class Settings(BaseSettings):
    database_url: str = os.environ.get(
        "DATABASE_URL", "sqlite+aiosqlite:///./taskflow.db"
    )
    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    @field_validator("database_url")
    @classmethod
    def _normalize_url(cls, v: str) -> str:
        return _normalize_database_url(v)


settings = Settings()
