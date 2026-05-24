import { formatBRL } from "@/lib/format";

interface Pedido {
  id: string;
  numero: string;
  created_at: string;
  subtotal: number | string;
  desconto: number | string;
  total: number | string;
  pagamento?: string | null;
  observacoes?: string | null;
  cliente?: any;
  vendedor?: any;
  itens?: any[];
}

function fmtDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Romaneio (estilo nota de venda) — usado em janela isolada para impressão.
 * Renderiza o título como "VENDA: <numero>" e preenche dados reais do pedido.
 */
export function buildRomaneioHTML(pedido: Pedido, empresa?: { razao?: string; cnpj?: string }) {
  const cli = pedido.cliente ?? {};
  const end = (cli.endereco ?? {}) as any;
  const itens = pedido.itens ?? [];
  const now = new Date().toLocaleString("pt-BR");
  const linhas = itens.map((it: any, i: number) => `
    <tr>
      <td>${it.produto?.sku ?? "—"}</td>
      <td>${it.produto?.nome ?? "—"}</td>
      <td style="text-align:center">${it.produto?.unidade ?? "UN"}</td>
      <td style="text-align:right">${Number(it.qtd).toLocaleString("pt-BR")}</td>
      <td style="text-align:right">${formatBRL(Number(it.preco_unit))}</td>
      <td style="text-align:right"><strong>${formatBRL(Number(it.total))}</strong></td>
    </tr>`).join("");
  const totalQtd = itens.reduce((s: number, i: any) => s + Number(i.qtd), 0);
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>VENDA ${pedido.numero}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; font-size: 11px; }
  h1 { text-align: center; font-size: 22px; margin: 0 0 16px; letter-spacing: 1px; }
  .section-title { background: #e9ecef; padding: 6px 10px; font-weight: bold; font-size: 12px; border: 1px solid #c8ced3; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; padding: 10px; border: 1px solid #c8ced3; border-top: 0; margin-bottom: 12px; }
  .row { display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: end; padding: 4px 0; }
  .row label { color: #444; font-size: 11px; }
  .row .val { border-bottom: 1px solid #aab; padding-bottom: 2px; min-height: 16px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table th, table td { border: 1px solid #c8ced3; padding: 6px 8px; }
  table thead th { background: #f1f3f5; font-weight: bold; text-align: left; }
  .totals-row td { font-weight: bold; background: #f8f9fa; }
  .obs, .pag { border: 1px solid #c8ced3; padding: 10px; margin-top: 12px; min-height: 50px; font-size: 11px; }
  .ass { margin-top: 28px; text-align: center; font-size: 11px; }
  .ass .line { border-top: 1px solid #444; width: 320px; margin: 0 auto 4px; }
  .footer { margin-top: 18px; display: flex; justify-content: space-between; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 6px; }
  .meta-date { float: right; font-size: 11px; font-weight: normal; }
  @media print { body { padding: 8mm; } }
</style>
</head><body>
<h1>VENDA: ${pedido.numero}</h1>
<div class="section-title">Informações do Cliente <span class="meta-date">${fmtDateTime(pedido.created_at)}</span></div>
<div class="grid">
  <div class="row"><label>Nome:</label><div class="val">${cli.nome ?? "—"}</div></div>
  <div class="row"><label>Fones:</label><div class="val">${cli.telefone ?? "—"}</div></div>
  <div class="row"><label>Fantasia:</label><div class="val">${cli.fantasia ?? "—"}</div></div>
  <div class="row"><label>Vendedor:</label><div class="val">${pedido.vendedor?.nome ?? "—"}</div></div>
  <div class="row"><label>Endereço:</label><div class="val">${end.logradouro ?? "—"}</div></div>
  <div class="row"><label>Comprador:</label><div class="val">${cli.nome ?? "—"}</div></div>
  <div class="row"><label>Bairro:</label><div class="val">${end.bairro ?? "—"}</div></div>
  <div class="row"><label>CEP:</label><div class="val">${end.cep ?? "—"}</div></div>
  <div class="row"><label>Cidade:</label><div class="val">${end.cidade ?? "—"}${end.uf ? " - " + end.uf : ""}</div></div>
  <div class="row"><label>CNPJ/CPF:</label><div class="val">${cli.documento ?? "—"}</div></div>
  <div class="row"><label>E-mail:</label><div class="val">${cli.email ?? "—"}</div></div>
  <div class="row"><label>IE/RG:</label><div class="val">${cli.ie ?? "—"}</div></div>
</div>

<div class="section-title">Descrição dos Itens</div>
<table>
  <thead><tr>
    <th style="width:90px">Ref.</th>
    <th>Produto</th>
    <th style="width:50px;text-align:center">UN</th>
    <th style="width:70px;text-align:right">Qtde.</th>
    <th style="width:100px;text-align:right">Vlr. Unit. (R$)</th>
    <th style="width:110px;text-align:right">Vlr. Total (R$)</th>
  </tr></thead>
  <tbody>
    ${linhas || `<tr><td colspan="6" style="text-align:center;color:#888;padding:18px">Sem itens</td></tr>`}
    <tr class="totals-row">
      <td colspan="3" style="text-align:right">TOTAL</td>
      <td style="text-align:right">${totalQtd}</td>
      <td style="text-align:right">${formatBRL(Number(pedido.subtotal))}*</td>
      <td style="text-align:right">${formatBRL(Number(pedido.total))}</td>
    </tr>
  </tbody>
</table>

<div class="ass"><div class="line"></div>Assinatura do Cliente</div>

<div class="section-title" style="margin-top:14px">Observações</div>
<div class="obs">${pedido.observacoes ?? ""}</div>

<div class="section-title" style="margin-top:14px">Pagamentos</div>
<div class="pag">
  <div><strong>Forma:</strong> ${pedido.pagamento ?? "—"}</div>
  <div><strong>Data:</strong> ${fmtDateTime(pedido.created_at)}</div>
  <div><strong>Valor:</strong> ${formatBRL(Number(pedido.total))}</div>
</div>

<div class="footer">
  <span>Registros: ${itens.length}</span>
  <span>${now}</span>
  <span>${empresa?.razao ?? ""}</span>
</div>
</body></html>`;
}

export function printRomaneio(pedido: Pedido, empresa?: { razao?: string; cnpj?: string }) {
  const html = buildRomaneioHTML(pedido, empresa);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    // Fallback: imprime em iframe escondido
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => { w.focus(); w.print(); }, 200);
  };
}

export function printRomaneios(pedidos: Pedido[], empresa?: { razao?: string; cnpj?: string }) {
  if (!pedidos.length) return;
  const partes = pedidos.map((p) => buildRomaneioHTML(p, empresa));
  // Junta com page-break entre cada
  const combined = partes
    .map((html, i) => html.replace(/<\/body>/, i < partes.length - 1 ? '<div style="page-break-after:always"></div></body>' : "</body>"))
    .map((html) => html.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, ""))
    .join("\n");
  const wrapper = partes[0].replace(/<body[^>]*>[\s\S]*<\/body>/, `<body>${combined}</body>`);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.open();
  w.document.write(wrapper);
  w.document.close();
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 250);
}