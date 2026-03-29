# WP Performance Scanner — Proyecto completo

## Resumen

Micro-SaaS para analizar webs WordPress y generar informes automáticos de rendimiento con Playwright.

**MVP completado:** 29 de marzo de 2026

## Lo que se construyó

### Arquitectura
```
apps/web       → Next.js 15 (App Router) + API routes
apps/worker    → BullMQ worker (procesa scans con Playwright)
packages/shared → Tipos, constantes, cliente Supabase
supabase/      → Migraciones SQL
```

### Stack
- **Frontend**: Next.js 15, TypeScript strict, React 19
- **Base de datos**: Supabase (PostgreSQL)
- **Cola de trabajos**: BullMQ + Redis
- **Scraper**: Playwright (Chromium)
- **Monorepo**: pnpm workspaces

### Funcionalidades implementadas

#### Fase 1-6: Infraestructura
- [x] Monorepo configurado con pnpm workspaces
- [x] Schema de base de datos (profiles, scans, scan_results, scan_events)
- [x] Cliente Supabase tipado
- [x] Formulario de creación de scans con validación Zod
- [x] Cola BullMQ + Redis para jobs
- [x] Worker que consume jobs y actualiza estados

#### Fase 7: Scanner con Playwright
- [x] Apertura de URL con Chromium headless
- [x] Detección de WordPress (meta generator, wp-content, plugins)
- [x] Métricas de rendimiento (load time, DOM ready, requests, peso total)
- [x] Detección de recursos pesados:
  - Imágenes >200KB
  - Scripts >100KB
  - Stylesheets >50KB
- [x] Detección de lazy loading
- [x] Guardado de resultados en `scan_results` con JSONB

#### Fase 8: Score y Recomendaciones
- [x] Fórmula de score 0-100 basada en:
  - Tiempo de carga
  - Recursos pesados
  - Lazy loading
  - Peso total de página
- [x] Motor de recomendaciones con severidad:
  - `error` (crítico)
  - `warning` (advertencia)
  - `info` (informativo)
- [x] Categorías: performance, images, scripts, stylesheets, platform

#### Fase 9: Informe
- [x] Página dedicada `/report/[token]`
- [x] URL compartible via public_token
- [x] Polling automático hasta completar
- [x] Display de score con color y label (Excellent/Good/Fair/Poor/Critical)
- [x] Grid de métricas
- [x] Recomendaciones agrupadas por severidad
- [x] Secciones colapsables para recursos pesados
- [x] Estados: loading, scanning, failed, completed

#### Fase 10: Pulido
- [x] README.md completo
- [x] .env.example documentado
- [x] Error boundary global
- [x] 404 page
- [x] Favicon SVG
- [x] Metadata templates

## Archivos clave

### Core
- `apps/worker/src/lib/scanner.ts` — Lógica de scraping con Playwright
- `apps/worker/src/jobs/scan.ts` — Job de BullMQ
- `apps/web/src/components/ScanReport.tsx` — Componente de informe
- `apps/web/src/app/report/[token]/page.tsx` — Página de informe
- `apps/web/src/app/actions/create-scan.ts` — Server action para crear scans
- `apps/web/src/app/api/scan/[token]/route.ts` — API para obtener resultados

### Base de datos
- `supabase/migrations/0001_initial.sql` — Schema completo

### Config
- `apps/web/.env.local` — Variables de entorno (NUNCA commitear)
- `.env.example` — Template de variables
- `apps/worker/.env.local` — Variables para el worker
- `vercel.json` — Config de deployment

## Configuración para desarrollo local

### Requisitos
- Node.js 18+
- pnpm 8+
- Redis (local o Docker)
- Proyecto Supabase

### Setup

```bash
# 1. Clonar
git clone https://github.com/davidmoreno-dev/wp-performance-scanner.git
cd wp-performance-scanner

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables
cp .env.example apps/web/.env.local
cp .env.example apps/worker/.env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Instalar Playwright
npx playwright install chromium

# 5. Iniciar Redis
redis-server --daemonize yes
# O: docker run -d -p 6379:6379 redis:alpine

# 6. Aplicar migración SQL en Supabase
# Copiar contenido de supabase/migrations/0001_initial.sql
# Pegar en Supabase SQL Editor y ejecutar

# 7. Iniciar apps
# Terminal 1:
pnpm dev:web

# Terminal 2:
pnpm dev:worker
```

### Verificar que funciona
```bash
# Health check
curl http://localhost:3000/api/health

# Crear un scan (desde la web en http://localhost:3000)
# O verificar en DB que hay scans
```

## Deployment en VPS propio

### Docker (recomendado)

```yaml
# docker-compose.yml en raíz del proyecto
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
      - SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
      - NEXT_PUBLIC_APP_URL=https://tu-dominio.com
    restart: always

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
      - SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - BULLMQ_SCAN_QUEUE=scan-jobs
      - WORKER_CONCURRENCY=2
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: always
```

### Dockerfiles necesarios

`Dockerfile.web`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

`Dockerfile.worker`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && npm install -g playwright && playwright install chromium
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY apps/worker ./apps/worker
CMD ["pnpm", "dev:worker"]
```

## Known issues / Limitaciones

1. **RLS policies**: Las RLS policies de Supabase no funcionaron correctamente con anon key. La API route `/api/scan/[token]` usa service role key (seguro porque es server-side).

2. **Playwright en producción**: El worker necesita instalar browsers de Playwright. En Docker, usar `playwright install chromium --with-deps`.

3. **Sin persistencia de jobs**: Si el worker se cae, los jobs en cola se pierden (BullMQ los marca como failed después del timeout).

4. **Sin auth**: El MVP permite crear scans sin login. Pensado para agregar después.

## Preparado para futuro

Estas features NO están en el MVP pero la arquitectura las soporta:

- [ ] **Auth completa** — Supabase Auth (schema ya tiene `profiles` y `user_id`)
- [ ] **Dashboard con historial** — Tabla `scans` con `user_id` permite filtrar por usuario
- [ ] **Planes de pago** — Tabla `scans` puede expandirse con `plan` y `scan_count`
- [ ] **Emails** — Resend para notificaciones
- [ ] **API keys** — `public_token` ya existe para acceso público
- [ ] **Reintentos automáticos** — BullMQ soporta `attempts` y `backoff`
- [ ] **Metrics/observability** — Estructura para agregar logs y métricas

## Scripts disponibles

```bash
pnpm dev:web      # Iniciar Next.js (http://localhost:3000)
pnpm dev:worker   # Iniciar BullMQ worker
pnpm build        # Build producción (todas las apps)
pnpm typecheck    # Verificar tipos TypeScript
pnpm lint         # Lint (pendiente configurar)
```

## Flujo de datos

```
Usuario → / (form) → create-scan action
                        ↓
                  Insert scan (status: pending)
                        ↓
                  Enqueue BullMQ job
                        ↓
                  Update scan (status: queued)
                        ↓
                  Worker consume job
                        ↓
                  Playwright scrape → scanPage()
                        ↓
                  Save results + Update scan (status: completed)
                        ↓
                  Usuario → /report/[token] → polling API
```

## Contacto

- Proyecto: Micro-SaaS análisis rendimiento WordPress
- Tipo: SaaS multi-tenant (auth por Supabase)
- Repo: https://github.com/davidmoreno-dev/wp-performance-scanner
