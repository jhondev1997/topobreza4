import { Check, ChevronLeft, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Freshness } from "@/components/Freshness";
import { primaryButton, quietButton, sectionHeading, sectionLabel } from "@/components/styles";
import { db } from "@/db/client";
import { MAX_CRITERIA, MIN_CRITERIA } from "@/server/milestones";
import { getProjectOverview, SUGGEST_CUT_AFTER_SESSIONS } from "@/server/overview";
import { formatShortDate } from "@/server/time";
import {
  activateProjectAction,
  createMilestoneAction,
  cutMilestoneAction,
  parkProjectAction,
  setCriterionDoneAction,
  startSessionAction,
  updateMilestoneAction,
} from "./actions";
import { Decisions } from "./Decisions";
import { MilestoneForm } from "./MilestoneForm";

type Overview = NonNullable<Awaited<ReturnType<typeof getProjectOverview>>>;

function Mission({ mission, editHref }: { mission: NonNullable<Overview["mission"]>; editHref?: string }) {
  const done = mission.criteria.filter((item) => item.done).length;

  return (
    <section id="mision" className="clip-card flex scroll-mt-4 flex-col gap-2.5 border border-panel-line bg-panel p-4">
      <span className={sectionLabel}>
        MISIÓN ACTUAL · {done}/{mission.criteria.length}
      </span>
      <h2 className="text-lg font-bold">{mission.title}</h2>
      <p className="text-[13px] leading-[1.45] text-text-2">Hecho cuando: {mission.doneDefinition}</p>
      <ul className="flex flex-col">
        {mission.criteria.map((item) => (
          <li key={item.id}>
            <ActionForm action={setCriterionDoneAction.bind(null, item.id, !item.done)}>
              <button
                type="submit"
                role="checkbox"
                aria-checked={item.done}
                className={`focus-inset flex min-h-11 w-full items-center gap-2.5 py-1 text-left text-sm ${
                  item.done ? "text-muted" : "text-text"
                }`}
              >
                {item.done ? (
                  <span className="flex size-5 shrink-0 items-center justify-center bg-lime text-bg">
                    <Check size={14} strokeWidth={3.2} aria-hidden />
                  </span>
                ) : (
                  <span className="size-5 shrink-0 border-2 border-check-empty" />
                )}
                <span className={item.done ? "line-through" : undefined}>{item.text}</span>
              </button>
            </ActionForm>
          </li>
        ))}
      </ul>
      {editHref && (
        <Link
          href={editHref}
          className="focus-inset flex min-h-11 items-center self-start font-display text-sm font-bold tracking-[0.06em] text-lime uppercase hover:text-lime-hover"
        >
          Editar misión
        </Link>
      )}
    </section>
  );
}

