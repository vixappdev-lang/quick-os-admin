import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "quickos.session";
const VALID_EMAIL = "admin@loja.com";
const VALID_PASSWORD = "admin12";

export interface SessionUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw =
        (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY))) ||
        null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const signIn = async (email: string, password: string, remember: boolean) => {
    await new Promise((r) => setTimeout(r, 450));
    if (email.trim().toLowerCase() !== VALID_EMAIL || password !== VALID_PASSWORD) {
      throw new Error("Credenciais inválidas. Verifique e tente novamente.");
    }
    const session: SessionUser = {
      name: "Carlos Administrador",
      email: VALID_EMAIL,
      role: "Administrador",
      initials: "CA",
    };
    setUser(session);
    const target = remember ? localStorage : sessionStorage;
    target.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
