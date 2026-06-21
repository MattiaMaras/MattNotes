import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers/providers";
import { ThemeNoFlashScript } from "@/components/providers/theme-provider";

// Inter for UI, JetBrains Mono for code and LaTeX source (per design spec).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MattNotes",
  description:
    "Editor di appunti per studenti STEM: tipografia LaTeX, canvas Apple Pencil e organizzazione a blocchi.",
  applicationName: "MattNotes",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  // Lets iPadOS/iOS run the installed app full-screen with a titled launch.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MattNotes",
  },
};

// iPad-first: lock the viewport so the canvas/editor behave like a native app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the no-flash head script sets `class`/`style`
    // on <html> before React hydrates, which would otherwise trip the warning.
    <ClerkProvider>
      <html
        lang="it"
        suppressHydrationWarning
        className={cn("h-full", inter.variable, jetbrainsMono.variable)}
      >
        <head>
          {/* Applies the persisted theme class before first paint (no flash,
              no client-side script re-render). See ThemeNoFlashScript. */}
          <ThemeNoFlashScript />
        </head>
        <body className="min-h-full bg-background font-sans text-foreground antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
