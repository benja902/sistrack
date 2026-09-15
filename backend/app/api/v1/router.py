from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.inventory import router as inventory_router
from app.api.v1.routes.production import router as production_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["authentication"])
api_router.include_router(production_router, tags=["production"])
api_router.include_router(inventory_router, tags=["inventory"])
