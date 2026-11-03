import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/db/client";
import { criterion, milestone, project, session } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { DomainError } from "./errors";
import { createMilestone, setCriterionDone, updateMilestone } from "./milestones";
import { coolingPercent, getHomeOverview, getProjectOverview } from "./overview";
import { activateProject, createProject, parkProject } from "./projects";
import {
  closeSession,
  countClosedSessionsThisWeek,
  daysSinceLastSession,
  listSessionLog,
  openSession,
} from "./sessions";

let db: Database;
let close: () => void;

beforeEach(() => {
  ({ db, close } = createTestDb());
});

afterEach(() => close());

const newActiveProject = async (name: string) => {
  const created = await createProject(db, { name, why: "Porque sí" });
  await activateProject(db, created.id);
  return created;
};

const newMilestone = (projectId: string, criteria = ["Objetivo A listo", "Objetivo B listo"]) =>
  createMilestone(db, {
    projectId,
    title: "Misión",
    doneDefinition: "Abro la pantalla y se ve funcionando",
    criteria,
  });

const statusOf = async (projectId: string) => {
  const [row] = await db.select().from(project).where(eq(project.id, projectId));
  return row.status;
};

describe("projects", () => {
  it("creates projects parked", async () => {
    const created = await createProject(db, { name: "Uno", why: "Porque sí" });
    expect(created.status).toBe("parked");
  });

  it("rejects a name that differs only in case", async () => {
    await createProject(db, { name: "Recetario", why: "Porque sí" });
    await expect(createProject(db, { name: "RECETARIO", why: "Otra" })).rejects.toThrow(DomainError);
  });

  it("fails to activate a third project with a clear message", async () => {
    await newActiveProject("Uno");
    await newActiveProject("Dos");
    const third = await createProject(db, { name: "Tres", why: "Porque sí" });

    await expect(activateProject(db, third.id)).rejects.toThrow("Ya tienes 2 partidas en curso");
    expect(await statusOf(third.id)).toBe("parked");
  });

  it("frees a slot when a project is parked", async () => {
    const first = await newActiveProject("Uno");
    await newActiveProject("Dos");
    const third = await createProject(db, { name: "Tres", why: "Porque sí" });

    await parkProject(db, first.id);
    await activateProject(db, third.id);

    expect(await statusOf(first.id)).toBe("parked");
    expect(await statusOf(third.id)).toBe("active");
  });

  it("activating an already active project is a no-op, even with no free slots", async () => {
    const first = await newActiveProject("Uno");
    await newActiveProject("Dos");
    await expect(activateProject(db, first.id)).resolves.toBeUndefined();
  });

  it("does not reactivate a finished project", async () => {
    const created = await createProject(db, { name: "Uno", why: "Porque sí" });
    await db.update(project).set({ status: "done" }).where(eq(project.id, created.id));
    await expect(activateProject(db, created.id)).rejects.toThrow(DomainError);
  });

  it("does not park a project with an open session", async () => {
    const created = await newActiveProject("Uno");
    await openSession(db, { projectId: created.id });
    await expect(parkProject(db, created.id)).rejects.toThrow("Termina la partida abierta");
  });
});

