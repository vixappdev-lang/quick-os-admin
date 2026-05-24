import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Zap, ShieldCheck, BarChart3, Boxes, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar | Quick OS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@loja.com");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      navigate({ to: user.role === "vendedor" ? "/vendedor" : "/" });
    }
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT branding */}
      <div className="relative hidden overflow-hidden bg-[oklch(0.20_0.02_260)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.55_0.18_258/0.25),transparent_55%),radial-gradient(circle_at_80%_90%,oklch(0.62_0.15_230/0.18),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-info/15 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Quick OS</p>
            <p className="text-[11px] uppercase tracking-wider text-white/50">Enterprise Edition</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4 animate-[fade-in_0.6s_ease-out]">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Sistema Operacional</p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              A plataforma que opera sua loja com a velocidade do varejo moderno.
            </h2>
            <p className="text-sm leading-relaxed text-white/60">
              PDV, estoque, financeiro, NF-e e CRM em um sistema único. Projetado para conveniências,
              distribuidoras e adegas que não podem perder tempo.
            </p>
          </div>

          <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm animate-[fade-in_0.7s_ease-out_0.1s_both]">
            <div className="rounded-lg bg-[oklch(0.18_0.02_260)] p-4">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="ml-2 text-[10px] text-white/40">quickos.app/dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Vendas hoje", v: "R$ 18.432", d: "+12.4%", c: "bg-primary/20 text-primary" },
                  { l: "Pedidos", v: "142", d: "+8.1%", c: "bg-info/20 text-info" },
                  { l: "Lucro", v: "R$ 5.821", d: "+14.7%", c: "bg-success/20 text-success" },
                ].map((k, i) => (
                  <div
                    key={k.l}
                    className="rounded-md bg-white/[0.04] p-2.5 animate-[fade-in_0.5s_ease-out_both]"
                    style={{ animationDelay: `${0.25 + i * 0.12}s` }}
                  >
                    <p className="text-[9px] uppercase tracking-wider text-white/40">{k.l}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{k.v}</p>
                    <p className={`mt-0.5 inline-block rounded px-1 text-[9px] ${k.c}`}>{k.d}</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-3 h-16 overflow-hidden rounded-md bg-gradient-to-t from-primary/30 to-transparent">
                <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="qln" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="oklch(0.78 0.16 258)" stopOpacity="0.95" />
                      <stop offset="1" stopColor="oklch(0.78 0.16 230)" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 C25,40 40,20 60,25 C80,30 95,10 120,15 C145,20 165,35 200,18"
                    fill="none"
                    stroke="url(#qln)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeDasharray="280"
                    strokeDashoffset="280"
                    style={{ animation: "qDraw 1.6s ease-out 0.6s forwards" }}
                  />
                </svg>
                <div className="absolute right-2 top-1.5 flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70 backdrop-blur">
                  <TrendingUp className="h-2.5 w-2.5 text-success" /> 7d
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-white/[0.03] px-2 py-1.5 animate-[fade-in_0.5s_ease-out_both]"
                    style={{ animationDelay: `${0.7 + i * 0.1}s` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-[10px] text-white/70">Pedido #1042{i}</span>
                    </div>
                    <span className="tabular text-[10px] text-white/50">R$ {(248 - i * 30).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <style>{`@keyframes qDraw { to { stroke-dashoffset: 0; } }`}</style>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dados criptografados</div>
          <div className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> 99.99% uptime</div>
          <div className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5" /> Multi-loja</div>
        </div>
      </div>

      {/* RIGHT form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <p className="text-base font-semibold tracking-tight">Quick OS</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Entrar na plataforma</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua loja com suas credenciais de operação.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Senha</label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => toast.info("Solicite a redefinição ao administrador.")}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Aguarde..." : "Entrar"}
            </button>

            <div className="rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Acesso de demonstração</p>
              <p>Email: <span className="font-mono text-foreground">admin@loja.com</span></p>
              <p>Senha: <span className="font-mono text-foreground">admin12</span></p>
            </div>
          </form>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            © 2026 Quick OS · <Link to="/" className="hover:text-foreground">Termos</Link> · Privacidade
          </p>
        </div>
      </div>
    </div>
  );
}