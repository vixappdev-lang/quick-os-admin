import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "quickos-theme";

type Ctx = { theme: ThemeMode; resolved: "light" | "dark"; setTheme: (t: ThemeMode) => void; cycle: () => void };
const ThemeCtx = createContext<Ctx | null>(null);

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem(KEY) : null) as ThemeMode | null;
    const initial: ThemeMode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setThemeState(initial);
    const r = resolve(initial);
    setResolved(r);
    apply(r);
  }, []);

  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { const r = resolve("system"); setResolved(r); apply(r); };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch {}
    const r = resolve(t);
    setResolved(r);
    apply(r);
  };

  const cycle = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme, cycle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}