describe("milestones", () => {
  it("allows only one open milestone per project", async () => {
    const created = await newActiveProject("Uno");
    await newMilestone(created.id);
    await expect(newMilestone(created.id)).rejects.toThrow("ya tiene una misión abierta");
  });

  it("does not limit open milestones across projects", async () => {
    await newMilestone((await newActiveProject("Uno")).id);
    await expect(newMilestone((await newActiveProject("Dos")).id)).resolves.toBeDefined();
  });

  it.each([
    ["one", ["A"]],
    ["six", ["A", "B", "C", "D", "E", "F"]],
    ["blank ones that leave one", ["A", "   ", ""]],
  ])("rejects %s criteria", async (_label, criteria) => {
    const created = await newActiveProject("Uno");
    await expect(newMilestone(created.id, criteria)).rejects.toThrow("de 2 a 5 objetivos");
  });

  it("accepts five criteria and stores them", async () => {
    const created = await newActiveProject("Uno");
    const texts = ["A", "B", "C", "D", "E"].map((letter) => `Objetivo ${letter} listo`);
    const mission = await newMilestone(created.id, texts);
    const rows = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    expect(rows.map(({ text }) => text)).toEqual(texts);
  });

  it("rejects a vague done definition", async () => {
    const created = await newActiveProject("Uno");
    await expect(
      createMilestone(db, {
        projectId: created.id,
        title: "El canvas",
        doneDefinition: "se pueda armar bien el canvas",
        criteria: ["Objetivo A listo", "Objetivo B listo"],
      }),
    ).rejects.toThrow("al menos 7 palabras");
  });

  it("does not count punctuation as words", async () => {
    const created = await newActiveProject("Uno");
    await expect(
      createMilestone(db, {
        projectId: created.id,
        title: "Misión",
        doneDefinition: "uno dos tres - - - - - -",
        criteria: ["Objetivo A listo", "Objetivo B listo"],
      }),
    ).rejects.toThrow("al menos 7 palabras");
    await expect(newMilestone(created.id, ["Objetivo - -", "Objetivo B listo"])).rejects.toThrow(
      "al menos 3 palabras",
    );
  });

  it("rejects a criterion of two words", async () => {
    const created = await newActiveProject("Uno");
    await expect(newMilestone(created.id, ["Canvas simple", "Objetivo B listo"])).rejects.toThrow(
      "al menos 3 palabras",
    );
    expect(await db.select().from(milestone)).toHaveLength(0);
  });

  it("marks and unmarks a criterion", async () => {
    const created = await newActiveProject("Uno");
    const mission = await newMilestone(created.id);
    const [first] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));

    await setCriterionDone(db, first.id, true);
    let [row] = await db.select().from(criterion).where(eq(criterion.id, first.id));
    expect(row.done).toBe(true);
    expect(row.doneAt).toBeInstanceOf(Date);

    await setCriterionDone(db, first.id, false);
    [row] = await db.select().from(criterion).where(eq(criterion.id, first.id));
    expect(row.done).toBe(false);
    expect(row.doneAt).toBeNull();
  });

  describe("editing", () => {
    const setUpMission = async () => {
      const created = await newActiveProject("Uno");
      const mission = await newMilestone(created.id, ["Objetivo A listo", "Objetivo B listo", "Objetivo C listo"]);
      const criteria = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
      return { created, mission, criteria };
    };
    const VALID = { title: "Nuevo título", doneDefinition: "Abro la pantalla y se ve funcionando" };

    it("updates the texts, adds and removes pending criteria, and leaves met ones alone", async () => {
      const { mission, criteria } = await setUpMission();
      const [met, kept, removed] = criteria;
      await setCriterionDone(db, met.id, true);

      await updateMilestone(db, {
        milestoneId: mission.id,
        ...VALID,
        pendingCriteria: [
          { id: kept.id, text: "Objetivo B corregido ya" },
          { text: "Objetivo nuevo de prueba" },
        ],
      });

      const [row] = await db.select().from(milestone).where(eq(milestone.id, mission.id));
      expect(row).toMatchObject(VALID);
      const rows = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
      expect(rows.map(({ text, done }) => [text, done]).sort()).toEqual([
        ["Objetivo A listo", true],
        ["Objetivo B corregido ya", false],
        ["Objetivo nuevo de prueba", false],
      ]);
      expect(rows.some(({ id }) => id === removed.id)).toBe(false);
    });

    it("applies the same validations", async () => {
      const { mission, criteria } = await setUpMission();
      const pendingCriteria = criteria.map(({ id, text }) => ({ id, text }));

      await expect(
        updateMilestone(db, { milestoneId: mission.id, ...VALID, doneDefinition: "se pueda armar", pendingCriteria }),
      ).rejects.toThrow("al menos 7 palabras");
      await expect(
        updateMilestone(db, {
          milestoneId: mission.id,
          ...VALID,
          pendingCriteria: [{ id: criteria[0].id, text: "Canvas simple" }, pendingCriteria[1]],
        }),
      ).rejects.toThrow("al menos 3 palabras");
      await expect(
        updateMilestone(db, { milestoneId: mission.id, ...VALID, pendingCriteria: [pendingCriteria[0]] }),
      ).rejects.toThrow("de 2 a 5 objetivos");
    });

    it("counts met criteria towards the limits", async () => {
      const { mission, criteria } = await setUpMission();
      await setCriterionDone(db, criteria[0].id, true);
      const extra = ["D", "E", "F", "G"].map((letter) => ({ text: `Objetivo ${letter} listo` }));

      await expect(
        updateMilestone(db, { milestoneId: mission.id, ...VALID, pendingCriteria: [...extra, { text: "Otro objetivo más" }] }),
      ).rejects.toThrow("de 2 a 5 objetivos");
      await expect(
        updateMilestone(db, { milestoneId: mission.id, ...VALID, pendingCriteria: [{ text: "Solo este objetivo" }] }),
      ).resolves.toBeUndefined();
    });

    it("refuses while a session is open", async () => {
      const { created, mission, criteria } = await setUpMission();
      await openSession(db, { projectId: created.id });
      await expect(
        updateMilestone(db, {
          milestoneId: mission.id,
          ...VALID,
          pendingCriteria: criteria.map(({ id, text }) => ({ id, text })),
        }),
      ).rejects.toThrow("Termina la partida");
    });

    it("refuses to touch met or foreign criteria, or a closed mission", async () => {
      const { mission, criteria } = await setUpMission();
      await setCriterionDone(db, criteria[0].id, true);
      await expect(
        updateMilestone(db, {
          milestoneId: mission.id,
          ...VALID,
          pendingCriteria: [
            { id: criteria[0].id, text: "Objetivo A cambiado ya" },
            { id: criteria[1].id, text: criteria[1].text },
          ],
        }),
      ).rejects.toThrow("Solo se pueden editar");

      await db.update(milestone).set({ status: "cut" }).where(eq(milestone.id, mission.id));
      await expect(
        updateMilestone(db, {
          milestoneId: mission.id,
          ...VALID,
          pendingCriteria: [{ text: "Objetivo uno nuevo" }, { text: "Objetivo dos nuevo" }],
        }),
      ).rejects.toThrow("ya está cerrada");
    });

    it("can remove a criterion that an old session points to", async () => {
      const { created, mission, criteria } = await setUpMission();
      const opened = await openSession(db, { projectId: created.id });
      await closeSession(db, { sessionId: opened.id, outcome: "Listo", nextCriterionId: criteria[2].id });

      await updateMilestone(db, {
        milestoneId: mission.id,
        ...VALID,
        pendingCriteria: criteria.slice(0, 2).map(({ id, text }) => ({ id, text })),
      });

      const [row] = await db.select().from(session).where(eq(session.id, opened.id));
      expect(row).toMatchObject({ nextCriterionId: null, nextStep: "Objetivo C listo" });
    });
  });

  it("does not change criteria of a closed milestone", async () => {
    const created = await newActiveProject("Uno");
    const mission = await newMilestone(created.id);
    const [first] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    await db.update(milestone).set({ status: "cut" }).where(eq(milestone.id, mission.id));

    await expect(setCriterionDone(db, first.id, true)).rejects.toThrow("ya está cerrada");
  });
});

