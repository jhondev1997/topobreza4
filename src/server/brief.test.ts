import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/db/client";
import { criterion, decision, session } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { generateBrief, startSession } from "./brief";
import { createMilestone, setCriterionDone } from "./milestones";
import { getOpenSessionOverview } from "./overview";
import { activateProject, createProject } from "./projects";
import { closeSession, openSession } from "./sessions";

let db: Database;
let close: () => void;

beforeEach(() => {
  ({ db, close } = createTestDb());
});

afterEach(() => close());

const newActiveProject = async (name = "Recetario") => {
  const created = await createProject(db, { name, why: "Porque sí" });
  await activateProject(db, created.id);
  return created;
};

const closeWith = async (projectId: string, outcome: string, endedAt: string, nextStepDetail?: string) => {
  const opened = await openSession(db, { projectId });
  const [next] = opened.milestoneId
    ? await db.select().from(criterion).where(and(eq(criterion.milestoneId, opened.milestoneId), eq(criterion.done, false)))
    : [];
  await closeSession(
    db,
    { sessionId: opened.id, outcome, nextCriterionId: next?.id, nextStepDetail },
    new Date(endedAt),
  );
};

describe("generateBrief", () => {
  it("writes the plain text brief with every section", async () => {
    const { id } = await newActiveProject();
    const mission = await createMilestone(db, {
      projectId: id,
      title: "Recetario corriendo en staging",
      doneDefinition: "Entro a staging y creo un formulario",
      criteria: ["Build sin errores", "Variables quedan configuradas", "Login en staging"],
    });
    const [first] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    await setCriterionDone(db, first.id, true);
    await db.insert(decision).values({ projectId: id, question: "¿Precio de las plantillas?" });
    await closeWith(id, "Entrada 1", "2026-10-20T15:00:00Z");
    await closeWith(id, "Entrada 2", "2026-10-22T15:00:00Z");
    await closeWith(id, "Entrada 3", "2026-10-24T15:00:00Z");
    await closeWith(id, "Base de staging creada", "2026-10-28T15:00:00Z", "Variables de entorno");

    expect(await generateBrief(db, id)).toBe(
      [
        "Proyecto: Recetario",
        "Misión: Recetario corriendo en staging",
        "Hecho cuando: Entro a staging y creo un formulario",
        "Pendiente:",
        "- Variables quedan configuradas",
        "- Login en staging",
        "Último:",
        "- 28 OCT: Base de staging creada",
        "- 24 OCT: Entrada 3",
        "- 22 OCT: Entrada 2",
        "Siguiente: Variables quedan configuradas — Variables de entorno",
        "Decisiones abiertas:",
        "- ¿Precio de las plantillas?",
        "Al terminar: llama a log_progress",
      ].join("\n"),
    );
  });

  it("leaves out the sections with no data", async () => {
    const { id } = await newActiveProject();
    expect(await generateBrief(db, id)).toBe(
      ["Proyecto: Recetario", "Misión: sin definir", "Al terminar: llama a log_progress"].join("\n"),
    );
  });

  it("fails for a project that does not exist", async () => {
    await expect(generateBrief(db, "no-existe")).rejects.toThrow("no existe");
  });
});

describe("startSession", () => {
  it("opens a session with a snapshot of the brief", async () => {
    const { id } = await newActiveProject();
    const started = await startSession(db, id);
    expect(started.briefSnapshot).toBe(await generateBrief(db, id));
    expect(started.source).toBe("manual");
  });

  it("resumes the open session of the same project", async () => {
    const { id } = await newActiveProject();
    const first = await startSession(db, id);
    const second = await startSession(db, id);
    expect(second.id).toBe(first.id);
    expect(await db.select().from(session)).toHaveLength(1);
  });

  it("does not start while another project has an open session", async () => {
    const first = await newActiveProject("Uno");
    const second = await newActiveProject("Dos");
    await startSession(db, first.id);
    await expect(startSession(db, second.id)).rejects.toThrow("partida abierta en Uno");
  });
});

describe("getOpenSessionOverview", () => {
  it("returns null without an open session", async () => {
    const { id } = await newActiveProject();
    expect(await getOpenSessionOverview(db, id)).toBeNull();
  });

  it("returns the session with its mission and criteria", async () => {
    const { id } = await newActiveProject();
    await createMilestone(db, {
      projectId: id,
      title: "Misión",
      doneDefinition: "Abro la pantalla y se ve funcionando",
      criteria: ["Objetivo A listo", "Objetivo B listo"],
    });
    const started = await startSession(db, id);

    const overview = await getOpenSessionOverview(db, id);

    expect(overview?.session.id).toBe(started.id);
    expect(overview?.projectName).toBe("Recetario");
    expect(overview?.missionTitle).toBe("Misión");
    expect(overview?.criteria.map(({ text }) => text)).toEqual(["Objetivo A listo", "Objetivo B listo"]);
  });
});
