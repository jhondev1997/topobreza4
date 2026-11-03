# Ajuste 1 — Misiones que se puedan comprobar (1 sesión)

Prompt para Claude Code:

> Lee `CLAUDE.md` y ejecuta `docs/fases/ajuste-1.md`. No agregues nada fuera de esta lista.

## Por qué

En la primera prueba quedaron una misión "El canvas", hecha cuando "se pueda armar bien el canvas", objetivos como "Canvas simple" y un siguiente movimiento "Seguridad" que no tiene que ver con la misión. Con eso, la siguiente sesión empieza sin saber qué hacer. La app tiene que hacer difícil escribir algo vago y mantener el siguiente movimiento atado a la misión.

## Tareas

1. **Siguiente movimiento elegido, no escrito.**
   - Agrega a `session` la columna `next_criterion_id` (FK a `criterion`, nullable) y aplica el esquema.
   - En Cierre (`CloseForm.tsx`), reemplaza el input libre "Siguiente movimiento" por una lista de opciones (radio) con los objetivos que siguen pendientes después de lo marcado en esta sesión; se actualiza al marcar o desmarcar objetivos. Debajo, un campo opcional "Detalle" de una línea.
   - Guarda `next_criterion_id` y en `next_step` el texto "<objetivo>" o "<objetivo> — <detalle>", para que Inicio, Proyecto y el brief sigan funcionando sin más cambios.
   - Si no quedan objetivos pendientes: en lugar de la lista, el mensaje "Misión cumplida" y el siguiente movimiento queda como "Definir la siguiente misión".
   - Valida en `src/server/sessions.ts` que `next_criterion_id` pertenezca a la misión abierta y siga pendiente.

2. **MCP alineado.** En `get_brief`, lista los objetivos pendientes con su id. En `log_progress`, agrega `next_criterion_id` (opcional) y deja `next_step` como el detalle. Si llega un `next_criterion_id` inválido, devuelve un error claro en lugar de guardar. Actualiza la descripción de las herramientas y sus tests.

3. **Misiones difíciles de escribir vagas** (validar en `src/server/milestones.ts` y mostrar el error en el formulario):
   - "Hecho cuando": mínimo 6 palabras.
   - Cada objetivo: mínimo 3 palabras.
   - Placeholders con ejemplos concretos:
     - Misión: "Ej.: Exportar formularios a PDF"
     - Hecho cuando: "Ej.: Abro un formulario lleno, pulso Exportar y se descarga un PDF legible"
     - Objetivo: "Ej.: El botón Exportar genera un PDF con los campos"
   - Una línea de ayuda bajo "Objetivos": "Cada objetivo debe poder comprobarse en menos de un minuto."

4. **Editar la misión abierta.** En Proyecto, un enlace "Editar misión" que abre el mismo formulario precargado (título, hecho cuando, objetivos pendientes; los cumplidos se muestran pero no se editan). Solo cuando no hay una sesión abierta. Aplica las mismas validaciones.

## Lista cuando

- No puedo guardar una misión con "Hecho cuando: se pueda armar bien el canvas" ni con un objetivo de 2 palabras.
- Al cerrar una sesión, el siguiente movimiento solo puede ser un objetivo pendiente de la misión, y aparece así en Inicio, Proyecto y el brief.
- Puedo corregir la misión "El canvas" desde Editar misión.
- `npm run lint`, `npm run typecheck` y `npm test` pasan.
