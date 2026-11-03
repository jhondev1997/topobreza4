import { and, count, desc, eq, gte, inArray, isNotNull, isNull, notInArray } from "drizzle-orm";
import type { Database } from "../db/client";
import { criterion, milestone, project, session } from "../db/schema";
import { DomainError } from "./errors";
import { composeNextStep, DEFINE_NEXT_MISSION } from "./next-step";
import { daysBetween, startOfWeek } from "./time";

export async function getOpenSession(db: Database, projectId: string) {
  const [open] = await db
    .select()
    .from(session)
    .where(and(eq(session.projectId, projectId), isNull(session.endedAt)));
  return open ?? null;
}

export async function openSession(
  db: Database,
  input: {
    projectId: string;
    source?: "manual" | "claude_code";
    briefSnapshot?: string;
  },
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(project).where(eq(project.id, input.projectId));
    if (!target) throw new DomainError("Ese proyecto no existe.");
    if (target.status !== "active") throw new DomainError("Solo se puede jugar un proyecto activo.");

    const [open] = await tx
      .select({ name: project.name })
      .from(session)
      .innerJoin(project, eq(session.projectId, project.id))
      .where(isNull(session.endedAt));
    if (open) throw new DomainError(`Ya hay una partida abierta en ${open.name}. Termínala primero.`);

    const [current] = await tx
      .select({ id: milestone.id })
      .from(milestone)
      .where(and(eq(milestone.projectId, input.projectId), eq(milestone.status, "open")));

    const [created] = await tx
      .insert(session)
      .values({
        projectId: input.projectId,
        milestoneId: current?.id ?? null,
        startedAt: now,
        source: input.source ?? "manual",
        briefSnapshot: input.briefSnapshot ?? null,
      })
      .returning();
    return created;
  });
}

// Claude Code's summary stays as a draft until the user confirms it on closing.
// Its criteria are marked right away, and the user can uncheck them on closing.
export async function logProgress(
  db: Database,
  input: {
    projectId: string;
    summary: string;
    metCriterionIds?: string[];
    nextCriterionId?: string;
    nextStepDetail?: string;
  },
  now = new Date(),
) {
  const summary = input.summary.trim();
  if (!summary) throw new DomainError("El resumen no puede estar vacío.");

  await db.transaction(async (tx) => {
    const [open] = await tx
      .select()
      .from(session)
      .where(and(eq(session.projectId, input.projectId), isNull(session.endedAt)));
    if (!open) throw new DomainError("Este proyecto no tiene una sesión abierta. Llama primero a get_brief.");

    const metCriterionIds = input.metCriterionIds ?? [];
    if (metCriterionIds.length > 0) {
      const known = open.milestoneId
        ? await tx
            .select({ id: criterion.id, done: criterion.done })
            .from(criterion)
            .where(and(eq(criterion.milestoneId, open.milestoneId), inArray(criterion.id, metCriterionIds)))
        : [];
      const unknown = metCriterionIds.filter((id) => !known.some((item) => item.id === id));
      if (unknown.length > 0) {
        throw new DomainError(`Estos objetivos no son de la misión actual: ${unknown.join(", ")}.`);
      }
      const pending = known.filter(({ done }) => !done).map(({ id }) => id);
      if (pending.length > 0) {
        await tx.update(criterion).set({ done: true, doneAt: now }).where(inArray(criterion.id, pending));
      }
    }

    if (input.nextCriterionId) {
      const pending = open.milestoneId ? await listPendingCriteria(tx, open.milestoneId) : [];
      requirePending(pending, input.nextCriterionId);
    }

    // While the session is open, next_step only holds the draft's detail.
    const detail = input.nextStepDetail?.trim();
    await tx
      .update(session)
      .set({
        outcome: summary,
        source: "claude_code",
        confirmed: false,
        ...(input.nextCriterionId ? { nextCriterionId: input.nextCriterionId } : {}),
        ...(detail ? { nextStep: detail } : {}),
      })
      .where(eq(session.id, open.id));
  });
}