async function ProjectContent({
  params,
  searchParams,
}: Pick<PageProps<"/p/[id]">, "params" | "searchParams">) {
  await connection();
  const { id } = await params;
  const project = await getProjectOverview(db, id);
  if (!project) notFound();

  const {
    name,
    status,
    why,
    daysSinceSession,
    lastSessionAt,
    mission,
    nextStep,
    log,
    openDecisions,
    hasOpenSession,
    missionSessions,
  } = project;
  const isActive = status === "active";
  const suggestCut = missionSessions >= SUGGEST_CUT_AFTER_SESSIONS;
  const { recortar, editar } = await searchParams;
  const wantsCut = recortar !== undefined;
  const canEdit = mission !== null && status !== "done" && !hasOpenSession;
  const isEditing = canEdit && editar !== undefined;

  return (
    <>
      <header className="flex items-center gap-1 pt-4 pr-4 pb-2 pl-2">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="focus-inset flex size-11 shrink-0 items-center justify-center text-text"
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </Link>
        <h1 className="grow font-display text-2xl font-bold uppercase">{name}</h1>
        {isActive ? (
          <Freshness days={daysSinceSession} hasSessions={lastSessionAt !== null} />
        ) : (
          <span className="shrink-0 font-display text-[11px] font-bold tracking-[0.16em] text-muted">
            {status === "parked" ? "EN BANCA" : "TERMINADO"}
          </span>
        )}
      </header>

      <main className="flex grow flex-col gap-3 px-4 pt-1 pb-4">
        {!isActive && <p className="px-1 text-sm text-text-2">{why}</p>}

        {mission && isEditing && (
          <MilestoneForm
            action={updateMilestoneAction.bind(null, id, mission.id)}
            minCriteria={MIN_CRITERIA}
            maxCriteria={MAX_CRITERIA}
            cancelHref={`/p/${id}`}
            mission={{
              title: mission.title,
              doneDefinition: mission.doneDefinition,
              pending: mission.criteria.filter(({ done }) => !done).map(({ id: rowId, text }) => ({ id: rowId, text })),
              met: mission.criteria.filter(({ done }) => done).map(({ text }) => text),
            }}
          />
        )}

        {mission && !isEditing && <Mission mission={mission} editHref={canEdit ? `/p/${id}?editar=1` : undefined} />}

        {mission && isActive && !hasOpenSession && (suggestCut || wantsCut) && (
          <section className="flex flex-col gap-2.5 border border-warn-line bg-warn-panel p-4">
            <p className="text-sm font-semibold text-warn-text">
              {suggestCut
                ? `Esta misión lleva ${missionSessions} sesiones. ¿La recortas?`
                : "¿Recortas esta misión?"}
            </p>
            <p className="text-[13px] leading-[1.4] text-warn-muted">
              Se cierra como recortada y se crea una nueva con los objetivos pendientes.
            </p>
            <ActionForm action={cutMilestoneAction.bind(null, id, mission.id)}>
              <button type="submit" className={quietButton}>
                Recortar misión
              </button>
            </ActionForm>
          </section>
        )}

        {!mission && isActive && (
          <MilestoneForm
            action={createMilestoneAction.bind(null, id)}
            minCriteria={MIN_CRITERIA}
            maxCriteria={MAX_CRITERIA}
          />
        )}

        {nextStep && (
          <section className="flex flex-col gap-1 border border-lime-line bg-lime-panel px-4 py-3.5">
            <span className={sectionLabel}>SIGUIENTE MOVIMIENTO</span>
            <span className="text-[15px] leading-[1.4] font-semibold">{nextStep}</span>
          </section>
        )}

        {status !== "done" && <Decisions projectId={id} decisions={openDecisions} />}

        <section className="flex flex-col gap-2">
          <h3 className={sectionHeading}>HISTORIAL</h3>
          {log.length > 0 ? (
            <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.4]">
              {log.map(({ id: sessionId, endedAt, outcome, source }) => (
                <li key={sessionId} className="flex gap-2.5">
                  <span className="w-[50px] shrink-0 font-display font-semibold text-muted">
                    {endedAt && formatShortDate(endedAt)}
                  </span>
                  <span>
                    {outcome}
                    {source === "claude_code" && <span className="text-muted"> · Claude Code</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Todavía no hay partidas terminadas.</p>
          )}
        </section>

        <div className="grow" />

        {hasOpenSession ? (
          <Link href={`/p/${id}/sesion`} className={primaryButton}>
            <Play size={16} fill="currentColor" strokeWidth={2} aria-hidden />
            Volver a la partida
          </Link>
        ) : (
          isActive &&
          mission && (
            <ActionForm action={startSessionAction.bind(null, id)}>
              <button type="submit" className={primaryButton}>
                <Play size={16} fill="currentColor" strokeWidth={2} aria-hidden />
                Jugar sesión
              </button>
            </ActionForm>
          )
        )}

        {status === "parked" && (
          <ActionForm action={activateProjectAction.bind(null, id)}>
            <button type="submit" className={primaryButton}>
              <Play size={16} fill="currentColor" strokeWidth={2} aria-hidden />
              Activar partida
            </button>
          </ActionForm>
        )}

        {isActive && (
          <ActionForm action={parkProjectAction.bind(null, id)}>
            <button type="submit" className={quietButton}>
              Mandar a la banca
            </button>
          </ActionForm>
        )}
      </main>
    </>
  );
}

export default function ProjectPage({ params, searchParams }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<main className="grow" aria-busy />}>
      <ProjectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
