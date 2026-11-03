import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../src/db/client";
import { criterion, decision, idea, session } from "../src/db/schema";
import { createTestDb } from "../src/db/test-db";
import { startSession } from "../src/server/brief";
import { DomainError } from "../src/server/errors";
import { createMilestone } from "../src/server/milestones";
import { getOpenSessionOverview } from "../src/server/overview";
import { activateProject, createProject } from "../src/server/projects";
import { closeSession } from "../src/server/sessions";
import {
  addDecisionHandler,
  getBriefHandler,
  logProgressHandler,
  markCriterionHandler,
  parkIdeaHandler,
} from "./tools";

let db: Database;
let close: () => void;

beforeEach(() => {
  ({ db, close } = createTestDb());
});

afterEach(() => close());

const setUp = async (name = "Recetario") => {
  const created = await createProject(db, { name, why: "Porque sí" });
  await activateProject(db, created.id);
  const mission = await createMilestone(db, {
    projectId: created.id,
    title: "Misión",
    doneDefinition: "Abro la pantalla y se ve funcionando",
    criteria: ["Objetivo A listo", "Objetivo B listo"],
  });
  const criteria = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
  return { project: created, mission, criteria };
};

const openSessionOf = async (projectId: string) => {
  const [open] = await db.select().from(session).where(eq(session.projectId, projectId));
  return open;
};

describe("get_brief", () => {
  it("opens a claude_code session, saves the snapshot and returns the ids", async () => {
    const { project, criteria } = await setUp();

    const text = await getBriefHandler(db, { project: "Recetario" });

    expect(text).toContain("Misión: Misión");
    expect(text).toContain(`- ${criteria[0].id}: Objetivo A listo`);
    expect(text).toContain(`- ${criteria[1].id}: Objetivo B listo`);
    const opened = await openSessionOf(project.id);
    expect(opened.source).toBe("claude_code");
    expect(opened.confirmed).toBe(false);
    expect(opened.briefSnapshot).toContain("Proyecto: Recetario");
    expect(opened.briefSnapshot).not.toContain(criteria[0].id);
    expect(opened.briefReadAt).toBeInstanceOf(Date);
  });

  it("finds the project by id and by name in any case", async () => {
    const { project } = await setUp("Blog personal");
    await expect(getBriefHandler(db, { project: project.id })).resolves.toContain("Proyecto: Blog personal");
    await expect(getBriefHandler(db, { project: "blog PERSONAL" })).resolves.toContain(
      "Proyecto: Blog personal",
    );
  });

  it("reuses the session opened from the app and records the read", async () => {
    const { project } = await setUp();
    const manual = await startSession(db, project.id);
    expect(manual.briefReadAt).toBeNull();

    await getBriefHandler(db, { project: "recetario" });

    const rows = await db.select().from(session);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(manual.id);
    expect(rows[0].source).toBe("manual");
    expect(rows[0].briefReadAt).toBeInstanceOf(Date);
  });

  it("fails for an unknown project, a parked one or while another has a session", async () => {
    await expect(getBriefHandler(db, { project: "nada" })).rejects.toThrow('No encontré el proyecto "nada"');

    await createProject(db, { name: "En banca", why: "Porque sí" });
    await expect(getBriefHandler(db, { project: "En banca" })).rejects.toThrow("proyecto activo");

    await setUp("Uno");
    await setUp("Dos");
    await getBriefHandler(db, { project: "Uno" });
    await expect(getBriefHandler(db, { project: "Dos" })).rejects.toThrow("partida abierta en Uno");
  });
});

