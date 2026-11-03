import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { decision } from "../db/schema";
import { DomainError } from "./errors";

export async function addDecision(db: Database, input: { projectId: string; question: string }) {
  const question = input.question.trim();
  if (!question) throw new DomainError("La decisión necesita una pregunta.");

  const [created] = await db.insert(decision).values({ projectId: input.projectId, question }).returning();
  return created;
}

export async function answerDecision(db: Database, decisionId: string, answer: string, now = new Date()) {
  const trimmed = answer.trim();
  if (!trimmed) throw new DomainError("Escribe la respuesta.");

  const [target] = await db.select().from(decision).where(eq(decision.id, decisionId));
  if (!target) throw new DomainError("Esa decisión no existe.");
  if (target.status !== "open") throw new DomainError("Esa decisión ya está respondida.");

  await db
    .update(decision)
    .set({ status: "decided", answer: trimmed, decidedAt: now })
    .where(eq(decision.id, decisionId));
}
