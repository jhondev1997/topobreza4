# Fase 1 — Sesión manual (2 a 3 sesiones)

Prompt para Claude Code:

> Lee `CLAUDE.md`. Ejecuta la Fase 1 de `docs/fases/fase-1.md`, siguiendo las pantallas de `docs/design/`. Si es mucho para una sesión, haz primero las tareas 1 a 3, deja todo funcionando y avísame.

## Tareas

1. **Capa de dominio** en `src/server/` (funciones puras sobre Drizzle, sin React): crear/activar/estacionar proyecto, crear hito con criterios, marcar criterio, abrir sesión, cerrar sesión, listar bitácora, días desde la última sesión. Aplica las reglas de `CLAUDE.md` (máx. 2 activos, 1 hito abierto por proyecto, 1 sesión abierta en total). Tests con Vitest para cada regla.
2. **Inicio** (`/`) según `Main.dc.html`: contador de sesiones de la semana, tarjetas de partidas con misión, barra de objetivos por segmentos, siguiente movimiento y botón "Jugar"; estado verde "hace N días" o tarjeta naranja "−N días" con barra de enfriamiento desde 7 días; aviso "Sin misión definida". Fila "En banca". Botón "Anotar idea" (por ahora enlaza a `/ideas`). Nav inferior.
3. **Proyecto** (`/p/[id]`) según `Proyecto.dc.html`: entrega, definición de hecho, criterios marcables, siguiente paso, bitácora (últimas entradas, marcando las de Claude Code), botón "Jugar sesión". Si no hay hito, formulario para crearlo (título, definición de hecho, 2 a 5 criterios).
4. **Sesión activa** (`/p/[id]/sesion`) según `Sesion.dc.html`: cronómetro desde `started_at`, brief generado (texto plano, mismo formato que el diseño) con botón "Copiar", botón "Cerrar sesión". El estado MCP se muestra como "Brief sin leer por Claude Code" mientras no exista la Fase 2.
5. **Cierre** (`/p/[id]/cierre`) según `Cierre.dc.html`: qué quedó (textarea), criterios cumplidos, bloqueo, siguiente paso. "Confirmar cierre" guarda, actualiza `last_session_at` y vuelve a Inicio.
6. El generador del brief vive en `src/server/brief.ts` y es el mismo que usará el MCP.

## Lista cuando

- Puedo registrar de punta a punta una sesión real de Recetario desde el celular (en la red local con `npm run dev -- -H 0.0.0.0`).
- Intentar activar un tercer proyecto muestra el error.
- Tests de las reglas en verde.
