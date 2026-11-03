# Microapp de avance de proyectos

App personal para avanzar proyectos con Claude Code: 2 proyectos activos, una entrega a la vez, sesiones con brief y cierre.

- Spec: `docs/SPEC.md`
- Diseño: `docs/DESIGN.md` y `docs/design/`
- Instrucciones para Claude Code: `CLAUDE.md`
- Qué toca ahora: `docs/ESTADO.md`
- Cómo se arma cada pedido: `docs/WORKFLOW.md`

## Servidor MCP

Claude Code lee el brief y deja su resumen con las herramientas de `mcp/server.ts`.

**Sin tocar el proyecto ni la configuración de Claude Code (recomendado).** Guarda esto en un archivo fuera del repo del proyecto, por ejemplo `avance-mcp.json`:

```json
{
  "mcpServers": {
    "avance": {
      "type": "stdio",
      "command": "node",
      "args": ["[RUTA-ABSOLUTA]/node_modules/tsx/dist/cli.mjs", "[RUTA-ABSOLUTA]/mcp/server.ts"]
    }
  }
}
```

Y abre Claude Code con él, solo para esa sesión, pidiéndole en el mensaje inicial que llame a `get_brief`:

```bash
claude --mcp-config [RUTA]/avance-mcp.json
```

**Permanente, solo si quieres.** `claude mcp add --scope user` deja las herramientas visibles en todos los repos, y el bloque de `docs/fases/fase-2.md` en un `CLAUDE.md` modifica ese proyecto:

```bash
claude mcp add --scope user avance -- node [RUTA-ABSOLUTA]/node_modules/tsx/dist/cli.mjs [RUTA-ABSOLUTA]/mcp/server.ts
```

`[RUTA-ABSOLUTA]` es esta carpeta. Se usa `node` directo y no `pnpm exec tsx` porque en otro repo `pnpm` no encontraría este `tsx`, y en Windows necesitaría además `cmd /c`.

El servidor lee el `.env` de esta carpeta y resuelve `DATABASE_URL` desde aquí, así que usa la misma base que la app sin importar desde qué repo lo lance Claude Code. Para otra base, agrega `"env": { "DATABASE_URL": "..." }` al archivo.

Si cambia `src/db/schema.ts`, corre `pnpm db:push` con la app detenida. `pnpm mcp` levanta el servidor a mano; espera mensajes por stdin, así que se ve detenido.

## Despliegue (Turso + Vercel)

Las claves van en archivos locales ignorados por git, nunca en el repo.

1. Crea `.env.turso` con la base de Turso:

   ```
   DATABASE_URL=libsql://...
   DATABASE_AUTH_TOKEN=...
   ```

2. Aplica el esquema y copia los datos de `local.db`. La copia se niega si la base remota ya tiene datos:

   ```bash
   pnpm db:push:remote
   ```

   ```bash
   pnpm db:copy-to-remote
   ```

3. Despliega con `pnpm dlx vercel`, y define en Vercel (Production) `DATABASE_URL`, `DATABASE_AUTH_TOKEN` y `APP_PASSCODE`. `.vercelignore` evita subir `.env*` y `local.db`.

4. Para que la app local y el servidor MCP usen la misma base, pon esos mismos valores de `DATABASE_URL` y `DATABASE_AUTH_TOKEN` en `.env`.

## Cómo avanzar

Abre una sesión en esta carpeta y pide lo que necesites, o simplemente "sigue con lo que toca". `CLAUDE.md` la lleva a leer `docs/ESTADO.md` (qué toca) y `docs/WORKFLOW.md` (cómo armarlo).

Fases originales, como referencia:

| Fase | Archivo | Sesiones (estimado) |
| --- | --- | --- |
| 0 — Base | `docs/fases/fase-0.md` | 1 |
| 1 — Sesión manual | `docs/fases/fase-1.md` | 2 a 3 |
| 2 — Servidor MCP | `docs/fases/fase-2.md` | 1 a 2 |
| 3 — Foco | `docs/fases/fase-3.md` | 1 a 2 |
| 4 — PWA y celular | `docs/fases/fase-4.md` | 1 |

Desde la Fase 1, úsala para avanzar un proyecto real: así se valida de verdad.
