# Supabase Migrations

## Archivos

- `0001_initial.sql` - Schema inicial completo para MVP

## Aplicar la migración

### Opción 1: Supabase CLI (recommended)

```bash
# Asegúrate de tener supabase-cli instalado
npm install -g supabase

# Vincula tu proyecto local
supabase link --project-ref <your-project-ref>

# Push migrations a tu proyecto
supabase db push
```

### Opción 2: SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Abre **SQL Editor**
3. Selecciona **New query**
4. Copia y pega el contenido de `0001_initial.sql`
5. Ejecuta con **Run**

## Verificar que quedó bien

### 1. Ver tablas creadas

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Deberías ver:
- `profiles`
- `scans`
- `scan_results`
- `scan_events`

### 2. Ver enum creado

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'scan_status'::regtype;
```

Deberías ver:
- pending
- queued
- running
- completed
- failed

### 3. Ver RLS habilitado

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Todas las tablas deben tener `rowsecurity = true`.

### 4. Ver policies

```sql
SELECT tablename, policyname, permissive, roles 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Estructura de tablas

### profiles
- Idioma: `id` (UUID, FK a auth.users)
- Email único
- Nombre completo opcional
- Auto-creado via trigger cuando se crea usuario en Auth

### scans
- `public_token`: Token único para compartir resultados (16 bytes hex)
- `normalized_url`: URL normalizada (https, sin trailing slash)
- `final_url`: URL final después de redirects
- `status`: Enum (pending → queued → running → completed/failed)
- Timestamps para tracking de duración

### scan_results
- 1:1 con scans (unique constraint en scan_id)
- Métricas de rendimiento (load_time, dom_content_loaded)
- Recursos pesados (images, scripts, stylesheets)
- Recomendaciones generadas

### scan_events
- Log de eventos del scan
- Para debugging y tracking de progreso
- Uso típico: "started", "navigated", "error", "completed"

## Variables de entorno necesarias

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Obtén estas keys de: **Settings > API** en tu proyecto Supabase.

## Resetear la base (desarrollo)

Si necesitas partir de cero:

```sql
-- IMPORTANTE: Esto borra todos los datos
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
```

Luego re-aplica la migración.
