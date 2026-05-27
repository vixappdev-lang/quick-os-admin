import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/15 text-warning ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-info/10 text-info ring-info/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary/10 text-primary ring-primary/20",
} as const;

export type Tone = keyof typeof tones;

export function StatusBadge({ status, tone = "neutral", dot = true }: { status: string; tone?: Tone; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize", tones[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["concluído", "entregue", "pago", "ativo", "ativa", "importada", "aberto", "vip", "entrada"].includes(s)) return "success";
  if (["pendente", "em aberto", "aguardando", "preparando", "em preparo", "fechando", "em rota"].includes(s)) return "warning";
  if (["cancelado", "atrasada", "inadimplente", "divergência", "inativo", "perda"].includes(s)) return "danger";
  if (["saída", "ajuste"].includes(s)) return "info";
  return "neutral";
}

// Tom específico para o fluxo de pedidos (kanban)
export function pedidoStatusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "pendente") return "warning";
  if (s === "autorizado") return "info";
  if (s === "separacao") return "primary";
  if (s === "conferencia") return "primary";
  if (s === "concluido" || s === "concluído") return "success";
  if (s === "cancelado" || s === "reprovado") return "danger";
  if (s === "encerrado") return "neutral";
  if (s === "faturamento") return "primary";
  return statusTone(status);
}

export const PEDIDO_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  autorizado: "Autorizado",
  separacao: "Separação",
  conferencia: "Conferência",
  faturamento: "Faturamento",
  concluido: "Finalizado",
  cancelado: "Cancelado",
  encerrado: "Encerrado",
};