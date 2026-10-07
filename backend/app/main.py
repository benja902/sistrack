from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.session import dispose_database
from app.modules.ai.client import GeminiClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Release the shared database pool during application shutdown."""
    try:
        yield
    finally:
        try:
            await app.state.gemini_client.close()
        finally:
            dispose_database()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Sitrack API",
        version="0.1.0",
        description="API base para la trazabilidad de Kotosh y Canchán.",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.state.gemini_client = GeminiClient(settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
