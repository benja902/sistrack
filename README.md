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
3. Configure en Preview y Production `DATABASE_URL`, `DATABASE_POOL_MODE=transaction` y un `JWT_SECRET` aleatorio (mínimo 32 caracteres). Para `DATABASE_URL`, copie la URI **Transaction Pooler** del proyecto desde Supabase, use el driver `postgresql+psycopg` y exija SSL con `sslmode=require`. Mantenga esta URI solamente en las variables de entorno de Vercel; los archivos `.env.example` no contienen conexiones reales. Configure `GEMINI_API_KEY` en el backend si desea usar Gemini.
4. No es necesario definir `VITE_API_BASE_URL` cuando frontend y API se despliegan en el mismo proyecto; el frontend usará `/api/v1` automáticamente. Si la define en Vercel, use `/api/v1`, nunca una URL local.

`DATABASE_POOL_MODE=standard` es el valor predeterminado para desarrollo con conexión directa o Session Pooler. Usa el pool normal de SQLAlchemy con `pool_pre_ping`. `DATABASE_POOL_MODE=transaction` usa `NullPool` y desactiva los prepared statements automáticos de psycopg; el Transaction Pooler reutiliza las conexiones entre instancias serverless. Las sesiones y transacciones de SQLAlchemy no cambian.

Después del despliegue, verifique `https://SU-DOMINIO.vercel.app/api/v1/health`.

## Alcance actual

El módulo IA inicial está documentado en [AI_MODULE.md](AI_MODULE.md):
tres operaciones administrativas con Gemini, contexto permitido y fallback determinista.

El proyecto contiene infraestructura, autenticación, entidades maestras, producción,
inventario, solicitudes, logística, incidencias, trazabilidad e IA inicial.
Los reportes y las capacidades avanzadas se desarrollarán de forma incremental.
