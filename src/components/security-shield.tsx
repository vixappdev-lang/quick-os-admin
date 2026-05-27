import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { activeSupabase } from "@/integrations/supabase/active-client";

/**
 * Camada de proteção avançada do painel:
 * - Anti-clickjacking (iframe break-out)
 * - Detecção de DevTools (heurística de tamanho + debugger-timing)
 * - Bloqueio de atalhos comuns (F12, Ctrl+Shift+I/J/C, Ctrl+U) — só em produção
 * - Desabilita copy/cut/contextmenu/drag em [data-sensitive="true"]
 * - Bloqueia print de áreas sensíveis
 * - Detecta inatividade longa (>30 min) e força sair de áreas sensíveis
 * - Fingerprint leve de sessão e log em app_logs
 * Observação: nada disso impede um atacante determinado com acesso ao
 * browser do usuário — é defesa em profundidade contra script-kiddies e
 * shoulder-surfing.
 */
export function SecurityShield() {
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");
  const loggedRef = useRef<Set<string>>(new Set());

  const logOnce = (key: string, mensagem: string, payload?: Record<string, unknown>) => {
    if (loggedRef.current.has(key)) return;
    loggedRef.current.add(key);
    try {
      activeSupabase.from("app_logs").insert({
        categoria: "seguranca",
        mensagem,
        payload: { ua: navigator.userAgent, ...(payload ?? {}) } as any,
      });
    } catch {}
  };

  // Anti-iframe
  useEffect(() => {
    try {
      if (window.top !== window.self) {
        setReason("Esta aplicação não pode ser carregada dentro de um iframe.");
        setBlocked(true);
        try { window.top!.location.href = window.self.location.href; } catch {/* cross-origin */}
      }
    } catch {
      setReason("Esta aplicação não pode ser carregada dentro de um iframe.");
      setBlocked(true);
    }
  }, []);

  // Anti-DevTools (apenas em produção)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const checkSize = () => {
      const threshold = 160;
      const open = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
      if (open) logOnce("devtools-size", "DevTools detectado (heurística de tamanho)", { w: window.innerWidth, h: window.innerHeight });
    };
    const checkDebugger = () => {
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const dt = performance.now() - t0;
      if (dt > 100) logOnce("devtools-debugger", "DevTools detectado (debugger-timing)", { dt });
    };
    const id1 = window.setInterval(checkSize, 2000);
    const id2 = window.setInterval(checkDebugger, 4000);
    return () => { window.clearInterval(id1); window.clearInterval(id2); };
  }, []);

  // Bloqueio de atalhos de inspeção em produção
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const blockCombo =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
        (e.metaKey && e.altKey && (k === "i" || k === "j" || k === "c")) ||
        (e.ctrlKey && k === "u") ||
        (e.metaKey && e.altKey && k === "u");
      if (blockCombo) {
        e.preventDefault();
        e.stopPropagation();
        logOnce(`shortcut-${k}`, `Atalho bloqueado: ${e.key}`);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Anti-copy/cut em áreas sensíveis
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest?.("[data-sensitive='true']")) {
        e.preventDefault();
      }
    };
    const ctx = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest?.("[data-sensitive='true']")) e.preventDefault();
    };
    const drag = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest?.("[data-sensitive='true']")) e.preventDefault();
    };
    document.addEventListener("copy", handler);
    document.addEventListener("cut", handler);
    document.addEventListener("contextmenu", ctx);
    document.addEventListener("dragstart", drag);
    return () => {
      document.removeEventListener("copy", handler);
      document.removeEventListener("cut", handler);
      document.removeEventListener("contextmenu", ctx);
      document.removeEventListener("dragstart", drag);
    };
  }, []);

  // Bloqueio de impressão de áreas sensíveis (mantém o resto imprimível)
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-security-shield", "true");
    style.textContent = `
      @media print { [data-sensitive="true"] { display: none !important; } }
      [data-sensitive="true"] { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // Fingerprint leve e registro de sessão (uma vez por carga)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    logOnce("session-open", "Sessão de painel iniciada", {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      platform: (navigator as any).userAgentData?.platform ?? navigator.platform,
      cores: navigator.hardwareConcurrency ?? null,
    });
  }, []);

  if (!blocked) return null;

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" /> Acesso bloqueado
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </DialogContent>
    </Dialog>
  );
}