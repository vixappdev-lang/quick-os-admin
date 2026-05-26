import { formatBRL } from "@/lib/format";
import { PEDIDO_STATUS_LABEL } from "@/components/status-badge";

export function formatEndereco(end: any): string {
  if (!end || typeof end !== "object") return "—";
  const partes = [end.logradouro, end.numero, end.bairro, end.cidade, end.uf, end.cep]
    .map((s) => (s == null ? "" : String(s).trim()))
    .filter((s) => s.length > 0);
  return partes.length ? partes.join(", ") : "—";
}

function escape(s: any): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printEntregas(pedidos: any[]) {
  const now = new Date().toLocaleString("pt-BR");
  const linhas = pedidos.map((p) => {
    const cli = p.cliente ?? {};
    return `<tr>
      <td>${escape(p.numero)}</td>
      <td>${escape(cli.nome ?? "Balcão")}</td>
      <td>${escape(formatEndereco(cli.endereco))}</td>
      <td>${escape(cli.telefone ?? "—")}</td>
      <td style="text-transform:capitalize">${escape(p.origem ?? "—")}</td>
      <td style="text-align:right">${formatBRL(Number(p.total))}</td>
      <td>${escape(PEDIDO_STATUS_LABEL[p.status as keyof typeof PEDIDO_STATUS_LABEL] ?? p.status)}</td>
    </tr>`;
  }).join("");
  const totalGeral = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const html = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>Relação de Entregas</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color:#111; padding:20px; font-size:11px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .sub { color:#555; font-size:11px; margin-bottom:14px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th,td { border:1px solid #c8ced3; padding:6px 8px; vertical-align:top; }
  thead th { background:#f1f3f5; text-align:left; }
  tfoot td { background:#f8f9fa; font-weight:bold; }
  @media print { body { padding:8mm; } }
</style></head><body>
<h1>Relação de Entregas</h1>
<div class="sub">Emitido em ${now} · ${pedidos.length} pedido(s)</div>
<table>
  <thead><tr>
    <th style="width:70px">Pedido</th>
    <th>Cliente</th>
    <th>Endereço</th>
    <th style="width:120px">Telefone</th>
    <th style="width:80px">Origem</th>
    <th style="width:90px;text-align:right">Total</th>
    <th style="width:100px">Status</th>
  </tr></thead>
  <tbody>${linhas || `<tr><td colspan="7" style="text-align:center;color:#888;padding:18px">Sem pedidos</td></tr>`}</tbody>
  <tfoot><tr>
    <td colspan="5" style="text-align:right">TOTAL GERAL</td>
    <td style="text-align:right">${formatBRL(totalGeral)}</td>
    <td></td>
  </tr></tfoot>
</table>
</body></html>`;
  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 200);
}

export function exportEntregasCSV(pedidos: any[]) {
  const head = ["Pedido","Cliente","Endereco","Telefone","Origem","Total","Status"];
  const rows = pedidos.map((p) => {
    const cli = p.cliente ?? {};
    return [
      p.numero,
      cli.nome ?? "Balcão",
      formatEndereco(cli.endereco),
      cli.telefone ?? "",
      p.origem ?? "",
      String(Number(p.total).toFixed(2)).replace(".", ","),
      PEDIDO_STATUS_LABEL[p.status as keyof typeof PEDIDO_STATUS_LABEL] ?? p.status,
    ];
  });
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `entregas-${Date.now()}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}