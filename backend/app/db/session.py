from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine | None:
    database_url = get_settings().database_url
    if not database_url:
        return None
    return create_engine(database_url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session] | None:
    engine = get_engine()
    if engine is None:
        return None
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_session() -> Generator[Session, None, None]:
    session_factory = get_session_factory()
    if session_factory is None:
        raise RuntimeError("DATABASE_URL no está configurada.")

    with session_factory() as session:
        yield session


def dispose_database() -> None:
    """Release pooled connections when the application process stops."""
    engine = get_engine()
    if engine is not None:
        engine.dispose()
    get_session_factory.cache_clear()
    get_engine.cache_clear()


def database_is_ready() -> bool:
    engine = get_engine()
    if engine is None:
        return False

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
