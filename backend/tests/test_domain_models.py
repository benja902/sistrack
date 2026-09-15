from app.db.models import OperationalActor, TraceabilityEvent, User
from app.modules.identity.schemas import UserRead


def test_traceability_event_requires_a_user_registrant() -> None:
    column = TraceabilityEvent.__table__.c.recorded_by_user_id

    assert column.nullable is False
    assert column.foreign_keys


def test_operational_actor_is_a_separate_concept_from_system_user() -> None:
    assert OperationalActor.__tablename__ != User.__tablename__
    assert TraceabilityEvent.recorded_by_user.property.mapper.class_ is User
    assert TraceabilityEvent.operational_actor.property.mapper.class_ is OperationalActor


def test_password_hash_is_not_exposed_by_user_schema() -> None:
    assert "password_hash" not in UserRead.model_fields
