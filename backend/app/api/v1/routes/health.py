from fastapi import APIRouter, HTTPException, status

from app.db.session import database_is_ready

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
def readiness() -> dict[str, str]:
    if not database_is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La base de datos no está disponible o DATABASE_URL no está configurada.",
        )
    return {"status": "ready", "database": "connected"}
