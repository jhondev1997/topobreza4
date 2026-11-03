# Workflow: cómo armar lo que pide Xion

Vale para cualquier sesión y cualquier agente. Las reglas del producto están en `CLAUDE.md` y `docs/SPEC.md`; lo que toca hacer, en `docs/ESTADO.md`.

## 1. Preparar

En un checkout nuevo (si no hay `node_modules` o `.env`):

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:push
pnpm db:seed
```

No sobrescribas un `.env` existente. Puede apuntar a Turso: compruébalo antes de correr `db:push`, `db:seed` o cualquier prueba que escriba datos, y para pruebas usa una base local temporal.

## 2. Ubicar el pedido

| Si Xion pide... | Entonces... |
| --- | --- |
| "Sigue" o "el siguiente" | Toma el primer pendiente de "Listo para hacer" en `docs/ESTADO.md`. |
| Algo que ya está en `docs/ESTADO.md` | Hazlo. Si está en "Por decidir", confirma primero lo que indica. |
| Algo nuevo y pequeño | Hazlo y regístralo en `docs/ESTADO.md` si deja algo pendiente. |
| Algo que choca con "Fuera de alcance" de `docs/SPEC.md` o con el stack | Di con qué choca y espera su decisión. |
| Una pregunta o una revisión | Responde o informa. No cambies código. |

Tamaño: una tarea debe caber en una sesión. Si no cabe, propón cómo dividirla y haz solo la primera parte.

Las ideas que aparezcan mientras trabajas no se ejecutan: se anotan en "Ideas sueltas" de `docs/ESTADO.md`.

Pregunta solo si la respuesta cambia lo que vas a construir y no se deduce del repo. Lo demás, decídelo y dilo al final.

## 3. Leer solo lo necesario

| Si tocas... | Lee antes |
| --- | --- |
| Cualquier cosa | `docs/ESTADO.md` y la parte pertinente de `docs/SPEC.md` |
| Pantallas o textos | `docs/DESIGN.md` y su `docs/design/*.dc.html` |
| APIs de Next.js (rutas, proxy, caché, server actions) | La guía en `node_modules/next/dist/docs/`; esta versión difiere de lo que recuerdas |
| Herramientas MCP | `mcp/tools.ts` y sus tests |
| Esquema | `src/db/schema.ts` y la sección "Cambios de esquema" de abajo |

## 4. Construir

Dónde va cada cosa:

| Capa | Ruta | Regla |
| --- | --- | --- |
| Dominio | `src/server/` | Toda la lógica y las reglas. Sin React. Recibe `db`. |
| Server actions | `src/app/**/actions.ts` | Solo leen el formulario y llaman al dominio con `runAction`. |
| Pantallas | `src/app/`, `src/components/` | Solo muestran. Ninguna regla vive solo aquí. |
| MCP | `mcp/tools.ts` | Adaptador fino sobre `src/server/`. |
| Esquema | `src/db/schema.ts` | Tablas y columnas en inglés. |

Convenciones que ya sigue el código:

- Una regla rota lanza `DomainError` con un mensaje en español que el usuario pueda entender. `runAction` y el MCP se lo devuelven tal cual.
- Las funciones que dependen de la hora reciben `now = new Date()`, para poder probarlas.
- Fechas y semanas siempre con `src/server/time.ts` (hora de Lima), nunca con la zona del servidor.
- En pantalla usa el vocabulario de `docs/DESIGN.md` (partida, misión, objetivo, banca). En el código, el del dominio (`project`, `milestone`, `criterion`).
- Si varias escrituras deben ir juntas, usa `db.transaction`.

Según el tipo de cambio:

- **Error:** primero un test que falle y lo reproduzca, después el arreglo.
- **Regla o función nueva:** tests en `src/server/*.test.ts` usando `createTestDb`, incluido el caso rechazado.
- **Pantalla:** compárala con su diseño a 390 px, con toques ≥ 44 px.
- **Cambio de comportamiento:** actualiza `docs/SPEC.md` en el mismo cambio.

### Cambios de esquema

- Local: `pnpm db:push` con la app detenida.
- Turso (`pnpm db:push:remote`): solo con el visto bueno de Xion, porque son sus datos reales.

## 5. Verificar

Antes de decir que está listo, siempre:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Además, según lo que toque:

| Si tocas... | Comprueba también |
| --- | --- |
| Rutas, proxy, configuración o dependencias | `pnpm build` (necesita `DATABASE_URL`) |
| Pantallas o el flujo de una sesión | Recorrerlo en la app real, no solo los tests |
| MCP | Sus tests y, si cambia una herramienta, una llamada real |
| Acceso | Probar sin sesión, con clave mala y con clave buena |

Si algo no se pudo comprobar, se dice. "Debería funcionar" no cuenta como comprobado.

## 6. Cerrar

1. Actualiza `docs/ESTADO.md`: quita lo terminado y agrega lo que quedó pendiente.
2. Resume a Xion en pocas líneas: qué quedó funcionando, cómo se comprobó, qué no se comprobó y qué sigue.
3. Para ahí. No empieces la siguiente tarea sin que te lo pida.

Commit y push solo cuando Xion lo pida. El mensaje dice qué cambió y por qué; nunca incluyas `.env*` ni `local.db*`.

## Requiere confirmación de Xion

- Cualquier cosa sobre Turso o datos reales.
- Desplegar, o elegir o cambiar el hosting.
- Agregar una dependencia o cambiar el stack.
- Modificar el repo de otro proyecto. **Los repos de los proyectos que se avanzan con la app no se tocan.**
