# Canal Asiscole — parche aviso de pensión

Copia de los archivos del backend móvil (`/opt/asiscole-canal` en el VPS) con el soporte mínimo para notificaciones de pensión **por la app** (no WhatsApp).

## Cambio

- Tipo de ingesta `aviso` permitido en HTTP.
- Plantilla `PlantillaAviso` usa `texto_libre` / `nota` del payload.
- El frontend SIE envía `tipo: "aviso"` con texto de pensión vía `/canal-api`.

## Aplicar en VPS

```bash
cp canal/backend/apps/ingesta/http_services.py /opt/asiscole-canal/backend/apps/ingesta/
cp canal/backend/apps/ingesta/views.py /opt/asiscole-canal/backend/apps/ingesta/
cp canal/backend/apps/mensajeria/plantillas/base.py /opt/asiscole-canal/backend/apps/mensajeria/plantillas/
docker restart asiscole_canal_backend
```
