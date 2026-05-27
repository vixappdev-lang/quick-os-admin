import { Banknote, CreditCard, FileText, HandCoins, QrCode, Receipt, ReceiptText, WalletCards, ArrowRightLeft } from "lucide-react";
import type { ComponentType } from "react";

export type PaymentMethod =
  | "pix"
  | "dinheiro"
  | "nota_promissoria"
  | "cheque"
  | "debito"
  | "credito"
  | "fiado"
  | "outro";

export interface PagamentoMeta {
  id: PaymentMethod;
  label: string;
  short: string;
  icon: ComponentType<{ className?: string }>;
}

export const PAGAMENTO_META: Record<PaymentMethod, PagamentoMeta> = {
  pix:              { id: "pix",              label: "PIX",              short: "PIX",   icon: QrCode },
  dinheiro:         { id: "dinheiro",         label: "Dinheiro",         short: "Dinh.", icon: Banknote },
  nota_promissoria: { id: "nota_promissoria", label: "Nota promissória", short: "Nota",  icon: FileText },
  cheque:           { id: "cheque",           label: "Cheque",           short: "Cheq.", icon: Receipt },
  debito:           { id: "debito",           label: "Cartão Débito",    short: "Déb.",  icon: WalletCards },
  credito:          { id: "credito",          label: "Cartão Crédito",   short: "Créd.", icon: CreditCard },
  fiado:            { id: "fiado",            label: "Nota promissória", short: "Nota",  icon: FileText },
  outro:            { id: "outro",            label: "Outro",            short: "Outro", icon: ArrowRightLeft },
};

export const PAGAMENTO_LIST: PagamentoMeta[] = [
  PAGAMENTO_META.pix,
  PAGAMENTO_META.dinheiro,
  PAGAMENTO_META.nota_promissoria,
  PAGAMENTO_META.cheque,
  PAGAMENTO_META.debito,
  PAGAMENTO_META.credito,
  PAGAMENTO_META.outro,
];

export function pagamentoLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return (PAGAMENTO_META as any)[id]?.label ?? id;
}

export function pagamentoIcon(id: string | null | undefined) {
  if (!id) return ReceiptText;
  return (PAGAMENTO_META as any)[id]?.icon ?? ReceiptText;
}