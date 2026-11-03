import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { criterion, milestone, project, session } from "../db/schema";
import { DomainError } from "./errors";

export const MIN_CRITERIA = 2;
export const MAX_CRITERIA = 5;

// docs/fases/ajuste-1.md asks for 6, but also to reject "se pueda armar bien el
// canvas", which has exactly 6.
const MIN_DONE_DEFINITION_WORDS = 7;
const MIN_CRITERION_WORDS = 3;

const countWords = (text: string) => text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

function validateMissionText(input: { title: string; doneDefinition: string; criteria: string[] }, total: number) {
  if (!input.title) throw new DomainError("La misión necesita un título.");
  if (countWords(input.doneDefinition) < MIN_DONE_DEFINITION_WORDS) {
    throw new DomainError(
      `"Hecho cuando" necesita al menos ${MIN_DONE_DEFINITION_WORDS} palabras: describe qué haces y qué ves al comprobarlo.`,
    );
  }
  if (total < MIN_CRITERIA || total > MAX_CRITERIA) {
    throw new DomainError(`La misión necesita de ${MIN_CRITERIA} a ${MAX_CRITERIA} objetivos.`);
  }
  if (input.criteria.some((text) => countWords(text) < MIN_CRITERION_WORDS)) {
    throw new DomainError(`Cada objetivo necesita al menos ${MIN_CRITERION_WORDS} palabras.`);
  }
}

export async function createMilestone(
  db: Database,
  input: { projectId: string; title: string; doneDefinition: string; criteria: string[] },
) {
  const title = input.title.trim();
  const doneDefinition = input.doneDefinition.trim();
  const criteria = input.criteria.map((text) => text.trim()).filter(Boolean);

  validateMissionText({ title, doneDefinition, criteria }, criteria.length);

  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(project).where(eq(project.id, input.projectId));
    if (!target) throw new DomainError("Ese proyecto no existe.");
    if (target.status === "done") throw new DomainError("Ese proyecto ya está terminado.");

    const [open] = await tx
      .select({ id: milestone.id })
      .from(milestone)
      .where(and(eq(milestone.projectId, input.projectId), eq(milestone.status, "open")));
    if (open) throw new DomainError("Este proyecto ya tiene una misión abierta.");

    const [created] = await tx
      .insert(milestone)
      .values({ projectId: input.projectId, title, doneDefinition })
      .returning();
    await tx.insert(criterion).values(criteria.map((text) => ({ milestoneId: created.id, text })));
    return created;
  });
}

// Edits the open milestone and its pending criteria; met ones are left as they
// are. A pending criterion left out of the list, or left blank, is removed.
export async function updateMilestone(
  db: Database,
  input: {
    milestoneId: string;
    title: string;
    doneDefinition: string;
    pendingCriteria: { id?: string; text: string }[];
  },
) {
  const title = input.title.trim();
  const doneDefinition = input.doneDefinition.trim();
  const pendingCriteria = input.pendingCriteria
    .map(({ id, text }) => ({ id: id || undefined, text: text.trim() }))
    .filter(({ text }) => text);

  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(milestone).where(eq(milestone.id, input.milestoneId));
    if (!target) throw new DomainError("Esa misión no existe.");
    if (target.status !== "open") throw new DomainError("Esa misión ya está cerrada.");

    const [open] = await tx
      .select({ id: session.id })
      .from(session)
      .where(and(eq(session.projectId, target.projectId), isNull(session.endedAt)));
    if (open) throw new DomainError("Termina la partida abierta antes de editar la misión.");

    const existing = await tx.select().from(criterion).where(eq(criterion.milestoneId, target.id));
    const metCount = existing.filter(({ done }) => done).length;
    const currentPendingIds = existing.filter(({ done }) => !done).map(({ id }) => id);

    validateMissionText(
      { title, doneDefinition, criteria: pendingCriteria.map(({ text }) => text) },
      metCount + pendingCriteria.length,
    );

    const keptIds = pendingCriteria.flatMap(({ id }) => (id ? [id] : []));
    if (keptIds.some((id) => !currentPendingIds.includes(id))) {
      throw new DomainError("Solo se pueden editar los objetivos pendientes de esta misión.");
    }

    await tx.update(milestone).set({ title, doneDefinition }).where(eq(milestone.id, target.id));

    const removedIds = currentPendingIds.filter((id) => !keptIds.includes(id));
    if (removedIds.length > 0) {
      // Past sessions keep their next_step text; only the link goes away.
      await tx.update(session).set({ nextCriterionId: null }).where(inArray(session.nextCriterionId, removedIds));
      await tx.delete(criterion).where(inArray(criterion.id, removedIds));
    }

    for (const { id, text } of pendingCriteria) {
      if (id) await tx.update(criterion).set({ text }).where(eq(criterion.id, id));
      else await tx.insert(criterion).values({ milestoneId: target.id, text });
    }
  });
}

// Closes the milestone as cut and opens a new one with what was still pending.
export async function cutMilestone(db: Database, milestoneId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(milestone).where(eq(milestone.id, milestoneId));
    if (!target) throw new DomainError("Esa misión no existe.");
    if (target.status !== "open") throw new DomainError("Esa misión ya está cerrada.");

    const [open] = await tx
      .select({ id: session.id })
      .from(session)
      .where(and(eq(session.projectId, target.projectId), isNull(session.endedAt)));
    if (open) throw new DomainError("Termina la partida abierta antes de recortar la misión.");

    const pending = await tx
      .select({ text: criterion.text })
      .from(criterion)
      .where(and(eq(criterion.milestoneId, milestoneId), eq(criterion.done, false)))
      .orderBy(sql`rowid`);
    if (pending.length === 0) {
      throw new DomainError("No quedan objetivos pendientes: la misión se cierra al terminar una partida.");
    }

    await tx.update(milestone).set({ status: "cut", closedAt: now }).where(eq(milestone.id, milestoneId));
    const [created] = await tx
      .insert(milestone)
      .values({
        projectId: target.projectId,
        title: target.title,
        doneDefinition: target.doneDefinition,
        openedAt: now,
      })
      .returning();
    await tx.insert(criterion).values(pending.map(({ text }) => ({ milestoneId: created.id, text })));
    return created;
  });
}

export async function setCriterionDone(db: Database, criterionId: string, done: boolean, now = new Date()) {
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ status: milestone.status })
      .from(criterion)
      .innerJoin(milestone, eq(criterion.milestoneId, milestone.id))
      .where(eq(criterion.id, criterionId));
    if (!target) throw new DomainError("Ese objetivo no existe.");
    if (target.status !== "open") throw new DomainError("Esa misión ya está cerrada.");

    await tx
      .update(criterion)
      .set({ done, doneAt: done ? now : null })
      .where(eq(criterion.id, criterionId));
  });
}
