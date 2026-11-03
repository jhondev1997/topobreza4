# Spec v0 — Microapp de avance de proyectos

## Problema

Los proyectos se frenan porque cada idea nueva compite con la actual y porque las sesiones no cierran con algo funcionando. El tiempo real para avanzar es el bloque remoto de jueves a sábado; el desarrollo se delega a Claude Code. La app hace tres cosas: limita lo activo, convierte el siguiente paso en una sesión de Claude Code lista para arrancar y registra qué quedó funcionando.

## Reglas de diseño

- Máximo 2 proyectos activos; el resto queda estacionado.
- Una sola entrega siguiente por proyecto, verificable (algo que se ve funcionando).
- La sesión es la unidad de trabajo: empieza con un brief y termina con un cierre de 30 segundos.
- Las ideas nuevas se capturan, no se ejecutan.
- Cero configuración: sin etiquetas, prioridades ni sprints. Gratis.

## Módulos del MVP

| Módulo | Qué hace |
| --- | --- |
| Proyectos | Activo / estacionado / terminado, límite de 2 activos, una línea de "por qué existe" |
| Entrega siguiente | Hito con definición de hecho y 2 a 5 criterios marcables |
| Sesión | "Empezar" arma el brief; "Cerrar" pide: qué quedó, qué bloquea, siguiente paso |
| Bitácora | Historial de sesiones por proyecto; alimenta el siguiente brief |
| Decisiones | Preguntas abiertas y respuestas por proyecto |
| Estacionamiento | Captura rápida de ideas con fecha de revisión; se promueven solo si hay cupo |
| Termómetro | Días sin sesión por proyecto activo; si un hito acumula 3+ sesiones sin cerrarse, propone recortarlo |
| Revisión semanal | Pantalla de 5 min: qué se cerró, qué se enfría, qué idea merece cupo |
| Contador semanal | Número de sesiones cerradas en la semana, visible en Inicio |

## Uso semanal

1. Lunes a miércoles: solo captura desde el móvil.
2. Jueves a sábado: "Jugar sesión" → Claude Code lee el brief vía MCP → al final deja su resumen.
3. Al cerrar: confirmar o corregir el resumen y marcar criterios.
4. Sábado al mediodía: revisión semanal.

## Integración MCP

| Herramienta | Qué hace |
| --- | --- |
| `get_brief(project)` | Hito actual, criterios pendientes, últimas 3 entradas de bitácora, siguiente paso, decisiones abiertas. Si no hay sesión abierta, la abre. |
| `log_progress(project, summary, criteria_met[]?, next_criterion_id?, next_step?)` | Guarda el resumen como borrador (`confirmed=false`) y marca los criterios cumplidos. `next_criterion_id` es el criterio que sigue; `next_step`, un detalle opcional sobre él |
| `mark_criterion(criterion_id)` | Marca un criterio cumplido |
| `park_idea(text, project?)` | Manda una tangente al estacionamiento |
| `add_decision(project, question)` | Registra una decisión abierta |

`project` acepta el id o el nombre (sin distinguir mayúsculas). El bloque que va en el `CLAUDE.md` de cada repo de proyecto está en `docs/fases/fase-2.md`.

## Modelo de datos

| Tabla | Campos clave |
| --- | --- |
| `project` | id, name, status (active/parked/done), why, repo_path, last_session_at, parked_at, created_at |
| `milestone` | id, project_id, title, done_definition, status (open/done/cut), opened_at, closed_at |
| `criterion` | id, milestone_id, text, done, done_at |
| `session` | id, project_id, milestone_id, started_at, ended_at, brief_snapshot, brief_read_at, outcome, blocker, next_step, next_criterion_id, source (manual/claude_code), confirmed |
| `idea` | id, text, project_id (opcional), created_at, review_after, status (parked/promoted/discarded) |
| `decision` | id, project_id, question, status (open/decided), answer, decided_at |
| `weekly_review` | id, closed_at |

## Decisiones tomadas (30 oct 2026)

- Proyectos activos iniciales: Recetario y Blog personal. Juego de cartas: estacionado.
- Móvil: PWA instalable. React Native descartado por ahora (sería una segunda app que mantener); la lógica queda en `src/server/` para poder exponerla después.
- Datos: libSQL. Local con archivo; para usarla desde el celular, Turso + hosting gratuito en la Fase 4.
- La microapp no ocupa un cupo de activo: se construye en 6 a 8 sesiones y se valida usándola en un proyecto real.
- Umbral del termómetro: aviso a los 7 días sin sesión.
- Diseño: dirección "Partida" (interfaz tipo juego, oscura, acento lima). Ver `docs/DESIGN.md`.

## Pendiente

- Nombre de la app.
- Elegir hosting gratuito en la Fase 4 (revisar condiciones del plan gratuito en ese momento).

## Fuera de alcance

Multiusuario, etiquetas, prioridades, Gantt, sprints, IA dentro de la app, integraciones con Notion/Calendar/Gmail, estadísticas de productividad, notificaciones push (posible v2).
