import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../db/client";
import { criterion, decision, idea, milestone, project } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { addDecision, answerDecision } from "./decisions";
import { DomainError } from "./errors";
import { discardIdea, listParkedIdeas, parkIdea, postponeIdea, promoteIdea } from "./ideas";
import { createMilestone, cutMilestone, setCriterionDone } from "./milestones";
import { getProjectOverview } from "./overview";
import { activateProject, createProject, parkProject } from "./projects";
import { closeWeeklyReview, getWeeklyReport } from "./reviews";
import { closeSession, openSession } from "./sessions";

let db: Database;
let close: () => void;

beforeEach(() => {
  ({ db, close } = createTestDb());
});

afterEach(() => close());

const NOW = new Date("2026-10-31T15:00:00Z");

const newActiveProject = async (name: string) => {
  const created = await createProject(db, { name, why: "Porque sí" });
  await activateProject(db, created.id);
  return created;
};

const DONE_DEFINITION = "Abro la pantalla y se ve funcionando";
const [A, B, C] = ["Objetivo A listo", "Objetivo B listo", "Objetivo C listo"];

const newMission = (projectId: string, criteria = [A, B, C]) =>
  createMilestone(db, { projectId, title: "Misión", doneDefinition: DONE_DEFINITION, criteria });

const criteriaOf = (milestoneId: string) =>
  db.select().from(criterion).where(eq(criterion.milestoneId, milestoneId));

const firstPendingOf = async (milestoneId: string | null) =>
  milestoneId ? (await criteriaOf(milestoneId)).find(({ done }) => !done)?.id : undefined;

const playSession = async (projectId: string, endedAt = NOW) => {
  const opened = await openSession(db, { projectId }, new Date(endedAt.getTime() - 60_000));
  await closeSession(
    db,
    { sessionId: opened.id, outcome: "Listo", nextCriterionId: await firstPendingOf(opened.milestoneId) },
    endedAt,
  );
};

describe("ideas", () => {
  it("lists parked ideas with their project, soonest review first", async () => {
    const { id } = await newActiveProject("Recetario");
    await parkIdea(db, { text: "Después" }, new Date("2026-11-10T15:00:00Z"));
    await parkIdea(db, { text: "Antes", projectId: id }, new Date("2026-10-30T15:00:00Z"));

    const ideas = await listParkedIdeas(db);
    expect(ideas.map(({ text, projectName }) => [text, projectName])).toEqual([
      ["Antes", "Recetario"],
      ["Después", null],
    ]);
  });

  it("treats an empty project from the form as no project", async () => {
    const created = await parkIdea(db, { text: "Suelta", projectId: "" });
    expect(created.projectId).toBeNull();
  });

  it("postpones a week from today", async () => {
    const created = await parkIdea(db, { text: "Idea" }, new Date("2026-10-01T15:00:00Z"));
    await postponeIdea(db, created.id, NOW);
    const [row] = await db.select().from(idea).where(eq(idea.id, created.id));
    expect(row.reviewAfter?.toISOString()).toBe("2026-11-07T05:00:00.000Z");
  });

  it("discards an idea and takes it out of the list", async () => {
    const created = await parkIdea(db, { text: "Idea" });
    await discardIdea(db, created.id);
    expect(await listParkedIdeas(db)).toEqual([]);
    await expect(discardIdea(db, created.id)).rejects.toThrow("ya no está en la banca");
  });

  it("promotes an idea to an active project when there is a slot", async () => {
    await newActiveProject("Uno");
    const created = await parkIdea(db, { text: "Idea buena" });

    const promoted = await promoteIdea(db, created.id);

    expect(promoted).toMatchObject({ name: "Idea buena", why: "Idea buena", status: "active" });
    const [row] = await db.select().from(idea).where(eq(idea.id, created.id));
    expect(row.status).toBe("promoted");
  });

  it("never promotes an idea without a free slot", async () => {
    await newActiveProject("Uno");
    await newActiveProject("Dos");
    const created = await parkIdea(db, { text: "Idea buena" });

    await expect(promoteIdea(db, created.id)).rejects.toThrow("Ya tienes 2 partidas en curso");

    const [row] = await db.select().from(idea).where(eq(idea.id, created.id));
    expect(row.status).toBe("parked");
    expect(await db.select().from(project)).toHaveLength(2);
  });

  it("keeps the idea parked if a project already has that name", async () => {
    await createProject(db, { name: "Idea buena", why: "Porque sí" });
    const created = await parkIdea(db, { text: "IDEA BUENA" });

    await expect(promoteIdea(db, created.id)).rejects.toThrow("Ya existe un proyecto");

    const [row] = await db.select().from(idea).where(eq(idea.id, created.id));
    expect(row.status).toBe("parked");
  });
});