describe("sessions", () => {
  it("allows one open session in the whole system", async () => {
    const first = await newActiveProject("Uno");
    const second = await newActiveProject("Dos");
    await openSession(db, { projectId: first.id });
    await expect(openSession(db, { projectId: second.id })).rejects.toThrow("partida abierta en Uno");
  });

  it("allows a new session once the previous one is closed", async () => {
    const created = await newActiveProject("Uno");
    const first = await openSession(db, { projectId: created.id });
    await closeSession(db, { sessionId: first.id, outcome: "Listo" });
    await expect(openSession(db, { projectId: created.id })).resolves.toBeDefined();
  });

  it("opens only one session when two requests race", async () => {
    const created = await newActiveProject("Uno");
    await Promise.allSettled([
      openSession(db, { projectId: created.id }),
      openSession(db, { projectId: created.id }),
      openSession(db, { projectId: created.id }),
    ]);
    expect(await db.select().from(session)).toHaveLength(1);
  });

  it("activates only up to the limit when requests race", async () => {
    const candidates = await Promise.all(
      ["Uno", "Dos", "Tres", "Cuatro"].map((name) => createProject(db, { name, why: "Porque sí" })),
    );
    await Promise.allSettled(candidates.map(({ id }) => activateProject(db, id)));
    const active = await db.select().from(project).where(eq(project.status, "active"));
    expect(active.length).toBeLessThanOrEqual(2);
  });

  it("does not open a session on a parked project", async () => {
    const created = await createProject(db, { name: "Uno", why: "Porque sí" });
    await expect(openSession(db, { projectId: created.id })).rejects.toThrow("proyecto activo");
  });

  it("links the session to the open milestone", async () => {
    const created = await newActiveProject("Uno");
    const mission = await newMilestone(created.id);
    const opened = await openSession(db, { projectId: created.id });
    expect(opened.milestoneId).toBe(mission.id);
    expect(opened.confirmed).toBe(false);
    expect(opened.source).toBe("manual");
  });

  it("closing saves the result, confirms it and updates last_session_at", async () => {
    const created = await newActiveProject("Uno");
    const opened = await openSession(db, { projectId: created.id });
    const now = new Date("2026-10-30T15:00:00Z");

    await closeSession(db, { sessionId: opened.id, outcome: " Listo ", blocker: "  " }, now);

    const [row] = await db.select().from(session).where(eq(session.id, opened.id));
    expect(row).toMatchObject({ outcome: "Listo", blocker: null, confirmed: true, endedAt: now });
    const [owner] = await db.select().from(project).where(eq(project.id, created.id));
    expect(owner.lastSessionAt).toEqual(now);
  });

  it("requires an outcome and does not close twice", async () => {
    const created = await newActiveProject("Uno");
    const opened = await openSession(db, { projectId: created.id });

    await expect(closeSession(db, { sessionId: opened.id, outcome: "  " })).rejects.toThrow("qué quedó");
    await closeSession(db, { sessionId: opened.id, outcome: "Listo" });
    await expect(closeSession(db, { sessionId: opened.id, outcome: "Otra vez" })).rejects.toThrow("ya está terminada");
  });

  it("keeps the milestone open while criteria are pending", async () => {
    const created = await newActiveProject("Uno");
    const mission = await newMilestone(created.id);
    const [first, second] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    const opened = await openSession(db, { projectId: created.id });

    await closeSession(db, {
      sessionId: opened.id,
      outcome: "Listo",
      metCriterionIds: [first.id],
      nextCriterionId: second.id,
    });

    const [row] = await db.select().from(milestone).where(eq(milestone.id, mission.id));
    expect(row.status).toBe("open");
  });

  it("finishes the milestone when closing with every criterion met, freeing the next one", async () => {
    const created = await newActiveProject("Uno");
    const mission = await newMilestone(created.id);
    const criteria = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    const opened = await openSession(db, { projectId: created.id });

    await closeSession(db, {
      sessionId: opened.id,
      outcome: "Listo",
      metCriterionIds: criteria.map(({ id }) => id),
    });

    const [row] = await db.select().from(milestone).where(eq(milestone.id, mission.id));
    expect(row.status).toBe("done");
    expect(row.closedAt).toBeInstanceOf(Date);
    await expect(newMilestone(created.id)).resolves.toBeDefined();
  });

  it("ignores criteria from another milestone when closing", async () => {
    const first = await newActiveProject("Uno");
    const other = await newActiveProject("Dos");
    const ownMission = await newMilestone(first.id);
    const otherMission = await newMilestone(other.id);
    const [own] = await db.select().from(criterion).where(eq(criterion.milestoneId, ownMission.id));
    const [foreign] = await db.select().from(criterion).where(eq(criterion.milestoneId, otherMission.id));
    const opened = await openSession(db, { projectId: first.id });

    await closeSession(db, {
      sessionId: opened.id,
      outcome: "Listo",
      metCriterionIds: [foreign.id],
      nextCriterionId: own.id,
    });

    const [row] = await db.select().from(criterion).where(eq(criterion.id, foreign.id));
    expect(row.done).toBe(false);
  });

  describe("next step", () => {
    const setUpMission = async () => {
      const created = await newActiveProject("Uno");
      const mission = await newMilestone(created.id);
      const [first, second] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
      const opened = await openSession(db, { projectId: created.id });
      return { created, mission, first, second, opened };
    };

    const closedSession = async (id: string) => (await db.select().from(session).where(eq(session.id, id)))[0];

    it("saves the chosen objective as the next step", async () => {
      const { first, second, opened } = await setUpMission();

      await closeSession(db, {
        sessionId: opened.id,
        outcome: "Listo",
        metCriterionIds: [first.id],
        nextCriterionId: second.id,
      });

      expect(await closedSession(opened.id)).toMatchObject({
        nextCriterionId: second.id,
        nextStep: "Objetivo B listo",
      });
    });

    it("adds the detail after the objective", async () => {
      const { first, opened } = await setUpMission();

      await closeSession(db, {
        sessionId: opened.id,
        outcome: "Listo",
        nextCriterionId: first.id,
        nextStepDetail: " empezar por el botón ",
      });

      expect((await closedSession(opened.id)).nextStep).toBe("Objetivo A listo — empezar por el botón");
    });

    it("requires choosing one while objectives are pending, and saves nothing otherwise", async () => {
      const { first, opened } = await setUpMission();

      await expect(closeSession(db, { sessionId: opened.id, outcome: "Listo" })).rejects.toThrow(
        "Elige el siguiente movimiento",
      );
      await expect(
        closeSession(db, { sessionId: opened.id, outcome: "Listo", metCriterionIds: [first.id] }),
      ).rejects.toThrow("Elige el siguiente movimiento");

      const row = await closedSession(opened.id);
      expect(row.endedAt).toBeNull();
      const [untouched] = await db.select().from(criterion).where(eq(criterion.id, first.id));
      expect(untouched.done).toBe(false);
    });

    it("rejects an objective that is being met in this same closing", async () => {
      const { first, opened } = await setUpMission();
      await expect(
        closeSession(db, {
          sessionId: opened.id,
          outcome: "Listo",
          metCriterionIds: [first.id],
          nextCriterionId: first.id,
        }),
      ).rejects.toThrow("objetivo pendiente");
    });

    it("rejects an objective from another mission", async () => {
      const { opened } = await setUpMission();
      const other = await newActiveProject("Dos");
      const otherMission = await newMilestone(other.id);
      const [foreign] = await db.select().from(criterion).where(eq(criterion.milestoneId, otherMission.id));

      await expect(
        closeSession(db, { sessionId: opened.id, outcome: "Listo", nextCriterionId: foreign.id }),
      ).rejects.toThrow("objetivo pendiente");
    });

    it("asks for the next mission when nothing is left", async () => {
      const { first, second, mission, opened } = await setUpMission();

      await closeSession(db, { sessionId: opened.id, outcome: "Listo", metCriterionIds: [first.id, second.id] });

      expect(await closedSession(opened.id)).toMatchObject({
        nextCriterionId: null,
        nextStep: "Definir la siguiente misión",
      });
      const [row] = await db.select().from(milestone).where(eq(milestone.id, mission.id));
      expect(row.status).toBe("done");
    });

    it("asks for the next mission when the session has none", async () => {
      const created = await newActiveProject("Uno");
      const opened = await openSession(db, { projectId: created.id });
      await closeSession(db, { sessionId: opened.id, outcome: "Listo" });
      expect((await closedSession(opened.id)).nextStep).toBe("Definir la siguiente misión");
    });
  });

  it("lists the log newest first, without open sessions", async () => {
    const created = await newActiveProject("Uno");
    const first = await openSession(db, { projectId: created.id });
    await closeSession(db, { sessionId: first.id, outcome: "Antes" }, new Date("2026-10-24T15:00:00Z"));
    const second = await openSession(db, { projectId: created.id });
    await closeSession(db, { sessionId: second.id, outcome: "Después" }, new Date("2026-10-28T15:00:00Z"));
    await openSession(db, { projectId: created.id });

    const log = await listSessionLog(db, created.id);
    expect(log.map(({ outcome }) => outcome)).toEqual(["Después", "Antes"]);
  });

  it("counts only sessions closed this week", async () => {
    const created = await newActiveProject("Uno");
    const old = await openSession(db, { projectId: created.id });
    await closeSession(db, { sessionId: old.id, outcome: "Pasada" }, new Date("2026-10-25T15:00:00Z"));
    const recent = await openSession(db, { projectId: created.id });
    await closeSession(db, { sessionId: recent.id, outcome: "Esta" }, new Date("2026-10-26T15:00:00Z"));
    await openSession(db, { projectId: created.id });

    expect(await countClosedSessionsThisWeek(db, new Date("2026-10-30T15:00:00Z"))).toBe(1);
  });

  it("counts days from the last session, or from creation if there are none", () => {
    const now = new Date("2026-10-30T15:00:00Z");
    const createdAt = new Date("2026-10-01T15:00:00Z");
    expect(daysSinceLastSession({ lastSessionAt: new Date("2026-10-28T15:00:00Z"), createdAt }, now)).toBe(2);
    expect(daysSinceLastSession({ lastSessionAt: null, createdAt }, now)).toBe(29);
  });
});

