import { formatBRL, formatDateTime } from "@/lib/format";
import { pagamentoLabel } from "@/lib/pagamento";

/**
 * Gera um DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) — modelo 55
 * visual padronizado pela SEFAZ. Sem valor fiscal oficial: serve como espelho
 * da operação em A4.
 */
export function printNotaFiscal(pedido: any, settings: any, pagamentos: any[] = []) {
  if (!pedido) return;
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    alert("Habilite pop-ups para gerar o DANFE.");
    return;
  }

  const empresa = {
    razao: settings?.empresa_razao ?? "EMPRESA",
    cnpj: settings?.empresa_cnpj ?? "",
    ie: settings?.empresa_ie ?? "",
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

  const numero = pedido.nfe_numero ?? pedido.numero ?? String(pedido.id).slice(0, 8).toUpperCase();
  const chave: string = (pedido.nfe_chave ?? "").toString().padEnd(44, "0");
  const chaveFmt = chave.replace(/(\d{4})/g, "$1 ").trim();
  const totalItens = itens.reduce((s: number, i: any) => s + Number(i.qtd ?? 0), 0);
  const totalProdutos = itens.reduce((s: number, i: any) => s + Number(i.total ?? 0), 0);

  const end = cli?.endereco ?? {};
  const destNome = cli?.nome_fantasia || cli?.nome || "CONSUMIDOR NÃO IDENTIFICADO";
  const destDoc = cli?.documento ?? "";
  const destIE = cli?.ie ?? "";
  const destEndereco = [end.logradouro, end.numero].filter(Boolean).join(", ");
  const destBairro = end.bairro ?? "";
  const destCidade = end.cidade ?? "";
  const destUF = end.uf ?? "";
  const destCep = end.cep ?? "";

  const vencimento = pgs.find((p: any) => p.vencimento)?.vencimento;

  const itensRows = itens.map((i: any) => `<tr>
    <td>${esc(i.produto?.sku ?? "—")}</td>
    <td>${esc(i.produto?.nome ?? "—")}</td>
    <td class="center">00000000</td>
    <td class="center">000</td>
    <td class="center">5102</td>
    <td class="center">${esc(i.embalagem_tipo ?? i.produto?.unidade ?? "UN")}</td>
    <td class="num">${Number(i.qtd ?? 0).toFixed(2)}</td>
    <td class="num">${formatBRL(Number(i.preco_unit ?? 0))}</td>
    <td class="num">${formatBRL(Number(i.total ?? 0))}</td>
    <td class="num">0,00</td>
  </tr>`).join("");
  const fillerRows = Array.from({ length: Math.max(0, 4 - itens.length) })
    .map(() => `<tr>${'<td>&nbsp;</td>'.repeat(10)}</tr>`).join("");

  const fatura = pgs.length ? `
    <div class="sec"><span class="sec-title">Fatura / Duplicatas</span></div>
    <div class="row stack">
      ${pgs.slice(0, 4).map((p: any, i: number) => `
        <div class="bx" style="flex:1">
          <span class="lbl">Nº ${String(i + 1).padStart(3, "0")} · ${esc(pagamentoLabel(p.forma))}</span>
          <span class="val">${p.vencimento ? "Venc: " + esc(String(p.vencimento).split("-").reverse().join("/")) + " · " : ""}${formatBRL(Number(p.valor ?? 0))}</span>
        </div>`).join("")}
    </div>` : "";

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>DANFE · ${esc(numero)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:9pt}
  .page{width:210mm;margin:0 auto;padding:6mm}
  .row{display:flex;gap:0}
  .bx{border:1px solid #000;padding:3px 6px;min-height:22px}
  .stack > .bx + .bx{border-left:0}
  .lbl{font-size:6.5pt;text-transform:uppercase;letter-spacing:.02em;display:block;line-height:1.1;margin-bottom:1px}
  .val{font-size:9pt;font-weight:600;line-height:1.2;display:block}
  .sec{margin-top:6px}
  .sec-title{background:#000;color:#fff;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 6px;display:inline-block}
  .head-grid{display:grid;grid-template-columns:1.2fr 1.6fr 1fr;border:1px solid #000}
  .head-grid > div{padding:4px 8px;border-right:1px solid #000}
  .head-grid > div:last-child{border-right:0}
  .danfe-title{text-align:center;font-weight:800;font-size:11pt;text-transform:uppercase}
  .danfe-sub{text-align:center;font-size:7.5pt;line-height:1.3;margin-top:2px}
  .nf-meta{text-align:center;font-size:8pt;line-height:1.3;margin-top:4px}
  .emit-name{font-size:11pt;font-weight:800;line-height:1.1}
  .emit-addr{font-size:8pt;line-height:1.4;margin-top:3px}
  table.itens{width:100%;border-collapse:collapse;border:1px solid #000;font-size:8pt;margin-top:0}
  table.itens th{background:#e8e8e8;border:1px solid #000;padding:3px 4px;text-align:left;font-size:7pt;font-weight:700;text-transform:uppercase}
  table.itens td{border:1px solid #000;padding:2px 4px;vertical-align:top}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .center{text-align:center}
  .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #000}
  .calc-grid > div{padding:3px 6px;border-right:1px solid #000;border-top:1px solid #000}
  .calc-grid > div:nth-child(-n+4){border-top:0}
  .calc-grid > div:nth-child(4n){border-right:0}
  .info-box{border:1px solid #000;padding:4px 6px;min-height:60px;font-size:8.5pt;line-height:1.5;white-space:pre-line}
  .qrcode{border:1px solid #000;padding:6px;display:flex;align-items:center;gap:8px}
  .qrcode .sq{width:72px;height:72px;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:6.5pt;text-align:center;color:#666}
  .foot-note{margin-top:6px;font-size:7pt;color:#444;text-align:center}
  @media print{ .page{padding:8mm;width:auto} @page{size:A4;margin:6mm} }
</style></head>
<body>
  <div class="page">

    <div class="head-grid">
      <div>
        <div class="emit-name">${esc(empresa.razao)}</div>
        <div class="emit-addr">
          ${empresa.endereco ? esc(empresa.endereco) + "<br>" : ""}
          ${empresa.telefone ? "Fone: " + esc(empresa.telefone) : ""}
          ${empresa.email ? " · " + esc(empresa.email) : ""}
        </div>
      </div>
      <div>
        <div class="danfe-title">DANFE</div>
        <div class="danfe-sub">Documento Auxiliar da<br>Nota Fiscal Eletrônica</div>
        <div class="danfe-sub" style="margin-top:6px">
          <span style="display:inline-block;border:1px solid #000;padding:1px 8px;margin-right:4px">0 — ENTRADA</span>
          <span style="display:inline-block;border:1px solid #000;padding:1px 8px;background:#000;color:#fff">1 — SAÍDA</span>
        </div>
        <div class="nf-meta">Nº ${esc(numero)} · SÉRIE 1 · FOLHA 1/1</div>
      </div>
      <div>
        <div class="lbl">Chave de acesso</div>
        <div class="val" style="font-family:'Courier New',monospace;font-size:8pt;word-break:break-all;line-height:1.4">${esc(chaveFmt)}</div>
        <div class="lbl" style="margin-top:4px">Consulta de autenticidade</div>
        <div class="val" style="font-size:8pt;font-weight:400">www.nfe.fazenda.gov.br/portal<br>ou no site da SEFAZ autorizadora</div>
      </div>
    </div>

    <div class="row stack" style="margin-top:-1px">
      <div class="bx" style="flex:2"><span class="lbl">Natureza da operação</span><span class="val">VENDA DE MERCADORIA A CONSUMIDOR</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Protocolo de autorização de uso</span><span class="val" style="font-family:'Courier New',monospace">${esc(formatDateTime(pedido.nfe_emitida_em ?? pedido.created_at))}</span></div>
    </div>
    <div class="row stack" style="margin-top:-1px">
      <div class="bx" style="flex:1.4"><span class="lbl">CNPJ</span><span class="val">${esc(empresa.cnpj || "—")}</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Inscrição Estadual</span><span class="val">${esc(empresa.ie || "—")}</span></div>
      <div class="bx" style="flex:1.6"><span class="lbl">Inscrição Municipal</span><span class="val">—</span></div>
    </div>

    <div class="sec"><span class="sec-title">Destinatário / Remetente</span></div>
    <div class="row stack">
      <div class="bx" style="flex:3"><span class="lbl">Nome / Razão Social</span><span class="val">${esc(destNome)}</span></div>
      <div class="bx" style="flex:1.2"><span class="lbl">CNPJ / CPF</span><span class="val">${esc(destDoc || "—")}</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Data de emissão</span><span class="val">${esc(formatDateTime(pedido.created_at))}</span></div>
    </div>
    <div class="row stack" style="margin-top:-1px">
      <div class="bx" style="flex:2.5"><span class="lbl">Endereço</span><span class="val">${esc(destEndereco || "—")}</span></div>
      <div class="bx" style="flex:1.2"><span class="lbl">Bairro</span><span class="val">${esc(destBairro || "—")}</span></div>
      <div class="bx" style="flex:.8"><span class="lbl">CEP</span><span class="val">${esc(destCep || "—")}</span></div>
      <div class="bx" style="flex:.8"><span class="lbl">Data saída</span><span class="val">${esc(formatDateTime(pedido.created_at))}</span></div>
    </div>
    <div class="row stack" style="margin-top:-1px">
      <div class="bx" style="flex:2"><span class="lbl">Município</span><span class="val">${esc(destCidade || "—")}</span></div>
      <div class="bx" style="flex:.5"><span class="lbl">UF</span><span class="val">${esc(destUF || "—")}</span></div>
      <div class="bx" style="flex:1.2"><span class="lbl">Fone / Fax</span><span class="val">${esc(cli?.telefone || "—")}</span></div>
      <div class="bx" style="flex:1.2"><span class="lbl">Inscrição Estadual</span><span class="val">${esc(destIE || "—")}</span></div>
    </div>

    ${fatura}

    <div class="sec"><span class="sec-title">Cálculo do Imposto</span></div>
    <div class="calc-grid">
      <div><span class="lbl">Base de cálculo ICMS</span><span class="val">${formatBRL(totalProdutos)}</span></div>
      <div><span class="lbl">Valor do ICMS</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Base ICMS substituição</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Valor ICMS substituição</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Valor total dos produtos</span><span class="val">${formatBRL(totalProdutos)}</span></div>
      <div><span class="lbl">Valor do frete</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Valor do seguro</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Desconto</span><span class="val">${formatBRL(Number(pedido.desconto ?? 0))}</span></div>
      <div><span class="lbl">Outras despesas</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Valor do IPI</span><span class="val">${formatBRL(0)}</span></div>
      <div><span class="lbl">Tributos aproximados</span><span class="val">${formatBRL(0)}</span></div>
      <div style="background:#f0f0f0"><span class="lbl">Valor total da nota</span><span class="val" style="font-size:11pt;font-weight:800">${formatBRL(Number(pedido.total ?? 0))}</span></div>
    </div>

    <div class="sec"><span class="sec-title">Transportador / Volumes Transportados</span></div>
    <div class="row stack">
      <div class="bx" style="flex:2"><span class="lbl">Razão Social</span><span class="val">—</span></div>
      <div class="bx" style="flex:.8"><span class="lbl">Frete por conta</span><span class="val">9 — Sem frete</span></div>
      <div class="bx" style="flex:.6"><span class="lbl">Código ANTT</span><span class="val">—</span></div>
      <div class="bx" style="flex:.6"><span class="lbl">Placa veículo</span><span class="val">—</span></div>
      <div class="bx" style="flex:.4"><span class="lbl">UF</span><span class="val">—</span></div>
      <div class="bx" style="flex:1"><span class="lbl">CNPJ / CPF</span><span class="val">—</span></div>
    </div>
    <div class="row stack" style="margin-top:-1px">
      <div class="bx" style="flex:1"><span class="lbl">Quantidade</span><span class="val">${totalItens}</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Espécie</span><span class="val">VOLUME</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Marca</span><span class="val">—</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Numeração</span><span class="val">—</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Peso bruto (kg)</span><span class="val">—</span></div>
      <div class="bx" style="flex:1"><span class="lbl">Peso líquido (kg)</span><span class="val">—</span></div>
    </div>

    <div class="sec"><span class="sec-title">Dados dos Produtos / Serviços</span></div>
    <table class="itens">
      <thead>
        <tr>
          <th style="width:8%">Cód.</th>
          <th>Descrição do Produto / Serviço</th>
          <th style="width:8%">NCM/SH</th>
          <th style="width:5%">CST</th>
          <th style="width:5%">CFOP</th>
          <th style="width:4%">UN</th>
          <th style="width:6%" class="num">Qtde</th>
          <th style="width:8%" class="num">Vlr. Unit</th>
          <th style="width:9%" class="num">Vlr. Total</th>
          <th style="width:6%" class="num">Alíq.</th>
        </tr>
      </thead>
      <tbody>${itensRows}${fillerRows}</tbody>
    </table>

    <div class="sec"><span class="sec-title">Informações Complementares</span></div>
    <div class="row" style="gap:0">
      <div class="info-box" style="flex:2;border-right:0">Pedido interno: ${esc(pedido.numero ?? "")}${pedido.vendedor?.nome ? "\nVendedor responsável: " + esc(pedido.vendedor.nome) : ""}${pedido.observacoes ? "\nObservações: " + esc(pedido.observacoes) : ""}${vencimento ? "\nVencimento principal: " + esc(String(vencimento).split("-").reverse().join("/")) : ""}\nDocumento emitido em ambiente de homologação — SEM VALOR FISCAL.</div>
      <div class="qrcode" style="flex:1">
        <div class="sq">QR-Code NF-e<br>(consulta)</div>
        <div style="font-size:7pt;line-height:1.4">Consulte pela chave de acesso em:<br><strong>www.nfe.fazenda.gov.br/portal</strong></div>
      </div>
    </div>

    <p class="foot-note">DANFE gerado pelo sistema Quick OS · Espelho da operação — não substitui a NF-e autorizada pela SEFAZ.</p>
  </div>
  <script>setTimeout(function(){window.focus();window.print()},200)</script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