describe("projects in the bench", () => {
  it("records when a project was parked", async () => {
    const { id } = await newActiveProject("Uno");
    await parkProject(db, id, NOW);
    const [row] = await db.select().from(project).where(eq(project.id, id));
    expect(row.parkedAt).toEqual(NOW);
  });
});

describe("decisions", () => {
  it("answers a decision, which leaves the open list", async () => {
    const { id } = await newActiveProject("Uno");
    const created = await addDecision(db, { projectId: id, question: "¿Precio?" });

    await answerDecision(db, created.id, " 10 soles ", NOW);

    const [row] = await db.select().from(decision).where(eq(decision.id, created.id));
    expect(row).toMatchObject({ status: "decided", answer: "10 soles", decidedAt: NOW });
    expect((await getProjectOverview(db, id))?.openDecisions).toEqual([]);
  });

  it("rejects an empty answer and answering twice", async () => {
    const { id } = await newActiveProject("Uno");
    const created = await addDecision(db, { projectId: id, question: "¿Precio?" });

    await expect(answerDecision(db, created.id, "  ")).rejects.toThrow(DomainError);
    await answerDecision(db, created.id, "Sí");
    await expect(answerDecision(db, created.id, "No")).rejects.toThrow("ya está respondida");
  });
});

describe("cutting a milestone", () => {
  it("counts the closed sessions of the current milestone", async () => {
    const { id } = await newActiveProject("Uno");
    await playSession(id);
    await newMission(id);
    await playSession(id);
    await playSession(id);
    await openSession(db, { projectId: id });

    expect((await getProjectOverview(db, id))?.missionSessions).toBe(2);
  });

  it("closes it as cut and opens a new one with the pending criteria", async () => {
    const { id } = await newActiveProject("Uno");
    const mission = await newMission(id);
    const [first] = await criteriaOf(mission.id);
    await setCriterionDone(db, first.id, true);
    await playSession(id);

    const created = await cutMilestone(db, mission.id, NOW);

    const [old] = await db.select().from(milestone).where(eq(milestone.id, mission.id));
    expect(old).toMatchObject({ status: "cut", closedAt: NOW });
    expect(created).toMatchObject({ status: "open", title: "Misión", doneDefinition: DONE_DEFINITION });
    const moved = await criteriaOf(created.id);
    expect(moved.map(({ text, done }) => [text, done])).toEqual([
      [B, false],
      [C, false],
    ]);
    expect((await getProjectOverview(db, id))?.missionSessions).toBe(0);
  });

  it("works when only one criterion is left", async () => {
    const { id } = await newActiveProject("Uno");
    const mission = await newMission(id, [A, B]);
    const [first] = await criteriaOf(mission.id);
    await setCriterionDone(db, first.id, true);

    const created = await cutMilestone(db, mission.id);
    expect(await criteriaOf(created.id)).toHaveLength(1);
  });

  it("refuses with an open session, nothing pending or an already closed milestone", async () => {
    const { id } = await newActiveProject("Uno");
    const mission = await newMission(id, [A, B]);
    const opened = await openSession(db, { projectId: id });
    await expect(cutMilestone(db, mission.id)).rejects.toThrow("Termina la partida");
    await closeSession(db, {
      sessionId: opened.id,
      outcome: "Listo",
      nextCriterionId: await firstPendingOf(mission.id),
    });

    for (const { id: criterionId } of await criteriaOf(mission.id)) {
      await setCriterionDone(db, criterionId, true);
    }
    await expect(cutMilestone(db, mission.id)).rejects.toThrow("No quedan objetivos");

    await db.update(milestone).set({ status: "cut" }).where(eq(milestone.id, mission.id));
    await expect(cutMilestone(db, mission.id)).rejects.toThrow("ya está cerrada");
    expect(await db.select().from(milestone)).toHaveLength(1);
  });
});

