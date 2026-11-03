# Diseño — dirección "Partida"

Copia local de cada pantalla: `docs/design/*.dc.html` (HTML con estilos inline; úsalo como referencia exacta de espaciados, tamaños y colores, no como código a copiar).

Idea: la app se siente como una interfaz de juego. Cada proyecto activo es una partida, la entrega es la misión, los criterios son objetivos que llenan una barra por segmentos y el estancamiento se ve como una barra que se vacía. Interfaz original: no copiar la de ningún juego real.

## Vocabulario de la interfaz

En el código y la base se mantienen los nombres del dominio (`milestone`, `criterion`, `session`, `idea`, `parked`). Solo cambia el texto visible:

| Dominio | En pantalla |
| --- | --- |
| Proyecto activo | Partida ("2 partidas en curso") |
| Entrega / hito | Misión ("Misión actual") |
| Criterio | Objetivo |
| Siguiente paso | Siguiente movimiento |
| Empezar sesión | Jugar / Jugar sesión |
| Cerrar sesión | Terminar partida → pantalla "Resultado" → "Guardar resultado" |
| Estacionamiento / estacionado | La banca / en banca |
| Bitácora | Historial |
| Revisión semanal | Reporte semanal |
| Días sin sesión | "−9 días", "Se está enfriando" |

## Pantallas (390 × 844)

| Archivo | Pantalla | Ruta sugerida |
| --- | --- | --- |
| `Main.dc.html` | Inicio: contador de sesiones de la semana, tarjetas de partidas, en banca, "Anotar idea" | `/` |
| `Proyecto.dc.html` | Proyecto: misión con objetivos, siguiente movimiento, decisiones, historial, "Jugar sesión" | `/p/[id]` |
| `Sesion.dc.html` | Sesión activa: cronómetro grande, estado MCP, brief copiable, tangente a la banca, "Terminar partida" | `/p/[id]/sesion` |
| `Cierre.dc.html` | Resultado: chip "+N · X/Y", borrador de Claude Code, objetivos, bloqueo, siguiente movimiento | `/p/[id]/cierre` |
| `Ideas.dc.html` | La banca: captura, cupos 2/2, ideas, proyectos en banca | `/ideas` |
| `Revision.dc.html` | Reporte semanal: lo cerrado, lo que se enfría (Retomar / Recortar / A banca), idea candidata | `/revision` |

Nav inferior fija en Inicio, Ideas y Revisión. Proyecto, Sesión y Cierre van sin barra inferior.

## Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0B0E14` | Fondo general, con patrón diagonal `repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 14px)` |
| `bg-session` | `#070A0F` | Fondo de la sesión activa, con líneas horizontales lima al 3% cada 4 px y una franja lima de 3 px arriba |
| `panel` | `#141925` | Tarjetas, inputs |
| `panel-line` | `#263046` | Bordes de tarjeta |
| `line-strong` | `#3A4560` | Bordes de inputs y botones outline |
| `check-empty` | `#4A5570` | Casilla vacía de objetivo |
| `nav-bg` / `nav-line` | `#0E121A` / `#1E2536` | Barra inferior |
| `text` | `#E9ECF2` | Texto principal |
| `text-2` | `#B7BDCA` | Texto secundario |
| `muted` | `#8B93A5` | Etiquetas, fechas, nav inactiva |
| `lime` | `#C8F031` | Acento único: CTA, progreso, etiquetas, nav activa. Texto encima: `#0B0E14` |
| `lime-hover` | `#E1FF6B` | Hover |
| `lime-panel` / `lime-line` | `#161D0C` / `#44561A` | Panel "siguiente movimiento", objetivo marcado |
| `ok` | `#7BE495` | "hace N días" al día, punto MCP conectado |
| `ok-panel` / `ok-line` | `#0D1A12` / `#1F4A2C` | Aviso MCP |
| `warn` | `#FF8A3D` | Enfriamiento: "−N días", barra que se vacía, chip "Revisar hoy" (texto `#0B0E14`) |
| `warn-text` | `#FFB07A` | Mensaje de aviso |
| `warn-panel` / `warn-line` / `warn-track` | `#1A1410` / `#5A2E12` / `#3A2416` | Tarjeta de proyecto que se enfría |
| `warn-muted` | `#C9B7A8` | Texto secundario dentro del aviso |

Lima y naranja se distinguen también por luminosidad. No agregues un tercer color de acento.

## Tipografía

- Display, etiquetas, botones, números y nav: **Chakra Petch** 500–700, casi siempre en MAYÚSCULAS. Etiquetas a 11–12 px con `letter-spacing` 0.12–0.18em.
- Cuerpo: **Space Grotesk** 400–700.
- Brief de la sesión: **JetBrains Mono** 400–500.
- Escala: título de pantalla 28–30/700, cronómetro 68/700, número grande 52/700, nombre de partida 22/700, cuerpo 14–15, secundario 12–13.
- Carga con `next/font/google`.

## Forma

- Sin bordes redondeados. La firma es la **esquina cortada**:
  - Tarjetas: corte de 22 px arriba a la derecha — `clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)`.
  - Botones grandes: dos esquinas cortadas de 12 px — `polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)`.
  - Chips y botón "Jugar": paralelogramo — `polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)`.
- Barra de objetivos: un segmento por criterio, `skewX(-20deg)`, 10 px de alto, 4 px de separación, lima lleno / `panel-line` vacío.
- Barra de enfriamiento: 6 px; se vacía de 100% (día 0) a 0% (día 14); naranja desde el día 7.
- Botón principal: alto 56, ancho completo, al pie del contenido. Secundario: borde 2 px lima sin relleno.
- Iconos: trazo 2 px estilo lineal (equivalen a Lucide: home, lightbulb, calendar-check, chevron-left/right, plus, play). Usa `lucide-react`.
- Sin sombras, sin degradados de color, sin emoji.

## Movimiento (opcional, Fase 3)

- Al marcar un objetivo, el segmento se llena con una transición de 200 ms.
- Al guardar el resultado de una sesión, el chip "+N" aparece con un pequeño escalado. Respeta `prefers-reduced-motion`.

## Accesibilidad

- Toques ≥ 44 px. Botones reales (`<button>`), enlaces reales (`<a>`), cada input con `<label>`.
- `aria-label` en botones de solo icono. `aria-current="page"` en la nav activa.
- `clip-path` recorta también el anillo de foco: dibuja el foco con `outline` en un elemento interno o con `box-shadow: inset`.
