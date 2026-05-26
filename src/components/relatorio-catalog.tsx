import { useMemo } from "react";
import { formatBRL } from "@/lib/format";

export type RelReport = { titulo: string; colunas: string[]; linhas: (string | number)[][]; rodape?: string };
export type RelRow = { num: number; titulo: string; info: string; build: () => RelReport };
export type RelGrupo = { titulo: string; rows: RelRow[] };

export interface RelDatasets {
  pedidos: any[];
  produtos: any[];
  clientes: any[];
  despesas: any[];
  contas: any[];
  usuarios: any[];
}

const PAG_LABEL: Record<string, string> = {
  pix: "PIX", dinheiro: "Dinheiro", nota_promissoria: "Nota promissória", cheque: "Cheque",
  debito: "Débito", credito: "Crédito", fiado: "Fiado", outro: "Outro",
};

export function useRelatorios({ pedidos, produtos, clientes, despesas, contas, usuarios }: RelDatasets): RelGrupo[] {
  const validos = useMemo(() => pedidos.filter((p: any) => p.status !== "cancelado"), [pedidos]);
  return useMemo(() => [
    {
      titulo: "Cadastros",
      rows: [
        { num: 1, titulo: "Relação de Clientes", info: "Todos os clientes cadastrados com contato e saldo fiado.", build: () => ({
          titulo: "Relação de Clientes",
          colunas: ["Nome", "Documento", "Telefone", "Saldo fiado"],
          linhas: clientes.map((c: any) => [c.nome, c.documento ?? "—", c.telefone ?? "—", formatBRL(Number(c.saldo_fiado ?? 0))]),
          rodape: `${clientes.length} cliente(s)`,
        }) },
        { num: 2, titulo: "Relação de Produtos", info: "Produtos ativos com SKU, estoque e preço.", build: () => ({
          titulo: "Relação de Produtos",
          colunas: ["SKU", "Produto", "Estoque", "Mínimo", "Preço"],
          linhas: produtos.map((p: any) => [p.sku, p.nome, `${Number(p.estoque)} ${p.unidade}`, Number(p.estoque_minimo ?? 0), formatBRL(Number(p.preco_venda))]),
          rodape: `${produtos.length} produto(s)`,
        }) },
        { num: 3, titulo: "Relação de Vendedores", info: "Usuários ativos no sistema.", build: () => ({
          titulo: "Relação de Vendedores",
          colunas: ["Nome", "E-mail", "Telefone"],
          linhas: usuarios.map((u: any) => [u.nome ?? "—", u.email ?? "—", u.telefone ?? "—"]),
          rodape: `${usuarios.length} usuário(s)`,
        }) },
      ],
    },
    {
      titulo: "Financeiro",
      rows: [
        { num: 100, titulo: "Fluxo de Caixa", info: "Resumo de entradas e saídas considerando vendas e despesas pagas.", build: () => {
          const entradas = validos.reduce((s: number, p: any) => s + Number(p.total), 0);
          const saidas = despesas.filter((d: any) => d.pago).reduce((s: number, d: any) => s + Number(d.valor), 0);
          return { titulo: "Fluxo de Caixa", colunas: ["Categoria", "Valor"], linhas: [["Entradas (vendas)", formatBRL(entradas)], ["Saídas (despesas pagas)", formatBRL(saidas)], ["Saldo", formatBRL(entradas - saidas)]] };
        } },
        { num: 101, titulo: "Demonstrativo Receitas/Despesas", info: "Total agrupado por categoria de despesa.", build: () => {
          const map: Record<string, number> = {};
          despesas.forEach((d: any) => { map[d.categoria ?? "Outras"] = (map[d.categoria ?? "Outras"] ?? 0) + Number(d.valor); });
          return { titulo: "Demonstrativo Receitas/Despesas", colunas: ["Categoria", "Total"], linhas: Object.entries(map).map(([k, v]) => [k, formatBRL(v)]) };
        } },
        { num: 102, titulo: "Títulos a Pagar", info: "Contas a pagar pendentes.", build: () => ({
          titulo: "Títulos a Pagar",
          colunas: ["Descrição", "Vencimento", "Valor", "Status"],
          linhas: contas.filter((c: any) => c.tipo === "pagar").map((c: any) => [c.descricao, c.vencimento, formatBRL(Number(c.valor)), c.status]),
        }) },
        { num: 103, titulo: "Títulos a Receber", info: "Contas a receber pendentes.", build: () => ({
          titulo: "Títulos a Receber",
          colunas: ["Descrição", "Vencimento", "Valor", "Status"],
          linhas: contas.filter((c: any) => c.tipo === "receber").map((c: any) => [c.descricao, c.vencimento, formatBRL(Number(c.valor)), c.status]),
        }) },
        { num: 104, titulo: "Vendas por forma de pagamento", info: "Receita total agrupada por método.", build: () => {
          const map: Record<string, number> = {};
          validos.filter((p: any) => p.pagamento).forEach((p: any) => { map[p.pagamento] = (map[p.pagamento] ?? 0) + Number(p.total); });
          return { titulo: "Vendas por forma de pagamento", colunas: ["Método", "Total"], linhas: Object.entries(map).map(([k, v]) => [PAG_LABEL[k] ?? k, formatBRL(v)]) };
        } },
      ],
    },
    {
      titulo: "Vendas",
      rows: [
        { num: 200, titulo: "Pedidos por período", info: "Lista de pedidos válidos.", build: () => ({
          titulo: "Pedidos por período",
          colunas: ["Nº", "Data", "Cliente", "Status", "Total"],
          linhas: validos.map((p: any) => [p.numero, new Date(p.created_at).toLocaleDateString("pt-BR"), p.cliente?.nome ?? "—", p.status, formatBRL(Number(p.total))]),
          rodape: `Total: ${formatBRL(validos.reduce((s: number, p: any) => s + Number(p.total), 0))}`,
        }) },
        { num: 201, titulo: "Vendas por vendedor", info: "Receita total por vendedor.", build: () => {
          const map = new Map<string, { nome: string; total: number; qtd: number }>();
          validos.forEach((p: any) => {
            const u = usuarios.find((x: any) => x.id === p.vendedor_id);
            const key = p.vendedor_id ?? "—";
            const cur = map.get(key) ?? { nome: u?.nome ?? "Sem vendedor", total: 0, qtd: 0 };
            cur.total += Number(p.total); cur.qtd += 1; map.set(key, cur);
          });
          return { titulo: "Vendas por vendedor", colunas: ["Vendedor", "Pedidos", "Total"], linhas: Array.from(map.values()).map((v) => [v.nome, v.qtd, formatBRL(v.total)]) };
        } },
        { num: 202, titulo: "Vendas por cliente", info: "Receita total por cliente.", build: () => {
          const map = new Map<string, { nome: string; total: number; qtd: number }>();
          validos.forEach((p: any) => {
            const key = p.cliente_id ?? "—";
            const cur = map.get(key) ?? { nome: p.cliente?.nome ?? "Avulso", total: 0, qtd: 0 };
            cur.total += Number(p.total); cur.qtd += 1; map.set(key, cur);
          });
          return { titulo: "Vendas por cliente", colunas: ["Cliente", "Pedidos", "Total"], linhas: Array.from(map.values()).sort((a, b) => b.total - a.total).map((v) => [v.nome, v.qtd, formatBRL(v.total)]) };
        } },
        { num: 203, titulo: "Top produtos", info: "Produtos mais vendidos por receita.", build: () => {
          const m = new Map<string, { nome: string; qtd: number; receita: number }>();
          validos.forEach((p: any) => (p.itens ?? []).forEach((i: any) => {
            const id = i.produto?.id ?? "?";
            const cur = m.get(id) ?? { nome: i.produto?.nome ?? "—", qtd: 0, receita: 0 };
            cur.qtd += Number(i.qtd); cur.receita += Number(i.total); m.set(id, cur);
          }));
          return { titulo: "Top produtos", colunas: ["Produto", "Qtd", "Receita"], linhas: Array.from(m.values()).sort((a, b) => b.receita - a.receita).map((v) => [v.nome, v.qtd, formatBRL(v.receita)]) };
        } },
      ],
    },
    {
      titulo: "Estoque",
      rows: [
        { num: 300, titulo: "Posição de estoque", info: "Estoque atual de todos os produtos.", build: () => ({
          titulo: "Posição de estoque",
          colunas: ["SKU", "Produto", "Estoque", "Unidade"],
          linhas: produtos.map((p: any) => [p.sku, p.nome, Number(p.estoque), p.unidade]),
        }) },
        { num: 301, titulo: "Produtos com estoque baixo", info: "Produtos no limite ou abaixo do mínimo.", build: () => ({
          titulo: "Produtos com estoque baixo",
          colunas: ["SKU", "Produto", "Estoque", "Mínimo"],
          linhas: produtos.filter((p: any) => Number(p.estoque) <= Number(p.estoque_minimo ?? 0)).map((p: any) => [p.sku, p.nome, Number(p.estoque), Number(p.estoque_minimo ?? 0)]),
        }) },
        { num: 302, titulo: "Valorização de estoque", info: "Valor total do estoque pelo preço de custo.", build: () => {
          const total = produtos.reduce((s: number, p: any) => s + Number(p.estoque) * Number(p.preco_custo ?? 0), 0);
          return { titulo: "Valorização de estoque", colunas: ["SKU", "Produto", "Estoque", "Custo", "Subtotal"],
            linhas: produtos.map((p: any) => [p.sku, p.nome, Number(p.estoque), formatBRL(Number(p.preco_custo ?? 0)), formatBRL(Number(p.estoque) * Number(p.preco_custo ?? 0))]),
            rodape: `Total: ${formatBRL(total)}`,
          };
        } },
      ],
    },
  ], [validos, produtos, clientes, despesas, contas, usuarios]);
}

export function exportRelatorioCSV(report: RelReport) {
  const sep = ";";
  const csv = [report.colunas.join(sep), ...report.linhas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(sep))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${report.titulo}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printRelatorio(report: RelReport) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${report.titulo}</title>
    <style>body{font-family:Arial,sans-serif;color:#111;padding:20px;font-size:12px}
    h1{font-size:18px;margin:0 0 10px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
    th{background:#eef;font-size:11px;text-transform:uppercase}
    .foot{margin-top:10px;font-weight:bold;text-align:right}
    </style></head><body>
    <h1>${report.titulo}</h1>
    <table><thead><tr>${report.colunas.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${report.linhas.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    ${report.rodape ? `<p class="foot">${report.rodape}</p>` : ""}
    </body></html>`;
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 200);
}