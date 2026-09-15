# Sitrack

Base técnica del Sistema de Información de Trazabilidad para los centros Kotosh y Canchán.

## Requisitos

- Node.js LTS (22 o superior)
- npm
- Python 3.12 o superior
- Una instancia PostgreSQL compatible con Supabase

## Configuración

1. Copie `.env.example` a `.env` y complete `DATABASE_URL` con la cadena de conexión de Supabase.
2. Copie `frontend/.env.example` a `frontend/.env` si necesita cambiar la URL local de la API.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000`. Consulte `GET /api/v1/health` y `GET /api/v1/health/ready`.

## Alcance actual

Esta primera fase contiene la infraestructura, entidades maestras y eventos de trazabilidad append-only. Los módulos de producción, inventario, solicitudes, logística, incidencias, reportes, IA y autenticación de usuarios se implementarán de forma incremental.
