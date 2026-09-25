from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.incidents import router as incidents_router
from app.api.v1.routes.inventory import router as inventory_router
from app.api.v1.routes.logistics import router as logistics_router
from app.api.v1.routes.production import router as production_router
from app.api.v1.routes.requests import router as requests_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["authentication"])
api_router.include_router(production_router, tags=["production"])
api_router.include_router(inventory_router, tags=["inventory"])
api_router.include_router(requests_router, tags=["requests"])
api_router.include_router(logistics_router, tags=["logistics"])
api_router.include_router(incidents_router, tags=["incidents"])
