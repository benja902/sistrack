from unittest.mock import Mock

from app.db import session as database_session


def test_engine_is_reused_and_disposed(monkeypatch) -> None:
    database_session.get_engine.cache_clear()
    database_session.get_session_factory.cache_clear()

    engine = Mock()
    settings = Mock(database_url="postgresql+psycopg://configured")
    create_engine = Mock(return_value=engine)
    monkeypatch.setattr(database_session, "get_settings", lambda: settings)
    monkeypatch.setattr(database_session, "create_engine", create_engine)

    try:
        assert database_session.get_engine() is engine
        assert database_session.get_engine() is engine
        assert create_engine.call_count == 1

        database_session.dispose_database()

        engine.dispose.assert_called_once_with()
    finally:
        database_session.get_session_factory.cache_clear()
        database_session.get_engine.cache_clear()
