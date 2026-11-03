import { randomUUID } from "node:crypto";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, describe, expect, it } from "vitest";
import { addDecision, answerDecision } from "../server/decisions";
import { parkIdea } from "../server/ideas";
import { closeWeeklyReview } from "../server/reviews";
import { closeSession, openSession } from "../server/sessions";
import { copyData } from "./copy-data";
import { seed } from "./seed";
import { createTestDb } from "./test-db";
import { criterion, project } from "./schema";
import { eq } from "drizzle-orm";

const emptyClient = () => {
  const dir = process.env.TEST_DB_DIR!;
  const path = join(dir, `${randomUUID()}.db`);
  copyFileSync(join(dir, "template.db"), path);
  return createClient({ url: `file:${path.replaceAll("\\", "/")}` });
};

describe("copyData", () => {
  const source = createTestDb();
  const sourceClient = source.client;
  const target = emptyClient();

  afterAll(() => {
    source.close();
    target.close();
  });

  it("copies every table with the same values, and refuses to run twice", async () => {
    const { db } = source;
    await seed(db);
    const [recetario] = await db.select().from(project).where(eq(project.name, "Recetario"));
    const opened = await openSession(db, { projectId: recetario.id });
    const [next] = await db.select().from(criterion).where(eq(criterion.milestoneId, opened.milestoneId!));
    await closeSession(db, { sessionId: opened.id, outcome: "Listo", nextCriterionId: next.id });
    await parkIdea(db, { text: "Idea", projectId: recetario.id });
    const decision = await addDecision(db, { projectId: recetario.id, question: "¿Sí?" });
    await answerDecision(db, decision.id, "Sí");
    await closeWeeklyReview(db);

    const copied = await copyData(sourceClient, target);

    expect(copied).toEqual({
      project: 3,
      milestone: 1,
      criterion: 4,
      session: 1,
      idea: 1,
      decision: 1,
      weekly_review: 1,
    });
    for (const table of Object.keys(copied)) {
      const [from, to] = await Promise.all([
        sourceClient.execute(`select * from ${table} order by id`),
        target.execute(`select * from ${table} order by id`),
      ]);
      expect(JSON.stringify(to.rows)).toBe(JSON.stringify(from.rows));
    }

    await expect(copyData(sourceClient, target)).rejects.toThrow("ya tiene datos");
    expect(Number((await target.execute("select count(*) as total from project")).rows[0].total)).toBe(3);
  });
});
