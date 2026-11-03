import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "[NOMBRE]",
    short_name: "[NOMBRE]",
    description: "Avance de proyectos personales con Claude Code",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E14",
    theme_color: "#0B0E14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
