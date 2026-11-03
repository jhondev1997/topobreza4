import Link from "next/link";
import { secondaryButton } from "@/components/styles";

export default function NotFound() {
  return (
    <main className="flex grow flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-[30px] leading-none font-bold uppercase">No existe</h1>
      <p className="text-sm text-text-2">Esta página no existe o el proyecto ya no está.</p>
      <Link href="/" className={secondaryButton}>
        Volver al inicio
      </Link>
    </main>
  );
}
