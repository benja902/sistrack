from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import get_session_factory
from app.modules.inventory.seed import find_inventory_seed_user
from app.modules.logistics.models import Dispatch
from app.modules.logistics.seed import (
    REQUEST_CASES,
    DemoSeedError,
    seed_demo_requests_and_logistics,
)
from app.modules.requests.models import GuineaPigRequest


def main() -> None:
    settings = get_settings()
    session_factory = get_session_factory()
    if session_factory is None:
        raise SystemExit("DATABASE_URL no está configurada.")

    try:
        with session_factory() as session:
            user = find_inventory_seed_user(session, settings.seed_admin_email)
            if user is None:
                raise DemoSeedError("No se encontró la cuenta administrativa Abraham.")
            seed_demo_requests_and_logistics(session, user)
            customer_names = tuple(case[1] for case in REQUEST_CASES)
            request_count = session.scalar(
                select(func.count(GuineaPigRequest.id)).where(
                    GuineaPigRequest.customer_name.in_(customer_names)
                )
            )
            request_ids = select(GuineaPigRequest.id).where(
                GuineaPigRequest.customer_name.in_(customer_names)
            )
            dispatch_count = session.scalar(
                select(func.count(Dispatch.id)).where(
                    (Dispatch.guinea_pig_request_id.in_(request_ids))
                    | (
                        (Dispatch.source_type == "MILK_PRODUCTION")
                        & (Dispatch.destination == "Punto de Venta Central")
                    )
                )
            )
    except DemoSeedError as error:
        raise SystemExit(str(error)) from error

    print(
        f"Casos de ejemplo configurados: {request_count} solicitudes y {dispatch_count} despachos."
    )


if __name__ == "__main__":
    main()
