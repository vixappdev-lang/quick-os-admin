import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

/**
 * Modal de reautenticação para áreas/operações sensíveis (backup, exclusão em massa,
 * troca de credenciais). Exige senha atual antes de prosseguir.
 */
export function ReauthDialog({
  open,
  onOpenChange,
  reason,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason: string;
  onConfirmed: () => void;
}) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) {
        toast.error("Senha incorreta.");
        setPassword("");
      } else {
        onOpenChange(false);
        setPassword("");
        onConfirmed();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao reautenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); if (!o) setPassword(""); }}>
      <DialogContent className="sm:max-w-sm" data-sensitive="true">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Confirmar identidade</DialogTitle>
        </DialogHeader>
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-xs text-muted-foreground">{reason}</p>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Senha atual</label>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={loading || !password} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}