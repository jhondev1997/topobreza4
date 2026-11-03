import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "[NOMBRE DE LA APP]",
  description: "Avance de proyectos personales con Claude Code",
  appleWebApp: { capable: true, title: "[NOMBRE]", statusBarStyle: "black" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-PE"
      className={`${chakraPetch.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
