import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { project, session } from "../db/schema";
import { DomainError } from "./errors";
import { currentMission, latestNextStep, listOpenDecisions } from "./overview";
import { getOpenSession, listSessionLog, openSession } from "./sessions";
import { formatShortDate } from "./time";

const LOG_ENTRIES_IN_BRIEF = 3;

const list = (title: string, items: string[]) =>
  items.length > 0 ? [`${title}:`, ...items.map((item) => `- ${item}`)] : [];

export async function generateBrief(db: Database, projectId: string) {
  const [target] = await db.select({ name: project.name }).from(project).where(eq(project.id, projectId));
  if (!target) throw new DomainError("Ese proyecto no existe.");

  const [mission, nextStep, log, decisions] = await Promise.all([
    currentMission(db, projectId),
    latestNextStep(db, projectId),
    listSessionLog(db, projectId, LOG_ENTRIES_IN_BRIEF),
    listOpenDecisions(db, projectId),
  ]);

  return [
    `Proyecto: ${target.name}`,
    ...(mission
      ? [
          `Misión: ${mission.title}`,
          `Hecho cuando: ${mission.doneDefinition}`,
          ...list(
            "Pendiente",
            mission.criteria.filter(({ done }) => !done).map(({ text }) => text),
          ),
        ]
      : ["Misión: sin definir"]),
    ...list(
      "Último",
      log.map(({ endedAt, outcome }) => `${endedAt ? formatShortDate(endedAt) : ""}: ${outcome}`),
    ),
    ...(nextStep ? [`Siguiente: ${nextStep}`] : []),
    ...list(
      "Decisiones abiertas",
      decisions.map(({ question }) => question),
    ),
    "Al terminar: llama a log_progress",
  ].join("\n");
}

// Resumes the project's open session, or opens one with a snapshot of the brief.
export async function startSession(
  db: Database,
  projectId: string,
  source: "manual" | "claude_code" = "manual",
) {
  const open = await getOpenSession(db, projectId);
  if (open) return open;

  const briefSnapshot = await generateBrief(db, projectId);
  return openSession(db, { projectId, source, briefSnapshot });
}

// For Claude Code: resumes or opens the session and records that the brief was
// read, keeping the snapshot equal to what was actually read.
export async function readBrief(db: Database, projectId: string, now = new Date()) {
  const started = await startSession(db, projectId, "claude_code");
  const brief = await generateBrief(db, projectId);
  await db
    .update(session)
    .set({ briefSnapshot: brief, briefReadAt: now })
    .where(eq(session.id, started.id));
  return brief;
}
