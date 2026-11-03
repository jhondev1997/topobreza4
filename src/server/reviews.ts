import { and, asc, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { criterion, decision, milestone, project, session, weeklyReview } from "../db/schema";
import { isDueForReview, listParkedIdeas } from "./ideas";
import { COOLING_WARNING_DAYS, currentMission } from "./overview";
import { MAX_ACTIVE_PROJECTS } from "./projects";
import { daysSinceLastSession } from "./sessions";

const REPORT_WINDOW_MS = 7 * 86_400_000;

export async function closeWeeklyReview(db: Database, now = new Date()) {
  await db.insert(weeklyReview).values({ closedAt: now });
}

export async function getWeeklyReport(db: Database, now = new Date()) {
  const since = new Date(now.getTime() - REPORT_WINDOW_MS);

  const [[{ closedSessions }], metCriteria, activeProjects, ideas, openDecisions, [lastReview]] = await Promise.all([
    db
      .select({ closedSessions: count() })
      .from(session)
      .where(and(isNotNull(session.endedAt), gte(session.endedAt, since))),
    db
      .select({ projectName: project.name, met: count() })
      .from(criterion)
      .innerJoin(milestone, eq(criterion.milestoneId, milestone.id))
      .innerJoin(project, eq(milestone.projectId, project.id))
      .where(and(eq(criterion.done, true), gte(criterion.doneAt, since)))
      .groupBy(project.id)
      .orderBy(asc(project.name)),
    db.select().from(project).where(eq(project.status, "active")).orderBy(asc(project.createdAt), asc(project.name)),
    listParkedIdeas(db),
    db
      .select({ projectId: project.id, projectName: project.name, open: count() })
      .from(decision)
      .innerJoin(project, eq(decision.projectId, project.id))
      .where(eq(decision.status, "open"))
      .groupBy(project.id)
      .orderBy(asc(project.name)),
    db.select().from(weeklyReview).orderBy(desc(weeklyReview.closedAt)).limit(1),
  ]);

  const projects = await Promise.all(
    activeProjects.map(async (item) => ({
      id: item.id,
      name: item.name,
      days: daysSinceLastSession(item, now),
      hasMission: (await currentMission(db, item.id)) !== null,
    })),
  );

  return {
    closedSessions,
    metCriteria,
    cooling: projects.filter(({ days, hasMission }) => days >= COOLING_WARNING_DAYS || !hasMission),
    dueIdeas: ideas.filter(({ reviewAfter }) => isDueForReview(reviewAfter, now)),
    hasFreeSlot: activeProjects.length < MAX_ACTIVE_PROJECTS,
    openDecisions,
    lastReviewAt: lastReview?.closedAt ?? null,
  };
}
