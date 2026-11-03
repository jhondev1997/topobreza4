"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ActionForm";
import { db } from "@/db/client";
import { discardIdea, parkIdea, postponeIdea, promoteIdea } from "@/server/ideas";
import { closeWeeklyReview } from "@/server/reviews";
import { runAction } from "../run-action";

export async function parkIdeaAction(_state: ActionState, formData: FormData) {
  return runAction(() =>
    parkIdea(db, {
      text: String(formData.get("text") ?? ""),
      projectId: String(formData.get("projectId") ?? ""),
    }),
  );
}

export async function postponeIdeaAction(ideaId: string) {
  return runAction(() => postponeIdea(db, ideaId));
}

export async function discardIdeaAction(ideaId: string) {
  return runAction(() => discardIdea(db, ideaId));
}

export async function promoteIdeaAction(ideaId: string) {
  let projectId = "";
  const result = await runAction(async () => {
    projectId = (await promoteIdea(db, ideaId)).id;
  });
  if (result.error) return result;
  redirect(`/p/${projectId}`);
}

export async function closeReviewAction() {
  const result = await runAction(() => closeWeeklyReview(db));
  if (result.error) return result;
  redirect("/");
}
