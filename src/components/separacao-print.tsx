export type SeparacaoLinha = {
  produto_id: string;
  sku: string;
  nome: string;
  unidade: string;
  qtd: number;
  pedidos: string[];
};

export function agregarSeparacao(pedidos: any[]): SeparacaoLinha[] {
  const map = new Map<string, SeparacaoLinha>();
  pedidos.forEach((p) => {
    (p.itens ?? []).forEach((i: any) => {
      const id = i.produto?.id ?? i.produto_id;
      if (!id) return;
      const cur: SeparacaoLinha = map.get(id) ?? {
        produto_id: id,
        sku: i.produto?.sku ?? "—",
        nome: i.produto?.nome ?? "—",
        unidade: i.produto?.unidade ?? "UN",
        qtd: 0,
        pedidos: [] as string[],
      };
      cur.qtd += Number(i.qtd);
      if (!cur.pedidos.includes(p.numero)) cur.pedidos.push(p.numero);
      map.set(id, cur);
    });
  });
  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function escape(s: any): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printSeparacao(pedidos: any[]) {
  const linhas = agregarSeparacao(pedidos);
  const now = new Date().toLocaleString("pt-BR");
  const linhasHtml = linhas.map((l) => `<tr>
    <td>${escape(l.sku)}</td>
    <td>${escape(l.nome)}</td>
    <td style="text-align:right">${l.qtd.toLocaleString("pt-BR")}</td>
    <td style="text-align:center">${escape(l.unidade)}</td>
    <td style="font-size:10px;color:#444">${l.pedidos.map(escape).join(", ")}</td>
    <td style="width:60px"></td>
  </tr>`).join("");
  const totalItens = linhas.reduce((s, l) => s + l.qtd, 0);
  const html = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>Separação por Produto</title>
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
<h1>Separação por Produto</h1>
<div class="sub">Emitido em ${now} · ${pedidos.length} pedido(s) · ${linhas.length} produto(s)</div>
<table>
  <thead><tr>
    <th style="width:100px">SKU</th>
    <th>Produto</th>
    <th style="width:80px;text-align:right">Qtd</th>
    <th style="width:50px;text-align:center">Unid</th>
    <th>Pedidos</th>
    <th style="width:60px;text-align:center">OK</th>
  </tr></thead>
  <tbody>${linhasHtml || `<tr><td colspan="6" style="text-align:center;color:#888;padding:18px">Sem itens</td></tr>`}</tbody>
  <tfoot><tr>
    <td colspan="2" style="text-align:right">TOTAL</td>
    <td style="text-align:right">${totalItens.toLocaleString("pt-BR")}</td>
    <td colspan="3"></td>
  </tr></tfoot>
</table>
</body></html>`;
  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 200);
}