# Estado del proyecto

Última actualización: 2 nov 2026. Cada sesión la mantiene al día al cerrar (ver `docs/WORKFLOW.md`).

## Dónde estamos

- Hechas: Fases 0 a 3 y `docs/fases/ajuste-1.md`.
- Fase 4: hecha solo la parte local (PWA, clave de acceso y copia a Turso). Falta crear la base en Turso, elegir hosting, desplegar y probar en el celular.
- Fase 2: validada con Claude Code real en una carpeta de prueba, no dentro de un proyecto real.
- Revisión del 2 nov 2026: lint, typecheck, los 115 tests y el build pasan. No cubrió la comparación visual con `docs/DESIGN.md`, la instalación en un celular ni el MCP en una sesión real.
- La carpeta del repo no tenía `.env` ni `local.db` en esa revisión, así que aquí no hay datos de uso real.
- Publicado el 2 nov 2026 como repo público en https://github.com/jhondev1997/topobreza4 (MIT). El repo se borró y se volvió a crear con un solo commit limpio, así que los commits antiguos ya no existen en GitHub.
- Siguiente propuesto: el error 3 de "Listo para hacer" (`pnpm dev` sin clave). Xion aún no eligió si va antes que el 1.

## Listo para hacer

En orden. Son errores reproducidos; no necesitan más decisiones.

### 1. "Siguiente movimiento" desactualizado

`latestNextStep` (`src/server/overview.ts:37`) devuelve el texto de la última sesión cerrada aunque ya no sea cierto.

- Termina una misión y crea otra: Inicio, Proyecto y el brief siguen diciendo "Definir la siguiente misión".
- Elige un objetivo como siguiente y elimínalo al editar la misión: se sigue mostrando.
- También puede quedar obsoleto al marcar ese objetivo o cambiar su texto desde Proyecto.

**Listo cuando:** "Siguiente" nunca muestra un objetivo eliminado o cumplido, ni "Definir la siguiente misión" si ya hay una misión abierta. Hay tests para cada caso.

### 2. Sesión abierta que queda sin misión

Si `get_brief` abre sesión en un proyecto sin misión y luego se crea la misión (`src/server/milestones.ts:41`, formulario en `src/app/p/[id]/page.tsx:161`), `session.milestone_id` queda en `null`. `log_progress` rechaza los ids que dio `get_brief`, y el cierre no muestra objetivos. El seed deja a "Blog personal" en ese caso.

**Decisión:** `createMilestone` enlaza la misión nueva a la sesión abierta de ese proyecto.

**Listo cuando:** en ese recorrido, `log_progress` acepta los ids, el cierre muestra los objetivos y hay un test.

### 3. `pnpm dev` sin clave expone los datos en la red

Sin `APP_PASSCODE`, `src/proxy.ts:8` deja todo abierto en desarrollo, y se comprobó que responde sin clave en la IP de la red local. Con el paso 4 del despliegue en `README.md`, `.env` apunta a Turso, así que serían los datos reales.

**Decisión:** en desarrollo, sin clave solo se entra si `DATABASE_URL` es una base local (`file:`). Con una base remota responde 503, igual que en producción. Explicarlo en `.env.example` y `README.md`.

**Listo cuando:** se comprueba con `pnpm dev` en los dos casos.

## Por decidir

Propuestas de la revisión. Xion aún no las aprobó: confirma con Xion antes de construirlas.

