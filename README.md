# Informes de Evaluación de Generadores

App web para que los técnicos suban informes de evaluación de grupos electrógenos.
Cada técnico se registra con su correo, y cada informe queda firmado con quien lo subió.
El administrador ve todos los informes y puede filtrarlos por técnico.

**Tecnología:** Next.js 15 + Firebase (cuentas, base de datos Firestore y fotos en Storage) + Vercel (publicación).

## Qué hace

- **Registro e inicio de sesión con correo y contraseña**, con confirmación por correo (o confirmación manual del administrador).
- **Formulario de evaluación**: datos generales, datos del generador, mediciones, inspección, estado general, observaciones, recomendaciones y fotos.
- **Control por técnico**: el servidor numera cada informe (#1, #2, …) y lo firma con la cuenta conectada; nadie puede subir un informe a nombre de otro.
- **Roles**: un técnico ve solo sus informes; el administrador ve todos, con filtro por técnico y búsqueda.
- **Informes inalterables para técnicos**: una vez enviado, solo el administrador puede editarlo o borrarlo.
- **Recuperar contraseña** con un código personal de un solo uso o por correo; el administrador también puede asignar una contraseña nueva.
- **Imprimir / Guardar PDF** desde la vista de cada informe.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Firebase
1. Entra a https://console.firebase.google.com → **Crear un proyecto**.
2. **Authentication → Comenzar → Correo electrónico/contraseña** → Habilitar.
3. **Firestore Database → Crear base de datos** → ubicación `southamerica-east1` → modo de producción.
4. **Storage → Comenzar** (requiere el plan Blaze; tiene cuota gratuita de 5 GB).
5. **Firestore → Reglas**: pega el contenido de `firebase/firestore.rules` → **Publicar**.
6. **Storage → Reglas**: pega el contenido de `firebase/storage.rules` → **Publicar** (acepta el permiso para leer Firestore si lo pide).
7. **Authentication → Configuración → Dominios autorizados**: agrega el dominio de Vercel (ej. `informes-t-cnicos.vercel.app`).

### 2. Configurar las claves
1. **Configuración del proyecto (⚙️) → General → Tus apps → Web (</>)** → registra la app y copia los valores de `firebaseConfig`.
2. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada** → se descarga un `.json` (es secreto).
3. Copia `.env.local.example` como `.env.local` y completa los valores (para Vercel, ver paso 4).

### 3. Correr la app en tu PC
```bash
npm install
npm run dev
```
Abre http://localhost:3000 y crea tu cuenta.

### 4. Publicar en Vercel
En Vercel → el proyecto → **Settings → Environment Variables**, agrega las mismas variables de `.env.local`
(incluida `FIREBASE_SERVICE_ACCOUNT` con todo el contenido del `.json`) y vuelve a desplegar.

### 5. Convertirte en administrador
Firebase → **Firestore Database → perfiles** → abre el documento con tu correo → cambia `rol` de `tecnico` a `admin`.
Recarga la app: verás "Todos los informes", el menú **Técnicos** y la etiqueta *Admin*.

## Estructura
```
firebase/firestore.rules        Seguridad de la base de datos
firebase/storage.rules          Seguridad de las fotos
src/lib/firebase.ts             Conexión a Firebase (navegador)
src/lib/firebaseAdmin.ts        Conexión a Firebase (servidor)
src/lib/sesion.tsx              Sesión del usuario y protección de páginas
src/app/api/                    Funciones del servidor (crear informe, recuperación, admin)
src/app/login/                  Registro e inicio de sesión
src/app/informes/               Lista, formulario nuevo y detalle de informes
src/app/tecnicos/               Panel de técnicos (solo admin)
```
