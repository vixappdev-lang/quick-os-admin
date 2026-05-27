import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles, ShoppingCart, FileBarChart, Settings2, ArrowRight, Check } from "lucide-react";

/**
 * Modal de boas-vindas bloqueante — só aparece no primeiro acesso do admin.
 * Backdrop com blur, sem botão fechar, slider 4 steps com Próximo/Concluir.
 */
export function WelcomeOnboarding() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (data && !(data as any).onboarding_completed_at) setOpen(true);
    })();
  }, [ready, user]);

  if (!open) return null;

  const steps = [
    {
      icon: Sparkles,
      title: `Bem-vindo, ${user?.name?.split(" ")[0] ?? "Administrador"}!`,
      body: "Este é seu sistema completo de gestão — vendas, estoque, NF-e, financeiro e relatórios, tudo em um só lugar.",
    },
    {
      icon: ShoppingCart,
      title: "Como funciona o dia a dia",
      body: "Você cadastra produtos e clientes, registra pedidos no PDV ou em Novo Pedido, recebe pagamentos e o estoque atualiza sozinho. Vendedores podem criar pedidos por celular.",
    },
    {
      icon: FileBarChart,
      title: "Recursos avançados",
      body: "Importe XML de NF-e, emita notas pela nfe.io, gere chaves de API para integrações, acompanhe relatórios por período/vendedor e exporte dados quando precisar.",
    },
    {
      icon: Settings2,
      title: "Antes de começar: configure sua empresa",
      body: "Para emitir notas, faturar pedidos e personalizar o sistema, é obrigatório preencher razão social, CNPJ, IE, endereço, telefone e e-mail em Configurações → Empresa.",
    },
  ];

  const isLast = step === steps.length - 1;
  const Icon = steps[step].icon;

  const concluir = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() } as any)
        .eq("id", user.id);
      setOpen(false);
      navigate({ to: "/configuracoes" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl">
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug">{steps[step].title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{steps[step].body}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-3">
          <span className="text-xs text-muted-foreground">Passo {step + 1} de {steps.length}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
              >
                Voltar
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
              >
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={concluir}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Configurar empresa"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}