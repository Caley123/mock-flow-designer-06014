# WhatsApp con OpenWA (SIE)

Integración con [OpenWA](https://github.com/rmyndharis/OpenWA). **No hace falta Docker**: puede correr solo con Node.js en su PC.

## Requisitos (sin Docker)

| Requisito | Versión |
|-----------|---------|
| **Node.js** | 20 o 22 LTS — [nodejs.org](https://nodejs.org/) |
| **Git** | Para clonar OpenWA |
| **Google Chrome** | Lo usa WhatsApp por detrás (Puppeteer); instálelo si no lo tiene |

---

## Opción A — Sin Docker (recomendada si no tiene Docker)

### 1. Instalar y arrancar OpenWA

OpenWA ya está en **`./OpenWA`** dentro de este proyecto.

Desde la raíz del SIE:

```powershell
npm run openwa
```

O:

```powershell
.\scripts\iniciar-openwa.ps1
```

Deje esa ventana **abierta** (API `:2785`, dashboard `:2886`).

Primera instalación en otra PC:

```powershell
.\scripts\instalar-openwa.ps1
```

| Servicio   | URL |
|-----------|-----|
| **Dashboard** (QR, sesiones, API Key) | http://localhost:2886 |
| **API — comprobar que vive** | http://localhost:2785/api/health |
| **Swagger** (documentación) | http://localhost:2785/api/docs |

> **No abra** `http://localhost:2785/` ni `http://localhost:2785/api` solos: devuelven 404 y es normal. La interfaz visual es el **dashboard** (`:2886`).

**Atajo desde este proyecto** (clona en `E:\OpenWA` si no existe):

```powershell
cd e:\mock-flow-designer-06014
.\scripts\iniciar-openwa.ps1
```

### 2. Primera vez: API Key y sesión

1. Abra **http://localhost:2886**
2. En **API Key** pegue la clave por defecto de desarrollo (generada al primer arranque):

   ```
   dev-admin-key
   ```

   (también está en el archivo `OpenWA/data/.api-key`)

3. Pulse **Connect**
4. Cree una sesión (ej. `sie-colegio`) → **Inicie** → escanee el **QR**
5. Copie el **Session ID** (UUID) de esa sesión para `VITE_OPENWA_SESSION_ID` en `.env.local`

### 3. Configurar SIE (`.env.local`)

```env
VITE_OPENWA_ENABLED=true
VITE_OPENWA_API_URL=/api/openwa
VITE_OPENWA_SESSION_ID=pegue-el-session-id
VITE_OPENWA_API_KEY=pegue-la-api-key
```

Reinicie `npm run dev` en la carpeta del SIE.

### 4. Probar

**Vista tutor** → escanee un alumno con `telefono_contacto` cargado.

---

## Opción B — Con Docker (opcional)

```bash
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
docker compose -f docker-compose.dev.yml up -d
```

Mismas URLs (`:2785` API, `:2886` dashboard).

---

## Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| Toast: *OpenWA no está activo* | OpenWA no corre. Ejecute `npm run dev` dentro de la carpeta OpenWA y deje la terminal abierta. |
| `ECONNREFUSED` en consola | La API debe estar en **http://localhost:2785**. Compruebe que `npm run dev` de OpenWA sigue activo. |
| Falta Session ID / API Key | Complete `.env.local` desde el dashboard. |
| QR no aparece / sesión cae | Use Chrome instalado; reinicie la sesión en el dashboard. |
| `npm install` falla en OpenWA | Use Node 20+ (`node -v`). |

---

## Teléfono del apoderado

Campo `telefono_contacto` en estudiantes (ej. `900116737` → WhatsApp `51900116737@c.us`).

## Mensaje enviado

Nombre, curso, fecha, hora y estado de llegada. El registro en Supabase **siempre se guarda**, aunque falle WhatsApp.
