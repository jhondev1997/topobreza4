import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { primaryButton } from "@/components/styles";
import { db } from "@/db/client";
import { generateBrief } from "@/server/brief";
import { getOpenSessionOverview } from "@/server/overview";
import { formatTime } from "@/server/time";
import { AutoRefresh } from "./AutoRefresh";
import { BriefPanel } from "./BriefPanel";
import { SessionTimer } from "./SessionTimer";
import { TangentForm } from "./TangentForm";

async function SessionContent({ params }: { params: PageProps<"/p/[id]/sesion">["params"] }) {
  await connection();
  const now = new Date();
  const { id } = await params;
  const overview = await getOpenSessionOverview(db, id);
  if (!overview) redirect(`/p/${id}`);

  const { session, projectName, missionTitle } = overview;
  const brief = session.briefSnapshot ?? (await generateBrief(db, id));

  return (
    <>
      <header className="flex flex-col gap-1 pt-3 pr-5 pb-2 pl-2">
        <div className="flex items-center gap-1">
          <Link
            href={`/p/${id}`}
            aria-label="Volver al proyecto"
            className="focus-inset flex size-11 shrink-0 items-center justify-center text-text"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </Link>
          <h1 className="font-display text-xs font-bold tracking-[0.18em] text-lime uppercase">
            En partida · {projectName}
          </h1>
        </div>
        <div className="flex flex-col gap-1 pl-3">
          <SessionTimer startedAt={session.startedAt.getTime()} serverNow={now.getTime()} />
          {missionTitle && <span className="text-base font-semibold text-text-2">Misión: {missionTitle}</span>}
        </div>
      </header>

      <main className="flex grow flex-col gap-3 px-4 pt-3 pb-6">
        <AutoRefresh />

        {session.briefReadAt ? (
          <div className="flex items-center gap-2.5 border border-ok-line bg-ok-panel px-3.5 py-3">
            <span className="size-2.5 shrink-0 rotate-45 bg-ok" aria-hidden />
            <span className="text-[13px] leading-[1.4]">
              Claude Code leyó el brief vía MCP a las {formatTime(session.briefReadAt)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 border border-panel-line bg-panel px-3.5 py-3">
            <span className="size-2.5 shrink-0 rotate-45 bg-check-empty" aria-hidden />
            <span className="text-[13px] leading-[1.4]">Brief sin leer por Claude Code</span>
          </div>
        )}

        <BriefPanel brief={brief} />

        <div className="grow" />

        <TangentForm projectId={id} />

        <Link href={`/p/${id}/cierre`} className={primaryButton}>
          Terminar partida
        </Link>
      </main>
    </>
  );
}

export default function SessionPage({ params }: PageProps<"/p/[id]/sesion">) {
  return (
    <div className="bg-session-lines flex grow flex-col">
      <div className="h-[3px] bg-lime" />
      <Suspense fallback={<main className="grow" aria-busy />}>
        <SessionContent params={params} />
      </Suspense>
    </div>
  );
}
