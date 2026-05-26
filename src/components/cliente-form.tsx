import { useEffect, useState } from "react";
import { Loader2, Save, User as UserIcon, Building2, MapPin, FileText, Phone } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { toast } from "sonner";
import { useUpsertCliente, useVendedores, type Cliente } from "@/lib/queries";

const inputBase =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted/40 disabled:text-muted-foreground";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  cliente?: Cliente | null;
  onSaved: (c: any) => void;
  onCancel: () => void;
}

export function ClienteForm({ cliente, onSaved, onCancel }: Props) {
  const upsert = useUpsertCliente();
  const { data: vendedores = [] } = useVendedores();
  const end = ((cliente?.endereco as any) ?? {}) as any;

  const [tipo, setTipo] = useState<"PF" | "PJ">(((cliente as any)?.tipo_pessoa ?? "PF") as any);
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [fantasia, setFantasia] = useState((cliente as any)?.nome_fantasia ?? "");
  const [documento, setDocumento] = useState(cliente?.documento ?? "");
  const [ie, setIe] = useState((cliente as any)?.ie ?? "");
  const [ieIsento, setIeIsento] = useState(((cliente as any)?.ie ?? "").toUpperCase() === "ISENTO");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [cep, setCep] = useState(end.cep ?? "");
  const [logradouro, setLogradouro] = useState(end.logradouro ?? "");
  const [bairro, setBairro] = useState(end.bairro ?? "");
  const [cidade, setCidade] = useState(end.cidade ?? "");
  const [uf, setUf] = useState(end.uf ?? "");
  const [complemento, setComplemento] = useState(end.complemento ?? "");
  const [vendedorId, setVendedorId] = useState<string>(((cliente as any)?.vendedor_id ?? "") as string);
  const [limite, setLimite] = useState(String(cliente?.limite_credito ?? 0));
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? "");

  // Auto-fill via ViaCEP
  useEffect(() => {
    const clean = (cep ?? "").replace(/\D/g, "");
    if (clean.length !== 8) return;
    let cancel = false;
    fetch(`https://viacep.com.br/ws/${clean}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel || d.erro) return;
        setLogradouro((v: string) => v || d.logradouro || "");
        setBairro((v: string) => v || d.bairro || "");
        setCidade((v: string) => v || d.localidade || "");
        setUf((v: string) => v || d.uf || "");
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [cep]);

  const salvar = async () => {
    if (!nome.trim()) return toast.error("Nome / Razão Social é obrigatório");
    try {
      const payload: any = {
        ...(cliente?.id ? { id: cliente.id } : {}),
        nome: nome.trim(),
        nome_fantasia: fantasia || null,
        documento: documento || null,
        ie: ieIsento ? "ISENTO" : (ie || null),
        tipo_pessoa: tipo,
        telefone: telefone || null,
        email: email || null,
        vendedor_id: vendedorId || null,
        limite_credito: Number(limite) || 0,
        observacoes: observacoes || null,
        endereco: {
          cep: cep || null,
          logradouro: logradouro || null,
          bairro: bairro || null,
          cidade: cidade || null,
          uf: uf || null,
          complemento: complemento || null,
        },
      };
      const saved = await upsert.mutateAsync(payload);
      toast.success(cliente?.id ? "Cliente atualizado" : "Cliente cadastrado");
      onSaved(saved);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="sticky top-0 z-20 -mx-3 border-b bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {cliente?.id ? "Editar cliente" : "Novo cliente"}
            </p>
            <p className="text-sm font-semibold">{nome || "Sem nome"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-9 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">Cancelar</button>
            <button onClick={salvar} disabled={upsert.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {upsert.isPending ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>
        </div>
      </div>

      <SectionCard title="Identificação" description="Tipo de cliente, razão social e documentos">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="Tipo" className="md:col-span-3">
            <div className="flex h-10 rounded-md border bg-background p-0.5">
              {(["PF", "PJ"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={"flex-1 rounded text-sm font-medium " + (tipo === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                  {t === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </button>
              ))}
            </div>
          </Field>
          <Field label={tipo === "PJ" ? "Razão Social *" : "Nome completo *"} className="md:col-span-6">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputBase} />
          </Field>
          <Field label={tipo === "PJ" ? "Nome Fantasia" : "Apelido"} className="md:col-span-3">
            <input value={fantasia} onChange={(e) => setFantasia(e.target.value)} className={inputBase} />
          </Field>
          <Field label={tipo === "PJ" ? "CNPJ" : "CPF"} className="md:col-span-4">
            <input value={documento} onChange={(e) => setDocumento(e.target.value)} className={inputBase} />
          </Field>
          <Field label={tipo === "PJ" ? "Inscrição Estadual" : "RG"} className="md:col-span-5">
            <input disabled={ieIsento} value={ieIsento ? "ISENTO" : ie} onChange={(e) => setIe(e.target.value)} className={inputBase} />
          </Field>
          <Field label="&nbsp;" className="md:col-span-3">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm">
              <input type="checkbox" checked={ieIsento} onChange={(e) => setIeIsento(e.target.checked)} />
              Isento de IE
            </label>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Contato">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="Telefone" className="md:col-span-4">
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={inputBase} />
          </Field>
          <Field label="E-mail" className="md:col-span-8">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBase} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Endereço" description="O CEP preenche automaticamente cidade, bairro e UF">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="CEP" className="md:col-span-3">
            <input value={cep} onChange={(e) => setCep(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Logradouro" className="md:col-span-7">
            <input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Complemento" className="md:col-span-2">
            <input value={complemento} onChange={(e) => setComplemento(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Bairro" className="md:col-span-4">
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Cidade" className="md:col-span-6">
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputBase} />
          </Field>
          <Field label="UF" className="md:col-span-2">
            <input value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} className={inputBase} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Comercial">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <Field label="Vendedor responsável" className="md:col-span-6">
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={inputBase}>
              <option value="">— Nenhum —</option>
              {vendedores.map((v: any) => (
                <option key={v.id} value={v.id}>{v.nome} ({v.email})</option>
              ))}
            </select>
          </Field>
          <Field label="Limite de crédito (R$)" className="md:col-span-3">
            <input type="number" step="0.01" min={0} value={limite} onChange={(e) => setLimite(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Saldo fiado" className="md:col-span-3">
            <input disabled value={Number(cliente?.saldo_fiado ?? 0).toFixed(2)} className={inputBase} />
          </Field>
          <Field label="Observações" className="md:col-span-12">
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3}
              className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}