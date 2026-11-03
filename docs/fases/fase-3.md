# Fase 3 — Foco (1 a 2 sesiones)

Prompt para Claude Code:

> Lee `CLAUDE.md`. Ejecuta la Fase 3 de `docs/fases/fase-3.md`, siguiendo `Ideas.dc.html` y `Revision.dc.html`.

## Tareas

1. **La banca** (`/ideas`, ver `Ideas.dc.html`): captura en una línea (proyecto opcional; `review_after` = próximo sábado), aviso de cupos "N/2", lista de ideas con "Revisar hoy" cuando `review_after` ≤ hoy, lista de proyectos estacionados con opción de activarlos si hay cupo.
2. **Decisiones** en la pantalla de Proyecto: agregar, responder (pasa a `decided`), listar abiertas.
3. **Termómetro**: si un hito tiene 3 o más sesiones cerradas sin pasar a `done`, mostrar en Proyecto la sugerencia "Este hito lleva N sesiones. ¿Lo recortas?" con acción para dividirlo (cierra el actual como `cut` y crea uno nuevo con los criterios pendientes).
4. **Reporte semanal** (`/revision`, ver `Revision.dc.html`): sesiones y criterios cumplidos en los últimos 7 días; proyectos activos con 7+ días sin sesión o sin hito, con Retomar (ir al proyecto) / Recortar (ir al hito) / Estacionar; ideas con revisión vencida (Posponer una semana / Descartar / Promover si hay cupo); conteo de decisiones abiertas. "Cerrar reporte" guarda la fecha de la revisión.
5. Botón "Estacionar una tangente" en Sesión activa: abre un campo y guarda la idea ligada al proyecto.

## Lista cuando

- Hago la primera revisión de sábado desde el celular de principio a fin.
