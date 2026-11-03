import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Database } from "../src/db/client";
import { readBrief } from "../src/server/brief";
import { addDecision } from "../src/server/decisions";
import { DomainError } from "../src/server/errors";
import { parkIdea } from "../src/server/ideas";
import { setCriterionDone } from "../src/server/milestones";
import { currentMission } from "../src/server/overview";
import { findProject } from "../src/server/projects";
import { logProgress } from "../src/server/sessions";

const projectParam = z.string().describe("Id o nombre del proyecto (sin distinguir mayúsculas).");

// The brief is plain text for people; the ids are only needed by the tools.
export async function getBriefHandler(db: Database, args: { project: string }) {
  const { id } = await findProject(db, args.project);
  const brief = await readBrief(db, id);
  const pending = (await currentMission(db, id))?.criteria.filter(({ done }) => !done) ?? [];

  return pending.length > 0
    ? `${brief}\n\nIds de los objetivos pendientes (para mark_criterion, criteria_met y next_criterion_id):\n${pending
        .map((item) => `- ${item.id}: ${item.text}`)
        .join("\n")}`
    : brief;
}

export async function logProgressHandler(
  db: Database,
  args: {
    project: string;
    summary: string;
    criteria_met?: string[];
    next_criterion_id?: string;
    next_step?: string;
  },
) {
  const { id, name } = await findProject(db, args.project);
  await logProgress(db, {
    projectId: id,
    summary: args.summary,
    metCriterionIds: args.criteria_met,
    nextCriterionId: args.next_criterion_id,
    nextStepDetail: args.next_step,
  });
  return `Resumen guardado como borrador en ${name}. El usuario lo confirma al cerrar la sesión.`;
}

export async function markCriterionHandler(db: Database, args: { criterion_id: string }) {
  await setCriterionDone(db, args.criterion_id, true);
  return "Objetivo marcado como cumplido.";
}

export async function parkIdeaHandler(db: Database, args: { text: string; project?: string }) {
  const projectId = args.project ? (await findProject(db, args.project)).id : undefined;
  await parkIdea(db, { text: args.text, projectId });
  return "Idea guardada en el estacionamiento. No la ejecutes en esta sesión.";
}

export async function addDecisionHandler(db: Database, args: { project: string; question: string }) {
  const { id } = await findProject(db, args.project);
  await addDecision(db, { projectId: id, question: args.question });
  return "Decisión abierta registrada.";
}

// A broken domain rule goes back to the model as a tool error it can act on.
async function respond(run: () => Promise<string>) {
  try {
    return { content: [{ type: "text" as const, text: await run() }] };
  } catch (error) {
    if (error instanceof DomainError) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    throw error;
  }
}

export function createMcpServer(db: Database) {
  const server = new McpServer({ name: "avance", version: "0.1.0" });

  server.registerTool(
    "get_brief",
    {
      description:
        "Devuelve el brief del proyecto: hito actual, criterios pendientes con sus ids, últimas 3 entradas de bitácora, siguiente paso y decisiones abiertas. Si el proyecto no tiene una sesión abierta, la abre. Llámala al empezar a trabajar.",
      inputSchema: { project: projectParam },
    },
    (args) => respond(() => getBriefHandler(db, args)),
  );

  server.registerTool(
    "log_progress",
    {
      description:
        "Guarda el resumen de lo que quedó funcionando como borrador; el usuario lo confirma o corrige al cerrar la sesión. Llámala al terminar de trabajar.",
      inputSchema: {
        project: projectParam,
        summary: z.string().describe("De 1 a 3 frases sobre lo que quedó funcionando."),
        criteria_met: z
          .array(z.string())
          .optional()
          .describe("Ids de los criterios cumplidos, tal como los devuelve get_brief."),
        next_criterion_id: z
          .string()
          .optional()
          .describe(
            "Id del criterio que sigue. Debe ser de la misión abierta y seguir pendiente después de criteria_met; si no, la herramienta devuelve un error y no guarda nada.",
          ),
        next_step: z
          .string()
          .optional()
          .describe("Detalle de una línea sobre cómo seguir con ese criterio. No reemplaza a next_criterion_id."),
      },
    },
    (args) => respond(() => logProgressHandler(db, args)),
  );

  server.registerTool(
    "mark_criterion",
    {
      description: "Marca un criterio del hito actual como cumplido.",
      inputSchema: {
        criterion_id: z.string().describe("Id del criterio, tal como lo devuelve get_brief."),
      },
    },
    (args) => respond(() => markCriterionHandler(db, args)),
  );

  server.registerTool(
    "park_idea",
    {
      description:
        "Manda al estacionamiento una idea o tangente fuera del hito actual, en vez de ejecutarla.",
      inputSchema: {
        text: z.string().describe("La idea, en una línea."),
        project: projectParam.optional(),
      },
    },
    (args) => respond(() => parkIdeaHandler(db, args)),
  );

  server.registerTool(
    "add_decision",
    {
      description: "Registra una decisión que queda abierta para que el usuario la responda.",
      inputSchema: {
        project: projectParam,
        question: z.string().describe("La pregunta que hay que decidir."),
      },
    },
    (args) => respond(() => addDecisionHandler(db, args)),
  );

  return server;
}
