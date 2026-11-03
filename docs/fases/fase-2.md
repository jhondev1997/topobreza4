# Fase 2 — Servidor MCP (1 a 2 sesiones)

Prompt para Claude Code:

> Lee `CLAUDE.md`. Ejecuta la Fase 2 de `docs/fases/fase-2.md`. Reutiliza `src/server/` y `src/db/`; no dupliques lógica.

## Tareas

1. Crear `mcp/server.ts` con `@modelcontextprotocol/sdk`, transporte stdio, que exponga las 5 herramientas de `docs/SPEC.md` (`get_brief`, `log_progress`, `mark_criterion`, `park_idea`, `add_decision`) con esquemas zod y descripciones claras en español.
2. `get_brief` abre la sesión si no hay una abierta para ese proyecto (con `source = claude_code`) y guarda `brief_snapshot`.
3. `log_progress` guarda el resumen con `confirmed = false`; la pantalla de Cierre lo muestra como "Borrador de Claude Code" y el usuario lo confirma.
4. En la pantalla de Sesión, mostrar "Claude Code leyó el brief vía MCP a las HH:MM" cuando corresponda.
5. Script `npm run mcp` (con `tsx`). Documentar en `README.md` cómo registrarlo en Claude Code, por ejemplo:
   `claude mcp add avance -- npx tsx <ruta-absoluta>/mcp/server.ts`
   con `DATABASE_URL` apuntando a la misma base que la app.
6. Tests de las herramientas llamando a sus handlers directamente.

## Bloque para el CLAUDE.md de cada proyecto (Recetario, Blog personal)

```md
## Microapp de avance
- Al empezar: llama a la herramienta MCP `get_brief` con el proyecto "<NOMBRE>" y trabaja sobre el hito y el siguiente paso que devuelve.
- Si aparece una idea fuera del hito, no la hagas: llama a `park_idea`.
- Si queda una decisión sin resolver, llama a `add_decision`.
- Al terminar: llama a `log_progress` con un resumen de 1 a 3 frases de lo que quedó funcionando, los criterios cumplidos y el siguiente paso.
```

## Lista cuando

- Una sesión de Claude Code en el repo de Recetario arranca con el brief y deja su registro, que aparece como borrador en Cierre.

Cambio de criterio (30 oct 2026): Xion no quiere modificar el repo de Recetario, que lleva su propia metodología. La fase se validó con Claude Code real en una carpeta de prueba vacía, con `--mcp-config` y una copia de la base. No se probó dentro del flujo real de Recetario. Para usarla allí sin tocar el repo, ver "Servidor MCP" en `README.md`.
