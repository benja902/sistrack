from unittest.mock import Mock

from sqlalchemy.pool import NullPool

from app.db import session as database_session


def test_engine_is_reused_and_disposed(monkeypatch) -> None:
    database_session.get_engine.cache_clear()
    database_session.get_session_factory.cache_clear()

    engine = Mock()
    settings = Mock(database_url="postgresql+psycopg://configured", database_pool_mode="standard")
    create_engine = Mock(return_value=engine)
    monkeypatch.setattr(database_session, "get_settings", lambda: settings)
    monkeypatch.setattr(database_session, "create_engine", create_engine)

    try:
        assert database_session.get_engine() is engine
        assert database_session.get_engine() is engine
        assert create_engine.call_count == 1
        create_engine.assert_called_once_with(settings.database_url, pool_pre_ping=True)

        database_session.dispose_database()

        engine.dispose.assert_called_once_with()
    finally:
        database_session.get_session_factory.cache_clear()
        database_session.get_engine.cache_clear()


def test_transaction_pooler_uses_no_local_pool_or_prepared_statements(monkeypatch) -> None:
    database_session.get_engine.cache_clear()
    settings = Mock(
        database_url="postgresql+psycopg://configured", database_pool_mode="transaction"
    )
    create_engine = Mock(return_value=Mock())
    monkeypatch.setattr(database_session, "get_settings", lambda: settings)
    monkeypatch.setattr(database_session, "create_engine", create_engine)

    try:
        database_session.get_engine()
        create_engine.assert_called_once_with(
            settings.database_url,
            poolclass=NullPool,
            connect_args={"prepare_threshold": None},
        )
    finally:
        database_session.get_engine.cache_clear()