const listPendingCriteria = (db: Pick<Database, "select">, milestoneId: string) =>
  db
    .select({ id: criterion.id, text: criterion.text })
    .from(criterion)
    .where(and(eq(criterion.milestoneId, milestoneId), eq(criterion.done, false)));

function requirePending(pending: { id: string; text: string }[], criterionId: string) {
  const chosen = pending.find(({ id }) => id === criterionId);
  if (!chosen) {
    throw new DomainError("El siguiente movimiento debe ser un objetivo pendiente de la misión abierta.");
  }
  return chosen;
}

// Closing is the user's confirmation, so it also confirms a Claude Code draft.
// A milestone with every criterion met is finished here: this is the moment the
// user reviews what got done.
export async function closeSession(
  db: Database,
  input: {
    sessionId: string;
    outcome: string;
    blocker?: string;
    nextCriterionId?: string;
    nextStepDetail?: string;
    metCriterionIds?: string[];
  },
  now = new Date(),
) {
  const outcome = input.outcome.trim();
  if (!outcome) throw new DomainError("Escribe qué quedó funcionando.");

  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(session).where(eq(session.id, input.sessionId));
    if (!target) throw new DomainError("Esa partida no existe.");
    if (target.endedAt) throw new DomainError("Esa partida ya está terminada.");

    if (target.milestoneId && input.metCriterionIds) {
      const metIds = input.metCriterionIds;
      await tx
        .update(criterion)
        .set({ done: true, doneAt: now })
        .where(
          and(
            eq(criterion.milestoneId, target.milestoneId),
            inArray(criterion.id, metIds),
            eq(criterion.done, false),
          ),
        );
      // Whatever was marked during this session and got unchecked is undone.
      await tx
        .update(criterion)
        .set({ done: false, doneAt: null })
        .where(
          and(
            eq(criterion.milestoneId, target.milestoneId),
            notInArray(criterion.id, metIds),
            eq(criterion.done, true),
            gte(criterion.doneAt, target.startedAt),
          ),
        );
    }

    // Validated after applying the criteria: what was just met cannot be next.
    const pending = target.milestoneId ? await listPendingCriteria(tx, target.milestoneId) : [];
    if (pending.length > 0 && !input.nextCriterionId) {
      throw new DomainError("Elige el siguiente movimiento.");
    }
    const next = input.nextCriterionId ? requirePending(pending, input.nextCriterionId) : null;

    await tx
      .update(session)
      .set({
        endedAt: now,
        outcome,
        blocker: input.blocker?.trim() || null,
        nextCriterionId: next?.id ?? null,
        nextStep: next ? composeNextStep(next.text, input.nextStepDetail) : DEFINE_NEXT_MISSION,
        confirmed: true,
      })
      .where(eq(session.id, target.id));
    await tx.update(project).set({ lastSessionAt: now }).where(eq(project.id, target.projectId));

    if (target.milestoneId && pending.length === 0) {
      await tx
        .update(milestone)
        .set({ status: "done", closedAt: now })
        .where(and(eq(milestone.id, target.milestoneId), eq(milestone.status, "open")));
    }
  });
}

export async function listSessionLog(db: Database, projectId: string, limit = 5) {
  return db
    .select()
    .from(session)
    .where(and(eq(session.projectId, projectId), isNotNull(session.endedAt)))
    .orderBy(desc(session.endedAt))
    .limit(limit);
}

export async function countClosedSessionsThisWeek(db: Database, now = new Date()) {
  const [{ closed }] = await db
    .select({ closed: count() })
    .from(session)
    .where(gte(session.endedAt, startOfWeek(now)));
  return closed;
}

// A project that never had a session starts cooling from the day it was created.
export function daysSinceLastSession(
  target: { lastSessionAt: Date | null; createdAt: Date },
  now = new Date(),
) {
  return daysBetween(target.lastSessionAt ?? target.createdAt, now);
}
