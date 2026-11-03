# Fase 4 — PWA y acceso desde el celular (1 sesión)

Prompt para Claude Code:

> Lee `CLAUDE.md`. Ejecuta la Fase 4 de `docs/fases/fase-4.md`. Antes de desplegar, muéstrame las opciones de hosting gratuito con sus condiciones actuales y espera mi elección.

## Tareas

1. **PWA**: `manifest.webmanifest` (nombre provisional "[NOMBRE]", `theme_color` `#0B0E14`, `background_color` `#0B0E14`, `display: standalone`), iconos 192 y 512 (placeholder simple), service worker básico que cachee el shell. Comprobar que se puede "Agregar a pantalla de inicio" en Android e iOS.
2. **Protección mínima**: es una app de un solo usuario expuesta en internet. Login con una clave en variable de entorno (`APP_PASSCODE`), cookie de sesión httpOnly firmada, middleware que proteja todas las rutas. Sin registro de usuarios.
3. **Base remota**: crear la base en Turso, aplicar el esquema, migrar los datos de `local.db`. El servidor MCP local apunta a la misma base remota (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`).
4. **Hosting**: presentar 2 o 3 opciones gratuitas compatibles con Next.js, con sus límites del plan gratuito revisados en el momento, recomendar una y esperar confirmación antes de desplegar.

## Lista cuando

- La app instalada en el celular abre, pide la clave una vez y muestra los mismos datos que en la PC.
- Una sesión de Claude Code en la PC aparece en el celular.
