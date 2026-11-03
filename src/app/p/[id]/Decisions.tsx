import { ChevronRight } from "lucide-react";
import { ActionForm } from "@/components/ActionForm";
import { input, sectionHeading } from "@/components/styles";
import { addDecisionAction, answerDecisionAction } from "./actions";

const smallButton =
  "focus-inset min-h-12 shrink-0 border border-line-strong px-3 font-display text-[13px] font-bold tracking-[0.06em] text-text uppercase";

export function Decisions({
  projectId,
  decisions,
}: {
  projectId: string;
  decisions: { id: string; question: string }[];
}) {
  return (
    <section id="decisiones" className="flex scroll-mt-4 flex-col gap-2">
      <h3 className={sectionHeading}>DECISIONES ABIERTAS ({decisions.length})</h3>
      {decisions.length > 0 && (
        <ul className="flex flex-col divide-y divide-panel-line border border-panel-line bg-panel">
          {decisions.map(({ id, question }) => (
            <li key={id}>
              <details className="group">
                <summary className="focus-inset flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3.5 py-3 text-sm">
                  {question}
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-muted group-open:rotate-90"
                    aria-hidden
                  />
                </summary>
                <div className="px-3.5 pb-3.5">
                  <ActionForm action={answerDecisionAction.bind(null, id)}>
                    <div className="flex gap-2">
                      <label className="min-w-0 grow">
                        <span className="sr-only">Respuesta a: {question}</span>
                        <input name="answer" required placeholder="Tu respuesta" className={input} />
                      </label>
                      <button type="submit" className={smallButton}>
                        Responder
                      </button>
                    </div>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addDecisionAction.bind(null, projectId)}>
        <div className="flex gap-2">
          <label className="min-w-0 grow">
            <span className="sr-only">Nueva decisión</span>
            <input name="question" required placeholder="Nueva pregunta por decidir" className={input} />
          </label>
          <button type="submit" className={smallButton}>
            Agregar
          </button>
        </div>
      </ActionForm>
    </section>
  );
}