describe("weekly report", () => {
  it("counts sessions and criteria of the last 7 days, per project", async () => {
    const { id } = await newActiveProject("Recetario");
    const mission = await newMission(id);
    const [first, second] = await criteriaOf(mission.id);
    await playSession(id, new Date("2026-10-20T15:00:00Z"));
    await playSession(id, new Date("2026-10-30T15:00:00Z"));
    await setCriterionDone(db, first.id, true, new Date("2026-10-20T15:00:00Z"));
    await setCriterionDone(db, second.id, true, new Date("2026-10-30T15:00:00Z"));

    const report = await getWeeklyReport(db, NOW);

    expect(report.closedSessions).toBe(1);
    expect(report.metCriteria).toEqual([{ projectName: "Recetario", met: 1 }]);
  });

  it("lists active projects that are cold or have no mission", async () => {
    const fresh = await newActiveProject("Al día");
    await newMission(fresh.id);
    await playSession(fresh.id, new Date(Date.now() - 86_400_000));
    await newActiveProject("Sin misión");
    await createProject(db, { name: "En banca", why: "Porque sí" });

    const report = await getWeeklyReport(db);
    expect(report.cooling.map(({ name, hasMission }) => [name, hasMission])).toEqual([["Sin misión", false]]);

    const later = await getWeeklyReport(db, new Date(Date.now() + 8 * 86_400_000));
    expect(later.cooling.map(({ name }) => name).sort()).toEqual(["Al día", "Sin misión"]);
  });

  it("lists only the ideas due for review and whether there is a slot", async () => {
    await newActiveProject("Uno");
    await parkIdea(db, { text: "Vencida" }, new Date("2026-10-20T15:00:00Z"));
    await parkIdea(db, { text: "Futura" }, NOW);

    const report = await getWeeklyReport(db, NOW);
    expect(report.dueIdeas.map(({ text }) => text)).toEqual(["Vencida"]);
    expect(report.hasFreeSlot).toBe(true);

    await newActiveProject("Dos");
    expect((await getWeeklyReport(db, NOW)).hasFreeSlot).toBe(false);
  });

  it("counts open decisions per project", async () => {
    const { id } = await newActiveProject("Recetario");
    await addDecision(db, { projectId: id, question: "¿Una?" });
    const answered = await addDecision(db, { projectId: id, question: "¿Dos?" });
    await addDecision(db, { projectId: id, question: "¿Tres?" });
    await answerDecision(db, answered.id, "Sí");

    const report = await getWeeklyReport(db, NOW);
    expect(report.openDecisions).toEqual([{ projectId: id, projectName: "Recetario", open: 2 }]);
  });

  it("saves the date of the review and returns the latest", async () => {
    expect((await getWeeklyReport(db, NOW)).lastReviewAt).toBeNull();
    await closeWeeklyReview(db, new Date("2026-10-24T15:00:00Z"));
    await closeWeeklyReview(db, NOW);
    expect((await getWeeklyReport(db, NOW)).lastReviewAt).toEqual(NOW);
  });
});
