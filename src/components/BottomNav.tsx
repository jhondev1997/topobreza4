import { CalendarCheck, Home, Lightbulb } from "lucide-react";
import Link from "next/link";

const items = [
  { href: "/", label: "Inicio", Icon: Home },
  { href: "/ideas", label: "Ideas", Icon: Lightbulb },
  { href: "/revision", label: "Revisión", Icon: CalendarCheck },
] as const;

export function BottomNav({ current }: { current: (typeof items)[number]["href"] }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 grid grid-cols-3 border-t border-nav-line bg-nav-bg px-2 pt-1.5 pb-[22px]"
    >
      {items.map(({ href, label, Icon }) => {
        const isCurrent = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`focus-inset flex min-h-12 flex-col items-center justify-center gap-1 font-display text-xs tracking-[0.08em] uppercase ${
              isCurrent ? "font-bold text-lime" : "font-semibold text-muted"
            }`}
          >
            <Icon size={22} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
