import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

const now = sql`(unixepoch('subsec') * 1000)`;

export const project = sqliteTable(
  "project",
  {
    id: id(),
    name: text("name").notNull(),
    status: text("status", { enum: ["active", "parked", "done"] })
      .notNull()
      .default("parked"),
    why: text("why").notNull(),
    repoPath: text("repo_path"),
    lastSessionAt: timestamp("last_session_at"),
    parkedAt: timestamp("parked_at"),
    createdAt: timestamp("created_at").notNull().default(now),
  },
  // MCP looks projects up by case-insensitive name, so names must be unique that way.
  (table) => [uniqueIndex("project_name_unique").on(sql`lower(${table.name})`)],
);

export const milestone = sqliteTable("milestone", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id),
  title: text("title").notNull(),
  doneDefinition: text("done_definition").notNull(),
  status: text("status", { enum: ["open", "done", "cut"] })
    .notNull()
    .default("open"),
  openedAt: timestamp("opened_at").notNull().default(now),
  closedAt: timestamp("closed_at"),
});

export const criterion = sqliteTable("criterion", {
  id: id(),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestone.id),
  text: text("text").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  doneAt: timestamp("done_at"),
});

export const session = sqliteTable("session", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id),
  milestoneId: text("milestone_id").references(() => milestone.id),
  startedAt: timestamp("started_at").notNull().default(now),
  endedAt: timestamp("ended_at"),
  briefSnapshot: text("brief_snapshot"),
  briefReadAt: timestamp("brief_read_at"),
  outcome: text("outcome"),
  blocker: text("blocker"),
  nextStep: text("next_step"),
  nextCriterionId: text("next_criterion_id").references(() => criterion.id),
  source: text("source", { enum: ["manual", "claude_code"] })
    .notNull()
    .default("manual"),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
});

export const idea = sqliteTable("idea", {
  id: id(),
  text: text("text").notNull(),
  projectId: text("project_id").references(() => project.id),
  createdAt: timestamp("created_at").notNull().default(now),
  reviewAfter: timestamp("review_after"),
  status: text("status", { enum: ["parked", "promoted", "discarded"] })
    .notNull()
    .default("parked"),
});

export const weeklyReview = sqliteTable("weekly_review", {
  id: id(),
  closedAt: timestamp("closed_at").notNull(),
});

export const decision = sqliteTable("decision", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id),
  question: text("question").notNull(),
  status: text("status", { enum: ["open", "decided"] })
    .notNull()
    .default("open"),
  answer: text("answer"),
  decidedAt: timestamp("decided_at"),
});
