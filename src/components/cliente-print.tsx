import { formatBRL } from "@/lib/format";

interface Empresa {
  razao?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export function buildClienteHTML(cliente: any, empresa?: Empresa) {
  const end = (cliente?.endereco ?? {}) as any;
  const now = new Date().toLocaleString("pt-BR");
  const tipo = cliente?.tipo_pessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física";
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>Cadastro do Cliente ${cliente?.nome ?? ""}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; padding:20px; font-size:11px; }
  h1 { text-align:center; font-size:22px; margin:0 0 4px; letter-spacing:1px; }
  .sub { text-align:center; color:#444; margin-bottom:14px; font-size:11px; }
  .section-title { background:#e9ecef; padding:6px 10px; font-weight:bold; font-size:12px; border:1px solid #c8ced3; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; padding:10px; border:1px solid #c8ced3; border-top:0; margin-bottom:12px; }
  .row { display:grid; grid-template-columns:120px 1fr; gap:8px; align-items:end; padding:4px 0; }
  .row label { color:#444; font-size:11px; }
  .row .val { border-bottom:1px solid #aab; padding-bottom:2px; min-height:16px; font-size:11px; }
  .full { grid-column:1 / -1; }
  .footer { margin-top:18px; display:flex; justify-content:space-between; font-size:10px; color:#666; border-top:1px solid #ddd; padding-top:6px; }
  .ass { margin-top:28px; text-align:center; font-size:11px; }
  .ass .line { border-top:1px solid #444; width:320px; margin:0 auto 4px; }
  @media print { body { padding:8mm; } }
</style>
</head><body>
<h1>${empresa?.razao ?? "CADASTRO DE CLIENTE"}</h1>
<div class="sub">${empresa?.cnpj ? "CNPJ " + empresa.cnpj + " · " : ""}${empresa?.endereco ?? ""}</div>

<div class="section-title">Identificação <span style="float:right;font-weight:normal">${now}</span></div>
<div class="grid">
  <div class="row"><label>Tipo:</label><div class="val">${tipo}</div></div>
  <div class="row"><label>${cliente?.tipo_pessoa === "PJ" ? "Razão Social" : "Nome"}:</label><div class="val">${cliente?.nome ?? "—"}</div></div>
  <div class="row"><label>Nome Fantasia:</label><div class="val">${cliente?.nome_fantasia ?? "—"}</div></div>
  <div class="row"><label>${cliente?.tipo_pessoa === "PJ" ? "CNPJ" : "CPF"}:</label><div class="val">${cliente?.documento ?? "—"}</div></div>
  <div class="row"><label>${cliente?.tipo_pessoa === "PJ" ? "I.E." : "RG"}:</label><div class="val">${cliente?.ie ?? "—"}</div></div>
  <div class="row"><label>Cadastrado em:</label><div class="val">${cliente?.created_at ? new Date(cliente.created_at).toLocaleDateString("pt-BR") : "—"}</div></div>
</div>

<div class="section-title">Contato</div>
<div class="grid">
  <div class="row"><label>Telefone:</label><div class="val">${cliente?.telefone ?? "—"}</div></div>
  <div class="row"><label>E-mail:</label><div class="val">${cliente?.email ?? "—"}</div></div>
</div>

<div class="section-title">Endereço</div>
<div class="grid">
  <div class="row"><label>CEP:</label><div class="val">${end.cep ?? "—"}</div></div>
  <div class="row"><label>Logradouro:</label><div class="val">${end.logradouro ?? "—"}</div></div>
  <div class="row"><label>Bairro:</label><div class="val">${end.bairro ?? "—"}</div></div>
  <div class="row"><label>Cidade/UF:</label><div class="val">${end.cidade ?? "—"}${end.uf ? " - " + end.uf : ""}</div></div>
  <div class="row full"><label>Complemento:</label><div class="val">${end.complemento ?? "—"}</div></div>
</div>

<div class="section-title">Financeiro</div>
<div class="grid">
  <div class="row"><label>Limite de crédito:</label><div class="val">${formatBRL(Number(cliente?.limite_credito ?? 0))}</div></div>
  <div class="row"><label>Saldo fiado:</label><div class="val">${formatBRL(Number(cliente?.saldo_fiado ?? 0))}</div></div>
</div>

<div class="section-title">Observações</div>
<div class="grid"><div class="row full"><label>&nbsp;</label><div class="val" style="min-height:50px">${cliente?.observacoes ?? ""}</div></div></div>

<div class="ass"><div class="line"></div>Assinatura do Cliente</div>

<div class="footer">
  <span>${empresa?.telefone ?? ""}</span>
  <span>${empresa?.email ?? ""}</span>
  <span>${now}</span>
</div>
</body></html>`;
}

export function printCliente(cliente: any, empresa?: Empresa) {
  const html = buildClienteHTML(cliente, empresa);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
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
  w.onload = () => setTimeout(() => { w.focus(); w.print(); }, 200);
}