describe("overview", () => {
  it("empties the cooling bar from day 0 to day 14", () => {
    expect(coolingPercent(0)).toBe(100);
    expect(coolingPercent(7)).toBe(50);
    expect(coolingPercent(14)).toBe(0);
    expect(coolingPercent(30)).toBe(0);
  });

  it("builds the home data", async () => {
    const withMission = await newActiveProject("Uno");
    const mission = await newMilestone(withMission.id);
    const [first] = await db.select().from(criterion).where(eq(criterion.milestoneId, mission.id));
    await newActiveProject("Dos");
    await createProject(db, { name: "Tres", why: "Porque sí" });
    const opened = await openSession(db, { projectId: withMission.id });
    await closeSession(db, { sessionId: opened.id, outcome: "Listo", nextCriterionId: first.id });

    const home = await getHomeOverview(db);

    expect(home.closedThisWeek).toBe(1);
    expect(home.parked.map(({ name }) => name)).toEqual(["Tres"]);
    const uno = home.active.find(({ name }) => name === "Uno");
    expect(uno?.mission?.criteria.map(({ text }) => text)).toEqual(["Objetivo A listo", "Objetivo B listo"]);
    expect(uno?.nextStep).toBe("Objetivo A listo");
    expect(home.active.find(({ name }) => name === "Dos")?.mission).toBeNull();
  });

  it("returns null for a project that does not exist", async () => {
    expect(await getProjectOverview(db, "no-existe")).toBeNull();
  });
});
