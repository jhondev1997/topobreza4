import { asc, ne } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActionForm } from "@/components/ActionForm";
import { BottomNav } from "@/components/BottomNav";
import { input, sectionHeading } from "@/components/styles";
import { db } from "@/db/client";
import { project } from "@/db/schema";
import { isDueForReview, listParkedIdeas } from "@/server/ideas";
import { MAX_ACTIVE_PROJECTS } from "@/server/projects";
import { formatShortDate } from "@/server/time";
import { activateProjectAction } from "../p/[id]/actions";
import { parkIdeaAction } from "./actions";

async function BenchContent() {
  await connection();
  const now = new Date();
  const [projects, ideas] = await Promise.all([
    db.select().from(project).where(ne(project.status, "done")).orderBy(asc(project.createdAt), asc(project.name)),
    listParkedIdeas(db),
  ]);
  const activeCount = projects.filter(({ status }) => status === "active").length;
  const parked = projects.filter(({ status }) => status === "parked");
  const hasSlot = activeCount < MAX_ACTIVE_PROJECTS;

  return (
    <>
      <ActionForm action={parkIdeaAction}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="min-w-0 grow">
              <span className="sr-only">Nueva idea</span>
              <input name="text" required placeholder="Anota la idea en una línea" className={input} />
            </label>
            <button
              type="submit"
              aria-label="Guardar idea"
              className="focus-inset-dark flex size-[50px] shrink-0 items-center justify-center bg-lime text-bg [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] hover:bg-lime-hover"
            >
              <Plus size={20} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
          <label>
            <span className="sr-only">Proyecto de la idea (opcional)</span>
            <select name="projectId" defaultValue="" className={input}>
              <option value="">Sin proyecto</option>
              {projects.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </ActionForm>

      <div className="flex items-center gap-3 border border-panel-line bg-panel px-3.5 py-3">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: MAX_ACTIVE_PROJECTS }, (_, index) => (
            <span
              key={index}
              className={`h-2.5 w-[18px] -skew-x-20 ${index < activeCount ? "bg-lime" : "bg-panel-line"}`}
            />
          ))}
        </div>
        <span className="text-[13px] leading-[1.4] text-text-2">
          <strong className="text-text">
            Cupos {activeCount}/{MAX_ACTIVE_PROJECTS}.
          </strong>{" "}
          {hasSlot ? "Hay cupo para subir un proyecto." : "Para subir una idea, saca a un proyecto de la cancha."}
        </span>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeading}>IDEAS ({ideas.length})</h2>
        {ideas.length > 0 ? (
          <ul className="flex flex-col divide-y divide-panel-line border border-panel-line bg-panel">
            {ideas.map(({ id, text, reviewAfter, projectName }) => (
              <li key={id} className="flex flex-col gap-1.5 p-3.5">
                <span className="text-[15px] leading-[1.4] font-semibold">{text}</span>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>{projectName ?? "Sin proyecto"}</span>
                  {isDueForReview(reviewAfter, now) ? (
                    <span className="bg-warn px-2 py-0.5 font-display font-bold tracking-[0.06em] text-bg">
                      REVISAR HOY
                    </span>
                  ) : (
                    reviewAfter && <span>· revisar {formatShortDate(reviewAfter).toLowerCase()}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">Todavía no hay ideas anotadas.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionHeading}>PROYECTOS EN BANCA ({parked.length})</h2>
        {parked.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {parked.map(({ id, name, parkedAt, createdAt }) => (
              <li key={id} className="flex flex-col gap-1">
                <div className="flex min-h-[52px] items-center justify-between gap-2 border border-dashed border-line-strong pr-2">
                  <Link
                    href={`/p/${id}`}
                    className="focus-inset flex min-h-[52px] grow flex-col justify-center gap-0.5 px-3.5 py-1 text-text"
                  >
                    <span className="font-display text-base font-bold uppercase">{name}</span>
                    <span className="text-xs text-muted">
                      desde el {formatShortDate(parkedAt ?? createdAt).toLowerCase()}
                    </span>
                  </Link>
                  {hasSlot && (
                    <ActionForm action={activateProjectAction.bind(null, id)}>
                      <button
                        type="submit"
                        className="clip-chip focus-inset-dark min-h-11 shrink-0 bg-lime px-3.5 font-display text-sm font-bold text-bg uppercase hover:bg-lime-hover"
                      >
                        Activar
                      </button>
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">No hay proyectos en banca.</p>
        )}
      </section>
    </>
  );
}

export default function IdeasPage() {
  return (
    <>
      <header className="flex flex-col gap-1.5 px-5 pt-[26px] pb-3">
        <span className="font-display text-xs font-bold tracking-[0.18em] text-lime">SE ANOTA, NO SE JUEGA</span>
        <h1 className="font-display text-[30px] leading-none font-bold uppercase">La banca</h1>
      </header>
      <main className="flex grow flex-col gap-3.5 px-4 pt-1 pb-4">
        <Suspense fallback={null}>
          <BenchContent />
        </Suspense>
      </main>
      <BottomNav current="/ideas" />
    </>
  );
}
