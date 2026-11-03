"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ActionForm";
import { db } from "@/db/client";
import { startSession } from "@/server/brief";
import { addDecision, answerDecision } from "@/server/decisions";
import { createMilestone, cutMilestone, setCriterionDone, updateMilestone } from "@/server/milestones";
import { activateProject, parkProject } from "@/server/projects";
import { closeSession } from "@/server/sessions";
import { runAction } from "../../run-action";

export async function activateProjectAction(projectId: string) {
  return runAction(() => activateProject(db, projectId));
}

export async function parkProjectAction(projectId: string) {
  return runAction(() => parkProject(db, projectId));
}

export async function setCriterionDoneAction(criterionId: string, done: boolean) {
  return runAction(() => setCriterionDone(db, criterionId, done));
}

export async function startSessionAction(projectId: string) {
  const result = await runAction(() => startSession(db, projectId));
  if (result.error) return result;
  redirect(`/p/${projectId}/sesion`);
}

export async function closeSessionAction(sessionId: string, _state: ActionState, formData: FormData) {
  const result = await runAction(() =>
    closeSession(db, {
      sessionId,
      outcome: String(formData.get("outcome") ?? ""),
      blocker: String(formData.get("blocker") ?? ""),
      nextCriterionId: String(formData.get("nextCriterionId") ?? "") || undefined,
      nextStepDetail: String(formData.get("nextStepDetail") ?? ""),
      metCriterionIds: formData.getAll("criterion").map(String),
    }),
  );
  if (result.error) return result;
  redirect("/");
}

export async function createMilestoneAction(projectId: string, _state: ActionState, formData: FormData) {
  return runAction(() =>
    createMilestone(db, {
      projectId,
      title: String(formData.get("title") ?? ""),
      doneDefinition: String(formData.get("doneDefinition") ?? ""),
      criteria: formData.getAll("criterion").map(String),
    }),
  );
}

export async function updateMilestoneAction(
  projectId: string,
  milestoneId: string,
  _state: ActionState,
  formData: FormData,
) {
  const ids = formData.getAll("criterionId").map(String);
  const result = await runAction(() =>
    updateMilestone(db, {
      milestoneId,
      title: String(formData.get("title") ?? ""),
      doneDefinition: String(formData.get("doneDefinition") ?? ""),
      pendingCriteria: formData.getAll("criterion").map((text, index) => ({ id: ids[index], text: String(text) })),
    }),
  );
  if (result.error) return result;
  redirect(`/p/${projectId}`);
}

export async function cutMilestoneAction(projectId: string, milestoneId: string) {
  const result = await runAction(() => cutMilestone(db, milestoneId));
  if (result.error) return result;
  redirect(`/p/${projectId}`);
}

export async function addDecisionAction(projectId: string, _state: ActionState, formData: FormData) {
  return runAction(() => addDecision(db, { projectId, question: String(formData.get("question") ?? "") }));
}

export async function answerDecisionAction(decisionId: string, _state: ActionState, formData: FormData) {
  return runAction(() => answerDecision(db, decisionId, String(formData.get("answer") ?? "")));
}
