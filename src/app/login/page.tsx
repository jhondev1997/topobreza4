import { Suspense } from "react";
import { input, primaryButton, sectionHeading } from "@/components/styles";

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="text-sm font-semibold text-warn-text">
      Esa clave no es correcta.
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex grow flex-col justify-center gap-5 px-4 pb-16">
      <div className="flex flex-col gap-1.5 px-1">
        <span className="font-display text-xs font-bold tracking-[0.18em] text-lime">SOLO PARA TI</span>
        <h1 className="font-display text-[30px] leading-none font-bold uppercase">Entrar</h1>
      </div>
      <form method="post" action="/api/login" className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className={sectionHeading}>CLAVE</span>
          <input
            type="password"
            name="passcode"
            required
            autoFocus
            autoComplete="current-password"
            className={input}
          />
        </label>
        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <button type="submit" className={primaryButton}>
          Entrar
        </button>
      </form>
    </main>
  );
}
