import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { project, session } from "../db/schema";
import { DomainError } from "./errors";

export const MAX_ACTIVE_PROJECTS = 2;

// `reference` is a project's id or its name, ignoring case.
export async function findProject(db: Database, reference: string) {
  const trimmed = reference.trim();
  const [found] = await db
    .select()
    .from(project)
    .where(or(eq(project.id, trimmed), eq(sql`lower(${project.name})`, trimmed.toLowerCase())));
  if (!found) throw new DomainError(`No encontré el proyecto "${trimmed}".`);
  return found;
}

export async function createProject(db: Database, input: { name: string; why: string; repoPath?: string }) {
  const name = input.name.trim();
  const why = input.why.trim();
  if (!name) throw new DomainError("El proyecto necesita un nombre.");
  if (!why) throw new DomainError("Escribe en una línea por qué existe el proyecto.");

  const [created] = await db
    .insert(project)
    .values({ name, why, repoPath: input.repoPath?.trim() || null })
    .onConflictDoNothing({ target: sql`lower(${project.name})` })
    .returning();
  if (!created) throw new DomainError(`Ya existe un proyecto llamado "${name}".`);
  return created;
}

export async function activateProject(db: Database, projectId: string) {
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(project).where(eq(project.id, projectId));
    if (!target) throw new DomainError("Ese proyecto no existe.");
    if (target.status === "active") return;
    if (target.status === "done") throw new DomainError("Ese proyecto ya está terminado.");

    const [{ active }] = await tx
      .select({ active: count() })
      .from(project)
      .where(eq(project.status, "active"));
    if (active >= MAX_ACTIVE_PROJECTS) {
      throw new DomainError(
        `Ya tienes ${MAX_ACTIVE_PROJECTS} partidas en curso. Manda una a la banca antes de activar otra.`,
      );
    }

    await tx.update(project).set({ status: "active" }).where(eq(project.id, projectId));
  });
}

export async function countActiveProjects(db: Database) {
  const [{ active }] = await db
    .select({ active: count() })
    .from(project)
    .where(eq(project.status, "active"));
  return active;
}

export async function parkProject(db: Database, projectId: string, now = new Date()) {
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(project).where(eq(project.id, projectId));
    if (!target) throw new DomainError("Ese proyecto no existe.");
    if (target.status === "done") throw new DomainError("Ese proyecto ya está terminado.");

    const [open] = await tx
      .select({ id: session.id })
      .from(session)
      .where(and(eq(session.projectId, projectId), isNull(session.endedAt)));
    if (open) throw new DomainError("Termina la partida abierta antes de mandar el proyecto a la banca.");

    await tx.update(project).set({ status: "parked", parkedAt: now }).where(eq(project.id, projectId));
  });
}
