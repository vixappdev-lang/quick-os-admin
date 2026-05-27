import { formatBRL, formatDateTime } from "@/lib/format";
import { pagamentoLabel } from "@/lib/pagamento";

/**
 * Gera uma janela de impressão com Nota Fiscal de Consumidor (modelo visual,
 * sem valor fiscal oficial). Estilo profissional, monocromático, compatível
 * com impressoras térmicas e A4.
 */
export function printNotaFiscal(pedido: any, settings: any, pagamentos: any[] = []) {
  if (!pedido) return;
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) {
    alert("Habilite pop-ups para gerar a Nota Fiscal.");
    return;
  }

  const empresa = {
    razao: settings?.empresa_razao ?? "Empresa",
    cnpj: settings?.empresa_cnpj ?? "",
    endereco: settings?.empresa_endereco ?? "",
    telefone: settings?.empresa_telefone ?? "",
    email: settings?.empresa_email ?? "",
  };
  const cli = pedido.cliente;
  const itens = pedido.itens ?? [];
  const pgs = pagamentos.length
    ? pagamentos
    : pedido.pagamento
    ? [{ forma: pedido.pagamento, valor: Number(pedido.total) }]
    : [];

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const numero = pedido.numero ?? `#${String(pedido.id).slice(0, 8).toUpperCase()}`;
  const totalItens = itens.reduce((s: number, i: any) => s + Number(i.qtd ?? 0), 0);

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>NF · ${esc(numero)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff}
  .page{max-width:780px;margin:24px auto;padding:24px;border:1px solid #ddd}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:14px}
  .logo{width:54px;height:54px;border:2px solid #111;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
  h1{font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px}
  .razao{font-size:18px;font-weight:700;margin:0}
  .small{font-size:11px;color:#444;margin:2px 0}
  .right{text-align:right}
  .nfTitle{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#555}
  .nfNumero{font-size:22px;font-weight:800}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:14px}
  .box{border:1px solid #ddd;border-radius:6px;padding:8px 10px}
  .box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{background:#111;color:#fff;text-align:left;padding:7px 8px;font-weight:600;font-size:11px;letter-spacing:.05em}
  tbody td{padding:7px 8px;border-bottom:1px solid #eee}
  tbody tr:nth-child(odd){background:#fafafa}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .totais{margin-top:14px;margin-left:auto;width:300px;font-size:13px}
  .totais .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ddd}
  .totais .row.grand{border-top:2px solid #111;border-bottom:none;padding-top:8px;margin-top:6px;font-weight:800;font-size:16px}
  .pag{margin-top:18px}
  .pag table{width:100%;border:1px solid #eee}
  .pag th{background:#f3f3f3;color:#111;font-size:11px}
  .foot{margin-top:24px;border-top:1px solid #ddd;padding-top:10px;font-size:10.5px;color:#555;text-align:center;line-height:1.5}
  .badge{display:inline-block;padding:2px 8px;border:1px solid #111;border-radius:4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
  @media print{
    .page{border:none;margin:0;max-width:none}
    @page{margin:14mm}
  }
</style></head>
<body>
  <div class="page">
    <div class="head">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="logo">${esc((empresa.razao[0] ?? "Q").toUpperCase())}</div>
        <div>
          <h1>Documento Auxiliar de Venda</h1>
          <p class="razao">${esc(empresa.razao)}</p>
          ${empresa.cnpj ? `<p class="small">CNPJ: ${esc(empresa.cnpj)}</p>` : ""}
          ${empresa.endereco ? `<p class="small">${esc(empresa.endereco)}</p>` : ""}
          ${empresa.telefone ? `<p class="small">Tel: ${esc(empresa.telefone)} ${empresa.email ? ` · ${esc(empresa.email)}` : ""}</p>` : ""}
        </div>
      </div>
      <div class="right">
        <p class="nfTitle">Nota de Venda</p>
        <p class="nfNumero">${esc(numero)}</p>
        <p class="small">${esc(formatDateTime(pedido.created_at))}</p>
        <p style="margin-top:6px"><span class="badge">Consumidor final</span></p>
      </div>
    </div>

    <div class="meta">
      <div class="box">
        <p class="lbl">Cliente</p>
        <p style="margin:0;font-weight:600">${esc(cli?.nome ?? "Consumidor não identificado")}</p>
        ${cli?.documento ? `<p class="small">Doc: ${esc(cli.documento)}</p>` : ""}
        ${cli?.telefone ? `<p class="small">Tel: ${esc(cli.telefone)}</p>` : ""}
      </div>
      <div class="box">
        <p class="lbl">Operação</p>
        <p class="small" style="margin:0">Origem: <strong>${esc(pedido.origem ?? "—")}</strong></p>
        ${pedido.vendedor?.nome ? `<p class="small">Vendedor: ${esc(pedido.vendedor.nome)}</p>` : ""}
        <p class="small">Status: ${esc(pedido.status)}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Descrição</th>
          <th style="width:50px">UN</th>
          <th style="width:60px" class="num">Qtd</th>
          <th style="width:90px" class="num">Vlr. Unit</th>
          <th style="width:100px" class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itens
          .map(
            (i: any, ix: number) => `<tr>
          <td>${ix + 1}</td>
          <td>${esc(i.produto?.nome ?? "—")}${i.produto?.sku ? `<br><span class="small">SKU ${esc(i.produto.sku)}</span>` : ""}</td>
          <td>${esc(i.produto?.unidade ?? "UN")}</td>
          <td class="num">${Number(i.qtd ?? 0)}</td>
          <td class="num">${formatBRL(Number(i.preco_unit ?? 0))}</td>
          <td class="num">${formatBRL(Number(i.total ?? 0))}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totais">
      <div class="row"><span>Itens</span><span>${totalItens}</span></div>
      <div class="row"><span>Subtotal</span><span>${formatBRL(Number(pedido.subtotal ?? 0))}</span></div>
      <div class="row"><span>Desconto</span><span>- ${formatBRL(Number(pedido.desconto ?? 0))}</span></div>
      <div class="row grand"><span>TOTAL</span><span>${formatBRL(Number(pedido.total ?? 0))}</span></div>
    </div>

    ${pgs.length ? `<div class="pag">
      <table>
        <thead><tr><th>Forma de pagamento</th><th>Condição</th><th class="num" style="width:120px">Valor</th></tr></thead>
        <tbody>
          ${pgs
            .map(
              (p: any) => `<tr>
            <td>${esc(pagamentoLabel(p.forma))}</td>
            <td>${esc(p.condicao ?? "—")}</td>
            <td class="num">${formatBRL(Number(p.valor ?? 0))}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>` : ""}

    <p class="foot">
      Documento auxiliar de venda. Não possui valor fiscal — emitido em conformidade interna para controle do estabelecimento.
      <br>Para emissão oficial NFC-e/NF-e configure o serviço autorizado de emissão fiscal.
    </p>
  </div>
  <script>setTimeout(function(){window.focus();window.print()},150)</script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}