import { sql } from "drizzle-orm";
import type { Database } from "./client";
import { criterion, milestone, project } from "./schema";

const projects = [
  {
    name: "Recetario",
    status: "active",
    why: "App web para guardar y planificar recetas",
    milestone: {
      title: "Recetario corriendo en staging",
      doneDefinition: "[DEFINICIÓN DE HECHO]",
      criteria: [
        "Build de producción sin errores",
        "Base de datos de staging creada",
        "Variables de entorno configuradas",
        "Login y creación de receta en staging",
      ],
    },
  },
  {
    name: "Blog personal",
    status: "active",
    why: "Blog estático para publicar notas técnicas",
  },
  {
    name: "Juego de cartas",
    status: "parked",
    why: "Juego de cartas por turnos para el navegador",
  },
] as const satisfies ReadonlyArray<
  Pick<typeof project.$inferInsert, "name" | "status" | "why"> & {
    milestone?: { title: string; doneDefinition: string; criteria: readonly string[] };
  }
>;

// Only inserts projects that do not exist yet, so re-running never duplicates
// rows nor overwrites changes made from the app.
export async function seed(db: Database) {
  await db.transaction(async (tx) => {
    for (const { name, status, why, ...rest } of projects) {
      const [created] = await tx
        .insert(project)
        .values({ name, status, why })
        .onConflictDoNothing({ target: sql`lower(${project.name})` })
        .returning({ id: project.id });

      if (!created || !("milestone" in rest)) continue;

      const { title, doneDefinition, criteria } = rest.milestone;
      const [{ id: milestoneId }] = await tx
        .insert(milestone)
        .values({ projectId: created.id, title, doneDefinition })
        .returning({ id: milestone.id });

      await tx.insert(criterion).values(criteria.map((text) => ({ milestoneId, text })));
    }
  });
}