| # | Propuesta | Por qué |
| --- | --- | --- |
| 1 | Mostrar "Hecho cuando" en el cierre y pedir "lo comprobé" antes de cerrar la misión | Hoy Claude escribe el resumen y marca objetivos, y la misión se cierra sola al guardar. Lo que "quedó funcionando" no se comprueba, y esa es la promesa central. |
| 2 | Terminar un proyecto | El estado "Terminado" es inalcanzable. |
| 3 | Crear y editar proyectos | Solo nacen del seed o de promover una idea, y el texto de la idea pasa a ser su nombre y su "por qué". Una tangente ligada a un proyecto se convierte en otro proyecto. |
| 4 | Abandonar una sesión | Un `get_brief` por error bloquea todo hasta escribir un resultado, y la sesión falsa cuenta en las estadísticas. |
| 5 | Recorte real, eligiendo qué objetivos se quedan | Hoy "Recortar" copia la misma misión y pone el contador en 0. Una misión de un solo objetivo tampoco se puede editar sin agregar otro. |
| 6 | Subir el aviso de enfriamiento a 8 o 9 días | Con 7, un proyecto trabajado cada jueves se ve "frío" el jueves siguiente. Cambia una decisión de `docs/SPEC.md`. |
| 7 | Nombre de la app | El manifest sigue con `[NOMBRE]`. Lo decide Xion. |

Decisión de la revisión, sin tarea: no agregar más reglas para detectar textos vagos. Contar palabras no los detecta, y la propuesta 1 lo cubre mejor.

## Publicar como open source

Auditoría del 2 nov 2026: no apareció ningún secreto. La búsqueda fue por patrones (`gitleaks` y `trufflehog` no están instalados), así que una clave sin un formato reconocible podría haberse escapado.

Decidido y hecho el 2 nov 2026:

- Se borró el historial: el repo se reemplazó por un único commit limpio, subido a la fuerza a `origin/main`. GitHub podría seguir sirviendo los commits antiguos si alguien tiene su SHA; eso no se ha comprobado.
- Licencia MIT (`LICENSE` y `package.json`).
- Los nombres de proyectos reales se cambiaron por ejemplos genéricos (Recetario, Blog personal, Juego de cartas) en el seed, los tests, `docs/` y los diseños.
- Se quitaron del repo los enlaces de claude.ai y el comentario personal de `docs/fases/ajuste-1.md`. `.mcp.json`, `.claude/settings.local.json` y `avance-mcp.json` quedaron en `.gitignore`.
- `README.md` explica la puesta en marcha (comprobada en un clon limpio: install, `db:push`, `db:seed` y `pnpm dev` responden 200) y la licencia.

Pendiente de Xion:

- Decidir si se quedan la rutina de jueves a sábado y el alias en `docs/SPEC.md` y `CLAUDE.md`.
- Nombre de la app (propuesta 7 de "Por decidir"): siguen visibles `[NOMBRE]` en `src/app/manifest.ts:5-6` y `src/app/layout.tsx:24-26`. El paquete y el repo se llaman `topobreza4`.

Otras recomendaciones de la revisión con opencode (2 nov 2026), sin aprobar:

- CI en GitHub Actions con `pnpm lint`, `pnpm typecheck` y `pnpm test`.
- Completar `package.json`: `description`, `repository` y `engines` (Node >= 20.9).
- Firmar la cookie con un `SESSION_SECRET` aparte, en vez de con `APP_PASSCODE` (`src/server/auth.ts`).
- Quitar `.claude/launch.json` del repo (opcional).

Antes de desplegar: el login no limita intentos ni exige una clave mínima (`src/app/api/login/route.ts:9`), y sigue abierto el error 3 de "Listo para hacer". Mejoras que no bloquean: la sesión dura 1 año, no hay logout y faltan cabeceras CSP y HSTS.

## Después

1. Terminar la Fase 4 (`docs/fases/fase-4.md`): usar una clave larga y aleatoria, porque el login no limita intentos. Comprobar también que el hosting instala con pnpm 12 (`packageManager` en `package.json`); eso no se ha probado.
2. Usarla dos semanas con un solo proyecto real, sin agregar funciones hasta entonces.

## Restricciones vigentes

- Los repos de los proyectos que se avanzan con la app no se modifican. Para usar el MCP en ellos sin tocarlos, ver "Servidor MCP" en `README.md`.
- No se despliega en Vercel (decisión de Xion, 2 nov 2026). La sección "Despliegue" de `README.md` y `.vercelignore` siguen ahí hasta decidir el hosting.

## Ideas sueltas

Lo que aparezca durante una sesión y no sea de la tarea. Se anota aquí y no se ejecuta.

- (ninguna)
