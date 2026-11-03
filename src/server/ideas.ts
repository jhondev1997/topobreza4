import { asc, count, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { idea, project } from "../db/schema";
import { DomainError } from "./errors";
import { MAX_ACTIVE_PROJECTS } from "./projects";
import { daysAfter, nextSaturday } from "./time";

export async function parkIdea(db: Database, input: { text: string; projectId?: string }, now = new Date()) {
  const text = input.text.trim();
  if (!text) throw new DomainError("La idea no puede estar vacía.");

  const [created] = await db
    .insert(idea)
    .values({ text, projectId: input.projectId || null, reviewAfter: nextSaturday(now) })
    .returning();
  return created;
}

export function listParkedIdeas(db: Database) {
  return db
    .select({
      id: idea.id,
      text: idea.text,
      reviewAfter: idea.reviewAfter,
      projectName: project.name,
    })
    .from(idea)
    .leftJoin(project, eq(idea.projectId, project.id))
    .where(eq(idea.status, "parked"))
    .orderBy(asc(idea.reviewAfter), asc(idea.createdAt));
}

export const isDueForReview = (reviewAfter: Date | null, now: Date) =>
  reviewAfter !== null && reviewAfter <= now;

async function requireParked(db: Pick<Database, "select">, ideaId: string) {
  const [target] = await db.select().from(idea).where(eq(idea.id, ideaId));
  if (!target) throw new DomainError("Esa idea no existe.");
  if (target.status !== "parked") throw new DomainError("Esa idea ya no está en la banca.");
  return target;
}

export async function postponeIdea(db: Database, ideaId: string, now = new Date()) {
  await requireParked(db, ideaId);
  await db.update(idea).set({ reviewAfter: daysAfter(now, 7) }).where(eq(idea.id, ideaId));
}

export async function discardIdea(db: Database, ideaId: string) {
  await requireParked(db, ideaId);
  await db.update(idea).set({ status: "discarded" }).where(eq(idea.id, ideaId));
}

// An idea becomes a new active project, and only if there is a free slot. Its
// text is all that is known, so it is both the name and the reason to exist.
export async function promoteIdea(db: Database, ideaId: string) {
  return db.transaction(async (tx) => {
    const target = await requireParked(tx, ideaId);

    const [{ active }] = await tx
      .select({ active: count() })
      .from(project)
      .where(eq(project.status, "active"));
    if (active >= MAX_ACTIVE_PROJECTS) {
      throw new DomainError(
        `Ya tienes ${MAX_ACTIVE_PROJECTS} partidas en curso. Manda una a la banca antes de subir esta idea.`,
      );
    }

    const [created] = await tx
      .insert(project)
      .values({ name: target.text, why: target.text, status: "active" })
      .onConflictDoNothing({ target: sql`lower(${project.name})` })
      .returning();
    if (!created) throw new DomainError(`Ya existe un proyecto llamado "${target.text}".`);

    await tx.update(idea).set({ status: "promoted" }).where(eq(idea.id, ideaId));
    return created;
  });
}
