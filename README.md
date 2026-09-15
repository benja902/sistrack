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

### Cuenta administrativa inicial

Configure `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y un `JWT_SECRET` seguro en
`backend/.env`. Después ejecute una vez —o cada vez que necesite reconciliar la
cuenta, ya que el proceso es idempotente—:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.scripts.seed_admin
```

La contraseña se transforma con Argon2 antes de almacenarse. El seed reutiliza
el rol `ADMINISTRADOR` existente y no imprime credenciales ni hashes.

## Despliegue en Vercel

El repositorio incluye `vercel.json` para desplegar el frontend Vite y la API FastAPI desde la raíz del proyecto.

1. Importe el repositorio en Vercel sin cambiar el Root Directory.
2. Mantenga los comandos definidos en `vercel.json` (`npm --prefix frontend ci` y `npm --prefix frontend run build`).
3. Configure estas variables en Vercel: `DATABASE_URL`, `APP_ENV=production`, `CORS_ORIGINS` con la URL pública de Vercel y un `JWT_SECRET` aleatorio.
4. No es necesario definir `VITE_API_BASE_URL` cuando frontend y API se despliegan en el mismo proyecto; el frontend usará `/api/v1` automáticamente.

Después del despliegue, verifique `https://SU-DOMINIO.vercel.app/api/v1/health`.

## Alcance actual

Esta primera fase contiene la infraestructura, entidades maestras y eventos de trazabilidad append-only. Los módulos de producción, inventario, solicitudes, logística, incidencias, reportes, IA y autenticación de usuarios se implementarán de forma incremental.
