import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActionForm } from "@/components/ActionForm";
import { BottomNav } from "@/components/BottomNav";
import { secondaryButton } from "@/components/styles";
import { db } from "@/db/client";
import { COOLING_WARNING_DAYS } from "@/server/overview";
import { getWeeklyReport } from "@/server/reviews";
import { formatLongDate, formatShortDate } from "@/server/time";
import {
  closeReviewAction,
  discardIdeaAction,
  postponeIdeaAction,
  promoteIdeaAction,
} from "../ideas/actions";
import { parkProjectAction } from "../p/[id]/actions";

const stepHeading = "font-display text-xs font-bold tracking-[0.14em]";
const reportButton =
  "focus-inset flex min-h-11 w-full items-center justify-center px-2 font-display text-[13px] font-bold tracking-[0.04em] uppercase";
const limeButton = `${reportButton} focus-inset-dark bg-lime text-bg hover:bg-lime-hover`;
const warnOutlineButton = `${reportButton} border border-warn-line text-text`;
const outlineButton = `${reportButton} border border-line-strong text-text`;

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

async function ReportContent() {
  await connection();
  const now = new Date();
  const { closedSessions, metCriteria, cooling, dueIdeas, hasFreeSlot, openDecisions, lastReviewAt } =
    await getWeeklyReport(db, now);

  const metSummary = metCriteria.map(
    ({ projectName, met }) => `+${met} ${plural(met, "objetivo", "objetivos")} en ${projectName}`,
  );

  return (
    <>
      <header className="flex flex-col gap-1.5 px-5 pt-[26px] pb-3">
        <span className="font-display text-xs font-bold tracking-[0.18em] text-lime">
          {formatLongDate(now)} · 5 MIN
        </span>
        <h1 className="font-display text-[30px] leading-none font-bold uppercase">Reporte semanal</h1>
        {lastReviewAt && (
          <span className="text-xs text-muted">Último reporte: {formatShortDate(lastReviewAt).toLowerCase()}</span>
        )}
      </header>

      <main className="flex grow flex-col gap-3 px-4 pt-1 pb-4">
        <section className="clip-card flex items-center gap-4 border border-panel-line bg-panel p-4">
          <span className="font-display text-[52px] leading-[0.9] font-bold text-lime">{closedSessions}</span>
          <div className="flex flex-col gap-1">
            <h2 className={`${stepHeading} text-muted`}>1 · LO QUE SE CERRÓ</h2>
            <span className="text-sm leading-[1.4]">
              {[plural(closedSessions, "sesión", "sesiones"), ...metSummary].join(" · ")}
            </span>
          </div>
        </section>

        <section
          className={`clip-card flex flex-col gap-3 border p-4 ${
            cooling.length > 0 ? "border-warn-line bg-warn-panel" : "border-panel-line bg-panel"
          }`}
        >
          <h2 className={`${stepHeading} ${cooling.length > 0 ? "text-warn-muted" : "text-muted"}`}>
            2 · LO QUE SE ENFRÍA
          </h2>
          {cooling.length === 0 && <p className="text-sm text-text-2">Nada se está enfriando.</p>}
          {cooling.map(({ id, name, days, hasMission }) => (
            <div key={id} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[22px] font-bold uppercase">{name}</span>
                {days >= COOLING_WARNING_DAYS && (
                  <span className="shrink-0 font-display text-[15px] font-bold text-warn">−{days} DÍAS</span>
                )}
              </div>
              {!hasMission && <span className="text-[13px] text-warn-text">Sin misión definida</span>}
              <div className={`grid gap-2 ${hasMission ? "grid-cols-3" : "grid-cols-2"}`}>
                <Link href={`/p/${id}`} className={limeButton}>
                  Retomar
                </Link>
                {hasMission && (
                  <Link href={`/p/${id}?recortar=1#mision`} className={warnOutlineButton}>
                    Recortar
                  </Link>
                )}
                <ActionForm action={parkProjectAction.bind(null, id)}>
                  <button type="submit" className={warnOutlineButton}>
                    A banca
                  </button>
                </ActionForm>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2.5 border border-panel-line bg-panel p-4">
          <h2 className={`${stepHeading} text-muted`}>3 · ¿ALGUNA IDEA MERECE CUPO?</h2>
          {dueIdeas.length === 0 && <p className="text-sm text-text-2">No hay ideas por revisar hoy.</p>}
          {dueIdeas.map(({ id, text, projectName }) => (
            <div key={id} className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm leading-[1.4] font-semibold">{text}</span>
                <span className="text-xs text-muted">{projectName ?? "Sin proyecto"}</span>
              </div>
              <div className={`grid gap-2 ${hasFreeSlot ? "grid-cols-3" : "grid-cols-2"}`}>
                <ActionForm action={postponeIdeaAction.bind(null, id)}>
                  <button type="submit" className={outlineButton}>
                    Posponer
                  </button>
                </ActionForm>
                <ActionForm action={discardIdeaAction.bind(null, id)}>
                  <button type="submit" className={outlineButton}>
                    Descartar
                  </button>
                </ActionForm>
                {hasFreeSlot && (
                  <ActionForm action={promoteIdeaAction.bind(null, id)}>
                    <button type="submit" className={limeButton}>
                      Promover
                    </button>
                  </ActionForm>
                )}
              </div>
            </div>
          ))}
          {dueIdeas.length > 0 && !hasFreeSlot && (
            <span className="text-xs text-muted">Cupos llenos: primero saca un proyecto de la cancha.</span>
          )}
        </section>

        {openDecisions.map(({ projectId, projectName, open }) => (
          <Link
            key={projectId}
            href={`/p/${projectId}#decisiones`}
            className="focus-inset flex min-h-12 items-center justify-between gap-2 border border-dashed border-panel-line px-4 text-sm text-muted"
          >
            <span>
              <span className="font-semibold text-text">Decisiones abiertas:</span> {open} en {projectName}
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0" aria-hidden />
          </Link>
        ))}

        <div className="grow" />

        <ActionForm action={closeReviewAction}>
          <button type="submit" className={secondaryButton}>
            Cerrar reporte
          </button>
        </ActionForm>
      </main>
    </>
  );
}

export default function RevisionPage() {
  return (
    <>
      <Suspense fallback={<main className="grow" aria-busy />}>
        <ReportContent />
      </Suspense>
      <BottomNav current="/revision" />
    </>
  );
}
