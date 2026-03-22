# WP Performance Scanner - AGENTS.md

## Reglas persistentes del proyecto

### Stack
- **Runtime**: Node.js (ESNext, target ES2022)
- **Lenguaje**: TypeScript (strict mode)
- **Monorepo**: pnpm workspaces (`apps/*`, `packages/*`)
- **DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Cola**: BullMQ + Redis
- **Scraper**: Playwright
- **Web**: Next.js 15 (App Router)

### Arquitectura
- `apps/web`: Next.js app + API routes (Client + Server Components)
- `apps/worker`: BullMQ worker (procesa jobs de scan)
- `packages/shared`: Tipos, constantes, cliente Supabase (sin lógica de negocio)

### Convenciones

#### Imports
```typescript
// Usar alias de path configurado en tsconfig.base.json
import { ScanStatus } from "@wps/shared";
import { createClient } from "@wps/shared/supabase";
```

#### Nomenclatura
- Archivos: `kebab-case` o `camelCase` según contexto
- Tipos/Interfaces: `PascalCase`
- Funciones: `camelCase`
- Constantes: `SCREAMING_SNAKE_CASE`
- Enums: usar `as const` + inferencia de tipo (no `enum` de TS)

#### Tipos DB
- Coincidir exactamente con el schema SQL en `supabase/migrations/0001_initial.sql`
- Nombres de tablas en `snake_case`
- Usar sufijos: `_at` para timestamps, `_id` para UUIDs, `_count` para enteros

#### Estado de scans
```typescript
const SCAN_STATUSES = ["pending", "queued", "running", "completed", "failed"] as const;
type ScanStatus = (typeof SCAN_STATUSES)[number];
```

#### Cliente Supabase
- Crear cliente con `createClient()` desde `@wps/shared/supabase`
- No hardcodear URL/keys - usar variables de entorno
- Service role solo en worker; anon key en cliente (web)

#### URLs
- Normalizar siempre con `normalizeUrl()` antes de guardar en `normalized_url`
- Guardar URL original en `original_url`
- Guardar URL final (tras redirects) en `final_url`

### Archivos sensibles
- `.env.local` NUNCA commitear (contiene keys de producción)
- Usar `.env.example` para documentar variables necesarias
- En desarrollo, usar keys de desarrollo de Supabase Dashboard

### Scripts
```bash
pnpm dev:web      # Iniciar app Next.js
pnpm dev:worker   # Iniciar worker BullMQ
pnpm build        # Build producción
pnpm typecheck    # Verificar tipos en todos los packages
pnpm lint         # Lint en todos los packages
```

### Verificación
- `pnpm typecheck` debe pasar en todos los packages
- `pnpm build` debe compilar sin errores antes de merge
- Tests manuales con curl para API routes

### Fases de implementación
1. **packages/shared**: Tipos, cliente Supabase, utilidades
2. **apps/worker**: BullMQ + Playwright
3. **apps/web**: API routes
4. **apps/web**: UI
5. **Integración end-to-end**

### Contacto
- Proyecto: Micro-SaaS para análisis de rendimiento WordPress
- Tipo: SaaS multi-tenant (auth por Supabase)
