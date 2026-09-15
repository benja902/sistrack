from app.core.config import get_settings
from app.db.session import get_session_factory
from app.modules.inventory.seed import (
    InventorySeedError,
    find_inventory_seed_user,
    seed_inventory,
)


def main() -> None:
    settings = get_settings()
    session_factory = get_session_factory()
    if session_factory is None:
        raise SystemExit("DATABASE_URL no está configurada.")

    try:
        with session_factory() as session:
            user = find_inventory_seed_user(session, settings.seed_admin_email)
            if user is None:
                raise InventorySeedError(
                    "No se encontró la cuenta administrativa Abraham. "
                    "Ejecute primero el seed administrativo."
                )
            seed_inventory(session, user)
    except InventorySeedError as error:
        raise SystemExit(str(error)) from error

    print("Inventario inicial configurado correctamente.")


if __name__ == "__main__":
    main()
