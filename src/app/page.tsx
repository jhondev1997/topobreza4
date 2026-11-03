import { ChevronRight, Play, Plus } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Freshness } from "@/components/Freshness";
import { CoolingBar, ObjectiveBar } from "@/components/ProgressBars";
import { secondaryButton, sectionLabel } from "@/components/styles";
import { db } from "@/db/client";
import { COOLING_WARNING_DAYS, coolingPercent, getHomeOverview } from "@/server/overview";
import { isoWeekNumber } from "@/server/time";

type ActiveProject = Awaited<ReturnType<typeof getHomeOverview>>["active"][number];

function ProjectCard({ project }: { project: ActiveProject }) {
  const { id, name, daysSinceSession, lastSessionAt, mission, nextStep, hasOpenSession } = project;
  const cooling = daysSinceSession >= COOLING_WARNING_DAYS;

  return (
    <Link
      href={hasOpenSession ? `/p/${id}/sesion` : `/p/${id}`}
      className={`clip-card focus-inset flex flex-col gap-3.5 border p-[18px] text-text ${
        cooling ? "border-warn-line bg-warn-panel" : "border-panel-line bg-panel"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[22px] font-bold uppercase">{name}</h2>
        <Freshness days={daysSinceSession} hasSessions={lastSessionAt !== null} />
      </div>

      {cooling && (
        <div className="flex flex-col gap-1.5">
          <CoolingBar percent={coolingPercent(daysSinceSession)} />
          <span className="text-xs text-warn-muted">Se está enfriando</span>
        </div>
      )}

      {mission ? (
        <>
          <div className="flex flex-col gap-1">
            <span className={sectionLabel}>MISIÓN ACTUAL</span>
            <span className="text-[17px] font-semibold">{mission.title}</span>
          </div>
          <ObjectiveBar
            total={mission.criteria.length}
            done={mission.criteria.filter(({ done }) => done).length}
          />
          <div className="flex items-center justify-between gap-3 border-t border-panel-line pt-3">
            <span className="text-[13px] leading-[1.4] text-text-2">
              {nextStep ? `Siguiente: ${nextStep}` : "Aún sin siguiente movimiento"}
            </span>
            <span className="clip-chip flex min-h-10 shrink-0 items-center gap-1.5 bg-lime px-3.5 font-display text-sm font-bold text-bg uppercase">
              <Play size={12} fill="currentColor" strokeWidth={2} aria-hidden />
              {hasOpenSession ? "En partida" : "Jugar"}
            </span>
          </div>
        </>
      ) : (
        <span className="text-sm font-semibold text-warn-text">
          Sin misión definida. Elige una o estaciónalo.
        </span>
      )}
    </Link>
  );
}

async function HomeContent() {
  await connection();
  const now = new Date();
  const { active, parked, closedThisWeek } = await getHomeOverview(db, now);

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-5 pt-[26px] pb-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-xs font-semibold tracking-[0.18em] text-lime">
            SEMANA {isoWeekNumber(now)}
          </span>
          <h1 className="font-display text-[30px] leading-none font-bold tracking-[0.01em] uppercase">
            {active.length} {active.length === 1 ? "partida" : "partidas"}
            <br />
            en curso
          </h1>
        </div>
        <div className="flex flex-col items-end gap-0.5 border border-panel-line px-3 py-2 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]">
          <span className="font-display text-[26px] leading-none font-bold text-lime">{closedThisWeek}</span>
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted">
            {closedThisWeek === 1 ? "SESIÓN" : "SESIONES"}
          </span>
        </div>
      </header>

      <main className="flex grow flex-col gap-3.5 px-4 pt-1 pb-4">
        {active.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {parked.length > 0 && (
          <Link
            href="/ideas"
            className="focus-inset flex min-h-12 items-center justify-between gap-2 border border-dashed border-panel-line px-4 text-sm text-muted"
          >
            <span>
              <span className="font-semibold text-text">En banca ({parked.length}):</span>{" "}
              {parked.map(({ name }) => name).join(", ")}
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0" aria-hidden />
          </Link>
        )}

        <div className="grow" />

        <Link href="/ideas" className={secondaryButton}>
          <Plus size={18} strokeWidth={2.4} aria-hidden />
          Anotar idea
        </Link>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<main className="grow" aria-busy />}>
        <HomeContent />
      </Suspense>
      <BottomNav current="/" />
    </>
  );
}