describe("log_progress", () => {
  it("saves the summary as an unconfirmed draft and marks the criteria", async () => {
    const { project, criteria } = await setUp();
    await getBriefHandler(db, { project: "Recetario" });

    await logProgressHandler(db, {
      project: "Recetario",
      summary: " Quedó el login ",
      criteria_met: [criteria[0].id],
      next_step: "Probar en staging",
    });

    const draft = await openSessionOf(project.id);
    expect(draft).toMatchObject({
      outcome: "Quedó el login",
      nextStep: "Probar en staging",
      confirmed: false,
      endedAt: null,
      source: "claude_code",
    });
    const [met] = await db.select().from(criterion).where(eq(criterion.id, criteria[0].id));
    expect(met.done).toBe(true);
  });

  it("does not touch the project's last session until the user confirms", async () => {
    const { project, criteria } = await setUp();
    await getBriefHandler(db, { project: "Recetario" });
    await logProgressHandler(db, { project: "Recetario", summary: "Algo" });

    const overview = await getOpenSessionOverview(db, project.id);
    expect(overview?.session.confirmed).toBe(false);

    await closeSession(db, {
      sessionId: overview!.session.id,
      outcome: "Corregido",
      nextCriterionId: criteria[0].id,
    });
    const [closed] = await db.select().from(session).where(eq(session.id, overview!.session.id));
    expect(closed).toMatchObject({ outcome: "Corregido", confirmed: true });
  });

  it("overwrites the previous draft and keeps the next step if not given", async () => {
    const { project } = await setUp();
    await getBriefHandler(db, { project: "Recetario" });
    await logProgressHandler(db, { project: "Recetario", summary: "Primero", next_step: "Seguir" });
    await logProgressHandler(db, { project: "Recetario", summary: "Segundo" });

    expect(await openSessionOf(project.id)).toMatchObject({ outcome: "Segundo", nextStep: "Seguir" });
  });

  it("marks a manual session as written by Claude Code", async () => {
    const { project } = await setUp();
    await startSession(db, project.id);
    await logProgressHandler(db, { project: "Recetario", summary: "Algo" });
    expect((await openSessionOf(project.id)).source).toBe("claude_code");
  });

  it("fails without an open session or with an empty summary", async () => {
    await setUp();
    await expect(logProgressHandler(db, { project: "Recetario", summary: "Algo" })).rejects.toThrow("get_brief");

    await getBriefHandler(db, { project: "Recetario" });
    await expect(logProgressHandler(db, { project: "Recetario", summary: "  " })).rejects.toThrow(DomainError);
  });

  it("rejects criteria from another milestone and saves nothing", async () => {
    const { project, criteria } = await setUp("Uno");
    const other = await setUp("Dos");
    await getBriefHandler(db, { project: "Uno" });

    await expect(
      logProgressHandler(db, {
        project: "Uno",
        summary: "Algo",
        criteria_met: [criteria[0].id, other.criteria[0].id],
      }),
    ).rejects.toThrow(other.criteria[0].id);

    expect((await openSessionOf(project.id)).outcome).toBeNull();
    const [untouched] = await db.select().from(criterion).where(eq(criterion.id, criteria[0].id));
    expect(untouched.done).toBe(false);
  });
});

