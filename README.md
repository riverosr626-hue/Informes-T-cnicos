# Informes de Evaluación de Generadores

App web para que los técnicos suban informes de evaluación de grupos electrógenos.
Cada técnico se registra con su correo, y cada informe queda firmado con quien lo subió.
El administrador ve todos los informes y puede filtrarlos por técnico.

**Tecnología:** Next.js 15 + Supabase (cuentas, base de datos y fotos) + Vercel (publicación).

## Qué hace

- **Registro e inicio de sesión con correo y contraseña** (con confirmación por correo).
- **Formulario de evaluación**: datos generales, datos del generador, mediciones, inspección, estado general, observaciones, recomendaciones y fotos.
- **Control por técnico**: el informe se asocia automáticamente a la cuenta conectada; nadie puede subir un informe a nombre de otro.
- **Roles**: un técnico ve solo sus informes; el administrador ve todos, con filtro por técnico y búsqueda.
- **Informes inalterables para técnicos**: una vez enviado, solo el administrador puede editarlo o borrarlo.
- **Imprimir / Guardar PDF** desde la vista de cada informe.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Supabase
1. Entra a https://supabase.com, crea una cuenta y un **New project** (región: São Paulo).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.
3. Ve a **Authentication → URL Configuration** y en **Site URL** pon `http://localhost:3000`
   (después de publicar en Vercel, cámbiala por la URL de Vercel y agrega ambas en *Redirect URLs*).

### 2. Configurar las claves
1. En Supabase: **Project Settings → API**. Copia *Project URL* y la clave *anon public*.
2. En la carpeta del proyecto, copia `.env.local.example` como `.env.local` y pega esos dos valores.

### 3. Correr la app en tu PC
```bash
npm install
npm run dev
```
Abre http://localhost:3000, crea tu cuenta y confirma el correo.

### 4. Convertirte en administrador
En Supabase **SQL Editor**:
```sql
update public.perfiles set rol = 'admin' where correo = 'TU_CORREO';
```
Cierra sesión y vuelve a entrar: verás "Todos los informes" y la etiqueta *Admin*.

### 5. Subir a GitHub y publicar en Vercel
```bash
git init
git add .
git commit -m "App de informes de generadores"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/informes-generadores.git
git push -u origin main
```
En https://vercel.com → **Add New → Project** → importa el repositorio.
En **Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Deploy**.

## Estructura
```
supabase/schema.sql                    Tablas, seguridad y bucket de fotos
src/app/login/                         Registro e inicio de sesión
src/app/informes/                      Lista de informes (técnico / admin)
src/app/informes/nuevo/                Formulario de evaluación
src/app/informes/[id]/                 Detalle, fotos e impresión
src/lib/supabase/                      Conexión a Supabase
src/middleware.ts                      Protege las páginas (exige sesión)
```
