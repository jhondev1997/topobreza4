import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db/client";
import { getOpenSessionOverview } from "@/server/overview";
import { formatDuration } from "@/server/time";
import { closeSessionAction } from "../actions";
import { CloseForm } from "./CloseForm";

async function CloseContent({ params }: { params: PageProps<"/p/[id]/cierre">["params"] }) {
  await connection();
  const now = new Date();
  const { id } = await params;
  const overview = await getOpenSessionOverview(db, id);
  if (!overview) redirect(`/p/${id}`);

  const { session, projectName, criteria } = overview;

  return (
    <CloseForm
      // A new draft from Claude Code has to replace what the form holds.
      key={`${session.outcome}|${session.nextStep}|${session.nextCriterionId}|${criteria.filter(({ done }) => done).length}`}
      draft={{
        outcome: session.outcome ?? "",
        nextCriterionId: session.nextCriterionId,
        nextStepDetail: session.nextStep ?? "",
      }}
      isClaudeDraft={session.outcome !== null}
      action={closeSessionAction.bind(null, session.id)}
      headline={`${projectName} · ${formatDuration(now.getTime() - session.startedAt.getTime())}`}
      backHref={`/p/${id}/sesion`}
      criteria={criteria.map(({ id: criterionId, text, done, doneAt }) => ({
        id: criterionId,
        text,
        done,
        doneInSession: done && doneAt !== null && doneAt >= session.startedAt,
      }))}
    />
  );
}

export default function ClosePage({ params }: PageProps<"/p/[id]/cierre">) {
  return (
    <Suspense fallback={<main className="grow" aria-busy />}>
      <CloseContent params={params} />
    </Suspense>
  );
}
