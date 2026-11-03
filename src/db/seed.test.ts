import { asc, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "./schema";
import { seed } from "./seed";
import { createTestDb } from "./test-db";

describe("seed", () => {
  const { db, close } = createTestDb();

  afterAll(close);

  it("creates the three projects with the Recetario milestone and criteria", async () => {
    await seed(db);

    const projects = await db.select().from(schema.project).orderBy(asc(schema.project.name));
    expect(projects.map((p) => [p.name, p.status])).toEqual([
      ["Blog personal", "active"],
      ["Juego de cartas", "parked"],
      ["Recetario", "active"],
    ]);

    const milestones = await db.select().from(schema.milestone);
    expect(milestones).toHaveLength(1);
    expect(milestones[0].title).toBe("Recetario corriendo en staging");
    expect(await db.select().from(schema.criterion)).toHaveLength(4);
  });

  it("does not duplicate rows nor overwrite changes when run again", async () => {
    await db
      .update(schema.project)
      .set({ status: "done" })
      .where(eq(schema.project.name, "Juego de cartas"));

    await seed(db);

    const projects = await db.select().from(schema.project);
    expect(projects).toHaveLength(3);
    expect(projects.find((p) => p.name === "Juego de cartas")?.status).toBe("done");
    expect(await db.select().from(schema.milestone)).toHaveLength(1);
    expect(await db.select().from(schema.criterion)).toHaveLength(4);
  });
});
