import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at `/manifest.webmanifest`). Next injects the
 * `<link rel="manifest">` automatically. A single SVG icon covers every size
 * (`sizes: "any"`); a `maskable` entry lets Android crop it to its icon shape.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MattNotes",
    short_name: "MattNotes",
    description:
      "Appunti per studenti STEM: tipografia LaTeX, canvas Apple Pencil, codice Python e AI in locale.",
    lang: "it",
    // Installed app opens straight into the workspace, not the marketing page.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#1c1917",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
