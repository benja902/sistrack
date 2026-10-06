import logging

from app.db.session import get_session_factory

from .models import AiLog

logger = logging.getLogger(__name__)


def write_ai_log(fields: dict) -> None:
    """A separate transaction: a missing table must never poison the request session."""
    try:
        factory = get_session_factory()
        if factory is None:
            return
        with factory() as session:
            session.add(AiLog(**fields))
            session.commit()
    except Exception:
        # Never print DB/provider exception text: it may include connection parameters.
        logger.warning("ai_audit_unavailable")
