import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useAppSettings, usePedidos } from "@/lib/queries";

/**
 * Pré-visualização visual do DANFE (Documento Auxiliar da NF-e) Modelo 55
 * — fiel ao layout SEFAZ. Mostra como a nota emitida via nfe.io vai ficar
 * usando os dados reais da empresa configurada + um pedido de exemplo.
 */
export function DanfePreviewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useAppSettings();
  const { data: pedidosAll = [] } = usePedidos();

  // Usa o pedido mais recente com itens — dado REAL do painel.
  const pedido = pedidosAll.find((p: any) => Array.isArray(p.itens) && p.itens.length > 0) ?? null;
  const cliente = pedido?.cliente ?? null;

  const itens = pedido
    ? pedido.itens.map((it: any, idx: number) => ({
        cod: String(idx + 1).padStart(3, "0"),
        desc: it.produto?.nome ?? "Produto",
        ncm: "00000000",
        cfop: "5102",
        un: "UN",
        qtd: Number(it.qtd ?? 0),
        vu: Number(it.preco_unit ?? 0),
        vt: Number(it.total ?? Number(it.qtd ?? 0) * Number(it.preco_unit ?? 0)),
      }))
    : [];
  const total = pedido ? Number(pedido.total ?? 0) : 0;
  const bcIcms = total;
  const vIcms = total * 0.18;

  const conectado = !!(settings as any)?.nfeio_validated_at && !!(settings as any)?.nfeio_api_key;
  const ambiente = ((settings as any)?.nfeio_environment ?? "Production") as string;

  const print = () => {
    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<html><head><title>DANFE preview</title></head><body>${document.getElementById("danfe-render")?.outerHTML ?? ""}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              Pré-visualização do DANFE — Modelo 55
              {conectado ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <ShieldCheck className="h-3 w-3" /> Autorizada ({ambiente})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                  <ShieldAlert className="h-3 w-3" /> Pré-visualização — não autorizada
                </span>
              )}
            </span>
            <div className="flex gap-2">
              <button onClick={print} className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs hover:bg-muted">
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
              <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogTitle>
          {!conectado && (
            <p className="text-xs text-muted-foreground">
              Conecte a nfe.io em Configurações → Nota Fiscal para que esta nota seja emitida e autorizada pela SEFAZ.
            </p>
          )}
        </DialogHeader>

        <div id="danfe-render" className="bg-white text-black text-[10px] leading-tight font-mono border border-black p-2 overflow-x-auto">
          {/* cabeçalho */}
          <table className="w-full border-collapse" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="border border-black p-2 w-[28%] align-top">
                  <div className="text-[8px] font-bold uppercase">Emitente</div>
                  <div className="mt-1 text-[11px] font-bold leading-snug">{settings?.empresa_razao ?? "SUA EMPRESA LTDA"}</div>
                  <div className="mt-1 whitespace-pre-line">{settings?.empresa_endereco ?? "Endereço da empresa, nº — Bairro\nCidade / UF — CEP"}</div>
                  <div>Fone: {settings?.empresa_telefone ?? "(00) 0000-0000"}</div>
                </td>
                <td className="border border-black p-2 w-[36%] text-center align-middle">
                  <div className="text-[18px] font-bold tracking-wider">DANFE</div>
                  <div className="text-[8px]">Documento Auxiliar da Nota Fiscal Eletrônica</div>
                  <div className="mt-1 text-[8px] font-bold">0 - ENTRADA &nbsp;&nbsp; 1 - SAÍDA</div>
                  <div className="mt-1 inline-block border border-black px-3 py-0.5 text-[9px] font-bold">
                    N° {String(pedido?.numero ?? "000.000.001").padStart(9, "0")}
                  </div>
                  <div>Série 001</div>
                  <div>Folha 1/1</div>
                </td>
                <td className="border border-black p-2 w-[36%] align-top">
                  <div className="text-[8px] font-bold uppercase">Chave de acesso</div>
                  <div className="text-[9px] tracking-wider break-all">
                    {conectado ? "—  (gerada pela SEFAZ ao emitir)" : "PRÉ-VISUALIZAÇÃO — SEM CHAVE"}
                  </div>
                  <div className="mt-2 text-[8px] font-bold">Consulta de autenticidade no portal nacional da NF-e</div>
                  <div className="text-[8px]">www.nfe.fazenda.gov.br/portal</div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-[8px]" colSpan={3}>
                  <span className="font-bold">NATUREZA DA OPERAÇÃO:</span> VENDA DE MERCADORIA &nbsp;&nbsp;
                  <span className="font-bold">PROTOCOLO:</span> {conectado ? "— (recebido após autorização)" : "PRÉ-VISUALIZAÇÃO"}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={3}>
                  <div className="grid grid-cols-3 gap-1">
                    <Field label="CNPJ" value={settings?.empresa_cnpj ?? "00.000.000/0001-00"} />
                    <Field label="INSCRIÇÃO ESTADUAL" value={settings?.empresa_ie ?? "000.000.000.000"} />
                    <Field label="INSC. EST. SUBST. TRIB." value="—" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* destinatário */}
          <div className="mt-1 border border-black">
            <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold uppercase">Destinatário / Remetente</div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="border border-black p-1" colSpan={2}><Field label="NOME / RAZÃO SOCIAL" value={cliente?.nome ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="CNPJ/CPF" value={cliente?.cnpj ?? cliente?.cpf ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="DATA EMISSÃO" value={new Date().toLocaleDateString("pt-BR")} /></td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={2}><Field label="ENDEREÇO" value={cliente?.endereco ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="BAIRRO" value={cliente?.bairro ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="CEP" value={cliente?.cep ?? "—"} /></td>
                </tr>
                <tr>
                  <td className="border border-black p-1"><Field label="MUNICÍPIO" value={cliente?.cidade ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="FONE" value={cliente?.telefone ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="UF" value={cliente?.uf ?? "—"} /></td>
                  <td className="border border-black p-1"><Field label="INSC. ESTADUAL" value="—" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* totais */}
          <div className="mt-1 border border-black">
            <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold uppercase">Cálculo do Imposto</div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="border border-black p-1"><Field label="BASE CÁLC. ICMS" value={formatBRL(bcIcms)} /></td>
                  <td className="border border-black p-1"><Field label="VALOR ICMS" value={formatBRL(vIcms)} /></td>
                  <td className="border border-black p-1"><Field label="BC ICMS ST" value="0,00" /></td>
                  <td className="border border-black p-1"><Field label="ICMS ST" value="0,00" /></td>
                  <td className="border border-black p-1"><Field label="V. PRODUTOS" value={formatBRL(total)} /></td>
                </tr>
                <tr>
                  <td className="border border-black p-1"><Field label="FRETE" value="0,00" /></td>
                  <td className="border border-black p-1"><Field label="SEGURO" value="0,00" /></td>
                  <td className="border border-black p-1"><Field label="DESCONTO" value="0,00" /></td>
                  <td className="border border-black p-1"><Field label="V. IPI" value="0,00" /></td>
                  <td className="border border-black p-1 bg-yellow-100"><Field label="V. TOTAL NOTA" value={formatBRL(total)} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* transportador */}
          <div className="mt-1 border border-black">
            <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold uppercase">Transportador / Volumes Transportados</div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="border border-black p-1" colSpan={2}><Field label="NOME / RAZÃO SOCIAL" value="—" /></td>
                  <td className="border border-black p-1"><Field label="FRETE POR CONTA" value="9 - SEM FRETE" /></td>
                  <td className="border border-black p-1"><Field label="PLACA" value="—" /></td>
                  <td className="border border-black p-1"><Field label="UF" value="—" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* itens */}
          <div className="mt-1 border border-black">
            <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold uppercase">Dados dos Produtos / Serviços</div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 text-[8px]">
                  <th className="border border-black p-1">CÓD</th>
                  <th className="border border-black p-1 text-left">DESCRIÇÃO DO PRODUTO/SERVIÇO</th>
                  <th className="border border-black p-1">NCM</th>
                  <th className="border border-black p-1">CFOP</th>
                  <th className="border border-black p-1">UN</th>
                  <th className="border border-black p-1">QTD</th>
                  <th className="border border-black p-1">VL UNIT</th>
                  <th className="border border-black p-1">VL TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={8} className="border border-black p-3 text-center text-[9px] text-gray-600">
                      Nenhum pedido encontrado para gerar a pré-visualização. Crie um pedido com itens para ver o DANFE real.
                    </td>
                  </tr>
                )}
                {itens.map((i: any) => (
                  <tr key={i.cod}>
                    <td className="border border-black p-1 text-center">{i.cod}</td>
                    <td className="border border-black p-1">{i.desc}</td>
                    <td className="border border-black p-1 text-center">{i.ncm}</td>
                    <td className="border border-black p-1 text-center">{i.cfop}</td>
                    <td className="border border-black p-1 text-center">{i.un}</td>
                    <td className="border border-black p-1 text-right">{i.qtd}</td>
                    <td className="border border-black p-1 text-right">{formatBRL(i.vu)}</td>
                    <td className="border border-black p-1 text-right">{formatBRL(i.vt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* dados adicionais */}
          <div className="mt-1 border border-black">
            <div className="bg-gray-200 px-1 py-0.5 text-[8px] font-bold uppercase">Dados Adicionais</div>
            <div className="p-2 min-h-[60px] text-[9px]">
              DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.
              <br />
              {conectado
                ? "Layout autorizado pela SEFAZ. Ao emitir, o número da NF-e, chave de acesso e protocolo serão preenchidos automaticamente pela nfe.io."
                : "Esta é uma pré-visualização baseada no último pedido cadastrado. Para emitir a nota real e obter chave/protocolo da SEFAZ, conecte a nfe.io em Configurações."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[7px] font-bold uppercase text-gray-600">{label}</div>
      <div className="text-[10px]">{value}</div>
    </div>
  );
}