import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { criterion, decision, milestone, project, session } from "../db/schema";
import {
  countClosedSessionsThisWeek,
  daysSinceLastSession,
  getOpenSession,
  listSessionLog,
} from "./sessions";

export const COOLING_WARNING_DAYS = 7;
const COOLING_EMPTY_DAYS = 14;
export const SUGGEST_CUT_AFTER_SESSIONS = 3;

// Share of the cooling bar still full: 100% on day 0, empty on day 14.
export function coolingPercent(days: number) {
  return Math.max(0, Math.round((1 - days / COOLING_EMPTY_DAYS) * 100));
}

const listCriteria = (db: Database, milestoneId: string) =>
  db
    .select()
    .from(criterion)
    .where(eq(criterion.milestoneId, milestoneId))
    .orderBy(sql`rowid`); // insertion order

export async function currentMission(db: Database, projectId: string) {
  const [current] = await db
    .select()
    .from(milestone)
    .where(and(eq(milestone.projectId, projectId), eq(milestone.status, "open")));
  if (!current) return null;

  return { ...current, criteria: await listCriteria(db, current.id) };
}

export async function latestNextStep(db: Database, projectId: string) {
  const [latest] = await db
    .select({ nextStep: session.nextStep })
    .from(session)
    .where(and(eq(session.projectId, projectId), isNotNull(session.endedAt), isNotNull(session.nextStep)))
    .orderBy(desc(session.endedAt))
    .limit(1);
  return latest?.nextStep ?? null;
}

export const listOpenDecisions = (db: Database, projectId: string) =>
  db
    .select()
    .from(decision)
    .where(and(eq(decision.projectId, projectId), eq(decision.status, "open")));

export async function getHomeOverview(db: Database, now = new Date()) {
  const projects = await db.select().from(project).orderBy(asc(project.createdAt), asc(project.name));

  const active = await Promise.all(
    projects
      .filter(({ status }) => status === "active")
      .map(async (item) => ({
        ...item,
        daysSinceSession: daysSinceLastSession(item, now),
        mission: await currentMission(db, item.id),
        nextStep: await latestNextStep(db, item.id),
        hasOpenSession: (await getOpenSession(db, item.id)) !== null,
      })),
  );

  return {
    active,
    parked: projects.filter(({ status }) => status === "parked"),
    closedThisWeek: await countClosedSessionsThisWeek(db, now),
  };
}

export async function getProjectOverview(db: Database, projectId: string, now = new Date()) {
  const [target] = await db.select().from(project).where(eq(project.id, projectId));
  if (!target) return null;

  const [mission, nextStep, log, openDecisions, openSession] = await Promise.all([
    currentMission(db, projectId),
    latestNextStep(db, projectId),
    listSessionLog(db, projectId),
    listOpenDecisions(db, projectId),
    getOpenSession(db, projectId),
  ]);

  const missionSessions = mission
    ? (
        await db
          .select({ closed: count() })
          .from(session)
          .where(and(eq(session.milestoneId, mission.id), isNotNull(session.endedAt)))
      )[0].closed
    : 0;

  return {
    ...target,
    daysSinceSession: daysSinceLastSession(target, now),
    mission,
    missionSessions,
    nextStep,
    log,
    openDecisions,
    hasOpenSession: openSession !== null,
  };
}

// Data for the session and closing screens; null when the project has no open session.
export async function getOpenSessionOverview(db: Database, projectId: string) {
  const open = await getOpenSession(db, projectId);
  if (!open) return null;

  const [[owner], [sessionMilestone], criteria] = await Promise.all([
    db.select({ name: project.name }).from(project).where(eq(project.id, projectId)),
    open.milestoneId
      ? db.select({ title: milestone.title }).from(milestone).where(eq(milestone.id, open.milestoneId))
      : [],
    open.milestoneId ? listCriteria(db, open.milestoneId) : [],
  ]);

  return {
    session: open,
    projectName: owner.name,
    missionTitle: sessionMilestone?.title ?? null,
    criteria,
  };
}
