import { COOLING_WARNING_DAYS } from "@/server/overview";

export function Freshness({ days, hasSessions }: { days: number; hasSessions: boolean }) {
  if (days >= COOLING_WARNING_DAYS) {
    return (
      <span className="shrink-0 font-display text-[13px] font-bold text-warn">−{days} DÍAS</span>
    );
  }
  if (!hasSessions) {
    return <span className="shrink-0 text-xs font-semibold text-muted">sin sesiones</span>;
  }
  const label = days === 0 ? "hoy" : days === 1 ? "hace 1 día" : `hace ${days} días`;
  return <span className="shrink-0 text-xs font-semibold text-ok">{label}</span>;
}
