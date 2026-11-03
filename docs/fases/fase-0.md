# Fase 0 — Base (1 sesión)

Prompt para Claude Code:

> Lee `CLAUDE.md`, `docs/SPEC.md` y `docs/DESIGN.md`. Ejecuta la Fase 0 descrita en `docs/fases/fase-0.md`. No avances a la Fase 1.

## Tareas

1. Crear la app Next.js en la raíz de esta carpeta (App Router, TypeScript estricto, Tailwind, ESLint, `src/`). No borres ni sobrescribas `CLAUDE.md`, `README.md` ni `docs/`. Si `create-next-app` se niega porque la carpeta no está vacía, créala en una carpeta temporal y mueve los archivos aquí.
2. Configurar los tokens de `docs/DESIGN.md` en Tailwind (colores con los nombres de la tabla) y las fuentes Chakra Petch, Space Grotesk y JetBrains Mono con `next/font`. Respeta el vocabulario de interfaz de `docs/DESIGN.md` (partida, misión, objetivo, banca) solo en el texto visible; el código usa los nombres del dominio.
3. Instalar Drizzle + `@libsql/client` + `drizzle-kit`. Crear `src/db/schema.ts` con las 6 tablas de `docs/SPEC.md`, `src/db/client.ts` que lea `DATABASE_URL` y `DATABASE_AUTH_TOKEN` (opcional), y `drizzle.config.ts`.
4. `.env.example` con `DATABASE_URL=file:./local.db` y `DATABASE_AUTH_TOKEN=`. `.gitignore` con `local.db*` y `.env*` (menos `.env.example`).
5. Script `db:seed` con:
   - Recetario (active), why: "App web para guardar y planificar recetas", hito "Recetario corriendo en staging" con 4 criterios: "Build de producción sin errores", "Base de datos de staging creada", "Variables de entorno configuradas", "Login y creación de receta en staging".
   - Blog personal (active), why: "Blog estático para publicar notas técnicas", sin hito.
   - Juego de cartas (parked), why: "Juego de cartas por turnos para el navegador".
   - El seed debe ser idempotente (correrlo dos veces no duplica).
6. Página `/` provisional que liste los proyectos desde la base, con los tokens aplicados (solo para comprobar que todo conecta).
7. Scripts de `package.json`: `dev`, `build`, `lint`, `typecheck`, `test` (Vitest), `db:push`, `db:seed`.
8. `git init` y primer commit.

## Lista cuando

- `npm run db:push && npm run db:seed && npm run dev` muestra los 3 proyectos en `/`.
- `npm run lint`, `npm run typecheck` y `npm test` pasan.