describe("log_progress next_criterion_id", () => {
  it("saves the objective and keeps next_step as its detail until closing", async () => {
    const { project, criteria } = await setUp();
    await getBriefHandler(db, { project: "Recetario" });

    await logProgressHandler(db, {
      project: "Recetario",
      summary: "Algo",
      criteria_met: [criteria[0].id],
      next_criterion_id: criteria[1].id,
      next_step: "empezar por el botón",
    });

    const draft = await openSessionOf(project.id);
    expect(draft).toMatchObject({ nextCriterionId: criteria[1].id, nextStep: "empezar por el botón" });

    await closeSession(db, {
      sessionId: draft.id,
      outcome: "Algo",
      metCriterionIds: [criteria[0].id],
      nextCriterionId: draft.nextCriterionId!,
      nextStepDetail: draft.nextStep!,
    });
    expect((await openSessionOf(project.id)).nextStep).toBe("Objetivo B listo — empezar por el botón");
  });

  it.each([
    ["unknown", () => "nada"],
    ["from another mission", (other: string) => other],
  ])("rejects an %s objective and saves nothing", async (_label, pick) => {
    const { project, criteria } = await setUp("Uno");
    const other = await setUp("Dos");
    await getBriefHandler(db, { project: "Uno" });

    await expect(
      logProgressHandler(db, {
        project: "Uno",
        summary: "Algo",
        criteria_met: [criteria[0].id],
        next_criterion_id: pick(other.criteria[0].id),
      }),
    ).rejects.toThrow("objetivo pendiente");

    expect((await openSessionOf(project.id)).outcome).toBeNull();
    const [untouched] = await db.select().from(criterion).where(eq(criterion.id, criteria[0].id));
    expect(untouched.done).toBe(false);
  });

  it("rejects an objective met in the same call", async () => {
    const { criteria } = await setUp();
    await getBriefHandler(db, { project: "Recetario" });

    await expect(
      logProgressHandler(db, {
        project: "Recetario",
        summary: "Algo",
        criteria_met: [criteria[0].id],
        next_criterion_id: criteria[0].id,
      }),
    ).rejects.toThrow("objetivo pendiente");
  });
});

describe("closing a session with Claude Code's criteria", () => {
  it("undoes what the user unchecks and keeps what was met before", async () => {
    const { project, criteria } = await setUp();
    await markCriterionHandler(db, { criterion_id: criteria[0].id });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await getBriefHandler(db, { project: "Recetario" });
    await logProgressHandler(db, { project: "Recetario", summary: "Algo", criteria_met: [criteria[1].id] });
    const open = await openSessionOf(project.id);

    await closeSession(db, {
      sessionId: open.id,
      outcome: "Algo",
      metCriterionIds: [],
      nextCriterionId: criteria[1].id,
    });

    const rows = await db.select().from(criterion).where(eq(criterion.milestoneId, criteria[0].milestoneId));
    expect(rows.find(({ id }) => id === criteria[0].id)?.done).toBe(true);
    expect(rows.find(({ id }) => id === criteria[1].id)?.done).toBe(false);
  });
});

describe("mark_criterion", () => {
  it("marks the criterion", async () => {
    const { criteria } = await setUp();
    await markCriterionHandler(db, { criterion_id: criteria[0].id });
    const [row] = await db.select().from(criterion).where(eq(criterion.id, criteria[0].id));
    expect(row.done).toBe(true);
  });

  it("fails for an unknown criterion", async () => {
    await expect(markCriterionHandler(db, { criterion_id: "nada" })).rejects.toThrow("no existe");
  });
});

describe("park_idea", () => {
  it("saves the idea linked to the project with a review date", async () => {
    const { project } = await setUp();
    await parkIdeaHandler(db, { text: " Otra idea ", project: "recetario" });

    const [row] = await db.select().from(idea);
    expect(row).toMatchObject({ text: "Otra idea", projectId: project.id, status: "parked" });
    expect(row.reviewAfter).toBeInstanceOf(Date);
  });

  it("works without a project and rejects empty text or an unknown project", async () => {
    await parkIdeaHandler(db, { text: "Suelta" });
    expect((await db.select().from(idea))[0].projectId).toBeNull();

    await expect(parkIdeaHandler(db, { text: "  " })).rejects.toThrow(DomainError);
    await expect(parkIdeaHandler(db, { text: "Algo", project: "nada" })).rejects.toThrow("No encontré");
  });
});

describe("add_decision", () => {
  it("registers an open decision", async () => {
    const { project } = await setUp();
    await addDecisionHandler(db, { project: "Recetario", question: " ¿Precio? " });

    const [row] = await db.select().from(decision);
    expect(row).toMatchObject({ projectId: project.id, question: "¿Precio?", status: "open" });
  });

  it("rejects an empty question", async () => {
    await setUp();
    await expect(addDecisionHandler(db, { project: "Recetario", question: "" })).rejects.toThrow(DomainError);
  });
});
