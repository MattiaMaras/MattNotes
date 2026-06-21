"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Minimal theme provider tailored to Next.js 16 + this stricter React 19.2.
 *
 * We deliberately avoid `next-themes`: its no-flash mechanism renders a
 * `<script>` from inside a Client Component, which React 19.2 flags
 * ("Scripts inside React components are never executed when rendering on the
 * client"). Instead, the no-flash class is applied by an inline script in the
 * server-rendered `<head>` (see `ThemeNoFlashScript`), and this provider only
 * manages React-side state. The `useTheme()` surface mirrors next-themes so
 * consumers don't change.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
}

/**
 * Inline script for the document `<head>`. Rendered by the server-only
 * RootLayout, so it ships in the initial HTML and runs during parsing — before
 * first paint and before React hydrates — with no client-side re-render.
 */
export function ThemeNoFlashScript() {
  const js = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(readStored()),
  );

  const apply = useCallback((r: ResolvedTheme) => {
    const el = document.documentElement;
    el.classList.toggle("dark", r === "dark");
    el.style.colorScheme = r;
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable (private mode); theme just won't persist.
      }
      const r = resolve(next);
      setResolvedTheme(r);
      apply(r);
    },
    [apply],
  );

  // Keep the resolved theme in sync after hydration and when the OS theme
  // changes while on "system".
  useEffect(() => {
    const r = resolve(theme);
    setResolvedTheme(r);
    apply(r);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nr = systemTheme();
      setResolvedTheme(nr);
      apply(nr);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, apply]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
