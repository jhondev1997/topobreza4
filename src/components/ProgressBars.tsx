export function ObjectiveBar({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid grow gap-1"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-2.5 -skew-x-20 transition-colors duration-200 motion-reduce:transition-none ${
              index < done ? "bg-lime" : "bg-panel-line"
            }`}
          />
        ))}
      </div>
      <span className="font-display text-[15px] font-bold">
        {done}/{total}
        <span className="sr-only"> objetivos cumplidos</span>
      </span>
    </div>
  );
}

export function CoolingBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 bg-warn-track" aria-hidden>
      <div className="h-1.5 bg-warn" style={{ width: `${percent}%` }} />
    </div>
  );
}
