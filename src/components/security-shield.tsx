import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { activeSupabase } from "@/integrations/supabase/active-client";

/**
 * Camada de proteção do painel:
 * - Bloqueia renderização em iframe (anti-clickjacking).
 * - Detecta abertura do DevTools (em produção) e registra evento em app_logs.
 * - Desabilita atalhos de gravação de cópia/print em áreas marcadas com [data-sensitive].
 * - Bloqueia impressão da página inteira (CSS via tag style).
 */
export function SecurityShield() {
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState("");

  // Anti-iframe
  useEffect(() => {
    try {
      if (window.top !== window.self) {
        setReason("Esta aplicação não pode ser carregada dentro de um iframe.");
        setBlocked(true);
        try { window.top!.location = window.self.location; } catch {/* cross-origin */}
      }
    } catch {
      setReason("Esta aplicação não pode ser carregada dentro de um iframe.");
      setBlocked(true);
    }
  }, []);

  // Anti-DevTools (apenas em produção)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    let warned = false;
    const check = () => {
      const threshold = 160;
      const open = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
      if (open && !warned) {
        warned = true;
        try {
          activeSupabase.from("app_logs").insert({
            categoria: "seguranca",
            mensagem: "DevTools aberto detectado",
            payload: { ua: navigator.userAgent, w: window.innerWidth, h: window.innerHeight } as any,
          });
        } catch {}
      }
    };
    const id = window.setInterval(check, 2000);
    return () => window.clearInterval(id);
  }, []);

  // Anti-copy/cut em áreas sensíveis
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest?.("[data-sensitive='true']")) {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", handler);
    document.addEventListener("cut", handler);
    return () => {
      document.removeEventListener("copy", handler);
      document.removeEventListener("cut", handler);
    };
  }, []);

  // Bloqueio de impressão de áreas sensíveis (mantém o resto imprimível)
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-security-shield", "true");
    style.textContent = `@media print { [data-sensitive="true"] { display: none !important; } }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
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