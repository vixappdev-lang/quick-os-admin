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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* hero */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">{steps[step].title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{steps[step].body}</p>
        </div>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 px-8 pt-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between gap-3 px-8 py-6">
          <span className="text-xs text-muted-foreground">{step + 1} de {steps.length}</span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="h-10 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
              >
                Voltar
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={concluir}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> {saving ? "Salvando..." : "Configurar empresa agora"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}