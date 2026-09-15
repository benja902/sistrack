from app.core.config import get_settings
from app.db.session import get_session_factory
from app.modules.authentication.service import AdminSeedConfigurationError, seed_admin_user


def main() -> None:
    settings = get_settings()
    if not settings.admin_seed_is_configured:
        raise SystemExit(
            "Configure SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD antes de ejecutar el seed."
        )

    session_factory = get_session_factory()
    if session_factory is None:
        raise SystemExit("DATABASE_URL no está configurada.")

    try:
        with session_factory() as session:
            seed_admin_user(
                session,
                settings.seed_admin_email or "",
                settings.seed_admin_password or "",
            )
    except AdminSeedConfigurationError as error:
        raise SystemExit(str(error)) from error

    print("Cuenta administrativa configurada correctamente.")


if __name__ == "__main__":
    main()
