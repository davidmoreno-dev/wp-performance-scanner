# WP Performance Scanner

Micro-SaaS para analizar webs WordPress y generar informes automáticos de rendimiento y calidad frontend.

## Stack

- **Web**: Next.js 15 (App Router)
- **Worker**: BullMQ + Redis
- **DB**: Supabase (PostgreSQL)
- **Scraper**: Playwright
- **Lenguaje**: TypeScript strict
- **Monorepo**: pnpm workspaces

## Arquitectura

```
apps/web       → Next.js app + API routes
apps/worker    → BullMQ worker (procesa scans con Playwright)
packages/shared → Tipos, constantes, cliente Supabase
```

## Requisitos

- Node.js 18+
- pnpm 8+
- Redis (local o Docker)
- Proyecto Supabase (PostgreSQL)

## Setup

### 1. Variables de entorno

Copia y configura:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/worker/.env.local
```

**Variables obligatorias:**

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `REDIS_HOST` | Host de Redis (default: 127.0.0.1) |
| `REDIS_PORT` | Puerto de Redis (default: 6379) |

### 2. Base de datos

Ejecuta la migración inicial en **Supabase SQL Editor**:

```sql
-- Ver: supabase/migrations/0001_initial.sql
-- Copia el contenido y ejecútalo en tu proyecto Supabase
```

### 3. Redis

**Local (macOS con Homebrew):**
```bash
brew install redis
redis-server --daemonize yes
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 4. Dependencias

```bash
pnpm install
```

### 5. Playwright browsers

```bash
npx playwright install chromium
```

## Desarrollo

### Iniciar todo

```bash
# Terminal 1: Web app
pnpm dev:web

# Terminal 2: Worker
pnpm dev:worker
```

- **Web**: http://localhost:3000
- **Worker**: http://localhost:3001 (metrics opcional)

### Scripts

```bash
pnpm dev:web      # Iniciar Next.js
pnpm dev:worker   # Iniciar BullMQ worker
pnpm build        # Build producción
pnpm typecheck    # Verificar tipos
pnpm lint         # Lint (pendiente)
```

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/scan/[token]` | Obtener resultado de scan |

## Flujo de un scan

1. Usuario introduce URL → `POST /actions/create-scan`
2. Se crea registro en `scans` → estado `pending`
3. Se encola job en BullMQ → estado `queued`
4. Worker consume job → Playwright abre la URL
5. Se analizan métricas → se guarda en `scan_results`
6. Se calcula score → estado `completed`
7. Usuario ve informe en `/report/[token]`

## Schema DB

Ver `supabase/migrations/0001_initial.sql` para el schema completo:

- `profiles` — Perfiles de usuario (preparado para auth futura)
- `scans` — Scans creados
- `scan_results` — Resultados del análisis
- `scan_events` — Log de eventos del scan

## Preparado para

- [ ] Auth completa (Supabase Auth)
- [ ] Dashboard con historial de scans
- [ ] Planes de pago (Stripe)
- [ ] Emails de notificación (Resend)
- [ ] API keys para clientes

## Troubleshooting

**Redis no conecta:**
```bash
redis-cli ping  # debe responder PONG
```

**Supabase no conecta:**
- Verificar que las keys son correctas
- Verificar que el proyecto existe y está activo

**Worker no procesa jobs:**
- Verificar que Redis está corriendo
- Verificar que `REDIS_HOST` y `REDIS_PORT` son correctos

**Playwright errors:**
```bash
npx playwright install chromium --with-deps
```
