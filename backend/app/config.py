import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = os.environ.get(
        "DATABASE_URL", "sqlite+aiosqlite:///./taskflow.db"
    )
    jwt_secret: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24


settings = Settings()
