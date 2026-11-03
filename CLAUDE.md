# Microapp de avance de proyectos

App personal de un solo usuario (Xion) para avanzar proyectos propios. No es un gestor de tareas genérico: limita los proyectos activos, prepara cada sesión de Claude Code con un brief y registra qué quedó funcionando.

## Antes de hacer cualquier pedido

1. Lee `docs/ESTADO.md` (dónde está el proyecto y qué toca).
2. Sigue `docs/WORKFLOW.md` (cómo armar lo que se pide, verificarlo y cerrarlo).
3. Trabaja SOLO en lo que se te pida. Al terminar, para y resume qué quedó.

Referencias: `docs/SPEC.md` (qué hace y qué NO hace), `docs/DESIGN.md` y `docs/design/*.dc.html` (referencia visual exacta), `docs/fases/` (prompts e historial de cada fase) y `AGENTS.md` (esta versión de Next.js difiere de lo que recuerdas).

## Stack (decidido, no cambiar sin preguntar)

- Next.js (App Router, TypeScript estricto, server actions) — una sola app, sin backend aparte. No NestJS.
- Drizzle ORM + libSQL (`@libsql/client`): en local `DATABASE_URL=file:./local.db`; en producción, Turso (`libsql://...` + `DATABASE_AUTH_TOKEN`).
- Tailwind CSS con los tokens de `docs/DESIGN.md`.
- Servidor MCP en TypeScript con `@modelcontextprotocol/sdk`, transporte stdio, en `mcp/`. Reutiliza el módulo de base de datos de `src/db/`.
- PWA (manifest + service worker) para instalar en el celular. React Native queda fuera por ahora; por eso toda la lógica vive en `src/server/` y no en los componentes, para poder exponerla como API si algún día hay cliente nativo.
- Gestor de paquetes: pnpm. No uses npm ni npx en este repo; `package-lock.json` está ignorado a propósito.

## Reglas del dominio (validar en el servidor, no solo en la UI)

- Máximo 2 proyectos con status `active`. Activar un tercero debe fallar con un mensaje claro.
- Cada proyecto activo tiene como máximo un hito con status `open`.
- Una sesión abierta por vez en todo el sistema.
- El resumen que escribe Claude Code vía MCP se guarda con `confirmed = false` hasta que el usuario lo confirme en la pantalla de cierre.
- Las ideas nunca se convierten en proyecto activo si no hay cupo.

## Convenciones

- Interfaz en español (es-PE). Código, nombres de tablas y variables en inglés.
- Mobile-first: diseña a 390 px de ancho; toques ≥ 44 px.
- Sin dependencias de pago. Nada de servicios externos salvo Turso y el hosting en la Fase 4.
- Nada de lorem ipsum: si falta un dato, placeholder `[ASÍ]`.
- Antes de dar una tarea por terminada: `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde.

## Comandos

- `pnpm dev` — app en local
- `pnpm build` — build de producción (necesita `DATABASE_URL`)
- `pnpm db:push` — aplicar esquema
- `pnpm db:seed` — datos iniciales
- `pnpm mcp` — levantar el servidor MCP (para probarlo a mano)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`

## Límite de alcance

Toda la app debería salir en 6 a 8 sesiones. Si una tarea crece mucho, avisa y propone recortar en vez de seguir agregando.
