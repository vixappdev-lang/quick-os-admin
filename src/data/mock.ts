export const kpis = {
  vendasHoje: 18432.5,
  vendasDelta: 12.4,
  pedidosHoje: 142,
  pedidosDelta: 8.1,
  ticketMedio: 129.81,
  ticketDelta: 3.2,
  lucroHoje: 5821.4,
  lucroDelta: 14.7,
  produtosVendidos: 487,
  produtosDelta: -2.4,
  caixaAtual: 7240.9,
  caixaDelta: 0,
};

export const vendasSemana = [
  { dia: "Seg", vendas: 12400, lucro: 3800 },
  { dia: "Ter", vendas: 14200, lucro: 4100 },
  { dia: "Qua", vendas: 11800, lucro: 3600 },
  { dia: "Qui", vendas: 16300, lucro: 5200 },
  { dia: "Sex", vendas: 21400, lucro: 6800 },
  { dia: "Sáb", vendas: 27800, lucro: 8900 },
  { dia: "Dom", vendas: 18432, lucro: 5821 },
];

export const vendasMes = Array.from({ length: 30 }, (_, i) => ({
  dia: String(i + 1).padStart(2, "0"),
  vendas: 8000 + Math.round(Math.sin(i / 3) * 4000 + Math.random() * 6000),
}));

export const formasPagamento = [
  { nome: "PIX", valor: 8420, cor: "var(--chart-1)" },
  { nome: "Crédito", valor: 5210, cor: "var(--chart-2)" },
  { nome: "Débito", valor: 2890, cor: "var(--chart-3)" },
  { nome: "Dinheiro", valor: 1410, cor: "var(--chart-4)" },
  { nome: "Fiado", valor: 502, cor: "var(--chart-5)" },
];

export const horariosPico = [
  { hora: "08h", vendas: 8 },
  { hora: "10h", vendas: 14 },
  { hora: "12h", vendas: 28 },
  { hora: "14h", vendas: 19 },
  { hora: "16h", vendas: 22 },
  { hora: "18h", vendas: 41 },
  { hora: "20h", vendas: 56 },
  { hora: "22h", vendas: 33 },
];

export const fluxoMes = Array.from({ length: 30 }, (_, i) => ({
  dia: String(i + 1).padStart(2, "0"),
  entradas: 12000 + Math.round(Math.random() * 8000),
  saidas: 7000 + Math.round(Math.random() * 5000),
}));

export type Produto = {
  id: string;
  nome: string;
  sku: string;
  ean: string;
  categoria: string;
  fornecedor: string;
  precoCusto: number;
  preco: number;
  estoque: number;
  estoqueMin: number;
  status: "ativo" | "inativo";
};

export const produtos: Produto[] = [
  { id: "p001", nome: "Heineken Long Neck 330ml", sku: "BEB-HEI-330", ean: "7896045506019", categoria: "Cervejas", fornecedor: "Heineken Brasil", precoCusto: 5.4, preco: 9.9, estoque: 248, estoqueMin: 60, status: "ativo" },
  { id: "p002", nome: "Vinho Tinto Casillero del Diablo 750ml", sku: "VIN-CDL-750", ean: "7804320074610", categoria: "Vinhos", fornecedor: "Concha y Toro", precoCusto: 38.0, preco: 69.9, estoque: 42, estoqueMin: 20, status: "ativo" },
  { id: "p003", nome: "Whisky Johnnie Walker Red Label 1L", sku: "DES-JWR-1L", ean: "5000267023625", categoria: "Destilados", fornecedor: "Diageo", precoCusto: 78.0, preco: 119.9, estoque: 18, estoqueMin: 12, status: "ativo" },
  { id: "p004", nome: "Coca-Cola 2L", sku: "REF-COC-2L", ean: "7894900011517", categoria: "Refrigerantes", fornecedor: "Coca-Cola FEMSA", precoCusto: 6.2, preco: 11.5, estoque: 96, estoqueMin: 40, status: "ativo" },
  { id: "p005", nome: "Red Bull Energy Drink 250ml", sku: "ENE-RBL-250", ean: "9002490100070", categoria: "Energéticos", fornecedor: "Red Bull GmbH", precoCusto: 5.9, preco: 11.9, estoque: 8, estoqueMin: 30, status: "ativo" },
  { id: "p006", nome: "Skol Pilsen Lata 350ml", sku: "BEB-SKO-350", ean: "7891991010917", categoria: "Cervejas", fornecedor: "Ambev", precoCusto: 2.9, preco: 4.5, estoque: 412, estoqueMin: 120, status: "ativo" },
  { id: "p007", nome: "Vodka Smirnoff 998ml", sku: "DES-SMI-998", ean: "7893218001074", categoria: "Destilados", fornecedor: "Diageo", precoCusto: 32.0, preco: 49.9, estoque: 5, estoqueMin: 10, status: "ativo" },
  { id: "p008", nome: "Salgadinho Doritos Queijo Nacho 96g", sku: "SAL-DOR-96", ean: "7892840816018", categoria: "Snacks", fornecedor: "PepsiCo", precoCusto: 4.1, preco: 7.9, estoque: 64, estoqueMin: 30, status: "ativo" },
  { id: "p009", nome: "Gelo Pacote 5kg", sku: "GEL-PAC-5KG", ean: "7898900000087", categoria: "Gelo & Itens", fornecedor: "Polar Ice", precoCusto: 3.5, preco: 8.0, estoque: 32, estoqueMin: 20, status: "ativo" },
  { id: "p010", nome: "Água Mineral Crystal 500ml", sku: "AGU-CRY-500", ean: "7894900020014", categoria: "Águas", fornecedor: "Coca-Cola FEMSA", precoCusto: 1.1, preco: 3.0, estoque: 184, estoqueMin: 60, status: "ativo" },
  { id: "p011", nome: "Espumante Chandon Brut 750ml", sku: "VIN-CHB-750", ean: "7891037000016", categoria: "Vinhos", fornecedor: "Chandon", precoCusto: 79.0, preco: 139.9, estoque: 14, estoqueMin: 8, status: "ativo" },
  { id: "p012", nome: "Cigarro Marlboro Vermelho", sku: "TAB-MRL-RED", ean: "7896004001234", categoria: "Tabacaria", fornecedor: "Philip Morris", precoCusto: 7.2, preco: 12.5, estoque: 86, estoqueMin: 40, status: "ativo" },
];

export type Pedido = {
  id: string;
  numero: string;
  cliente: string;
  operador: string;
  total: number;
  itens: number;
  pagamento: "PIX" | "Crédito" | "Débito" | "Dinheiro" | "Fiado";
  status: "concluído" | "pendente" | "em preparo" | "cancelado" | "entregue";
  origem: "PDV" | "Delivery" | "Balcão";
  data: string;
};

export const pedidos: Pedido[] = [
  { id: "o001", numero: "#10421", cliente: "Marcos Oliveira", operador: "Ana Lima", total: 248.5, itens: 7, pagamento: "PIX", status: "concluído", origem: "PDV", data: "2026-05-24T19:42:00" },
  { id: "o002", numero: "#10420", cliente: "Juliana Costa", operador: "Ana Lima", total: 89.9, itens: 3, pagamento: "Crédito", status: "concluído", origem: "Balcão", data: "2026-05-24T19:28:00" },
  { id: "o003", numero: "#10419", cliente: "Cliente Avulso", operador: "Carlos Silva", total: 32.5, itens: 2, pagamento: "Dinheiro", status: "concluído", origem: "PDV", data: "2026-05-24T19:14:00" },
  { id: "o004", numero: "#10418", cliente: "Patrícia Ramos", operador: "Bruno Souza", total: 412.0, itens: 12, pagamento: "PIX", status: "em preparo", origem: "Delivery", data: "2026-05-24T19:03:00" },
  { id: "o005", numero: "#10417", cliente: "Rafael Mendes", operador: "Ana Lima", total: 156.7, itens: 5, pagamento: "Fiado", status: "pendente", origem: "Balcão", data: "2026-05-24T18:47:00" },
  { id: "o006", numero: "#10416", cliente: "Camila Duarte", operador: "Carlos Silva", total: 78.0, itens: 4, pagamento: "Débito", status: "entregue", origem: "Delivery", data: "2026-05-24T18:31:00" },
  { id: "o007", numero: "#10415", cliente: "Eduardo Pinto", operador: "Bruno Souza", total: 524.9, itens: 18, pagamento: "Crédito", status: "concluído", origem: "PDV", data: "2026-05-24T18:12:00" },
  { id: "o008", numero: "#10414", cliente: "Cliente Avulso", operador: "Ana Lima", total: 19.5, itens: 1, pagamento: "PIX", status: "cancelado", origem: "PDV", data: "2026-05-24T17:58:00" },
  { id: "o009", numero: "#10413", cliente: "Lúcia Fernandes", operador: "Carlos Silva", total: 287.4, itens: 9, pagamento: "PIX", status: "concluído", origem: "Balcão", data: "2026-05-24T17:42:00" },
  { id: "o010", numero: "#10412", cliente: "Henrique Alves", operador: "Bruno Souza", total: 92.3, itens: 3, pagamento: "Dinheiro", status: "concluído", origem: "PDV", data: "2026-05-24T17:21:00" },
];

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  compras: number;
  totalGasto: number;
  fiado: number;
  pontos: number;
  ultimaCompra: string;
  status: "ativo" | "vip" | "inadimplente";
};

export const clientes: Cliente[] = [
  { id: "c001", nome: "Marcos Oliveira", telefone: "(11) 98421-3320", email: "marcos.oli@gmail.com", compras: 42, totalGasto: 6840.5, fiado: 0, pontos: 684, ultimaCompra: "2026-05-24", status: "vip" },
  { id: "c002", nome: "Juliana Costa", telefone: "(11) 99812-4421", email: "ju.costa@outlook.com", compras: 18, totalGasto: 1920.0, fiado: 0, pontos: 192, ultimaCompra: "2026-05-24", status: "ativo" },
  { id: "c003", nome: "Patrícia Ramos", telefone: "(11) 97412-9981", email: "patricia.r@gmail.com", compras: 28, totalGasto: 3412.7, fiado: 180.0, pontos: 341, ultimaCompra: "2026-05-23", status: "ativo" },
  { id: "c004", nome: "Rafael Mendes", telefone: "(11) 96841-7732", email: "rafa.mendes@gmail.com", compras: 12, totalGasto: 1480.0, fiado: 320.5, pontos: 148, ultimaCompra: "2026-05-22", status: "inadimplente" },
  { id: "c005", nome: "Camila Duarte", telefone: "(11) 95541-2298", email: "camila.d@hotmail.com", compras: 24, totalGasto: 2210.4, fiado: 0, pontos: 221, ultimaCompra: "2026-05-21", status: "ativo" },
  { id: "c006", nome: "Eduardo Pinto", telefone: "(11) 94512-8821", email: "edu.pinto@gmail.com", compras: 56, totalGasto: 9810.0, fiado: 0, pontos: 981, ultimaCompra: "2026-05-24", status: "vip" },
  { id: "c007", nome: "Lúcia Fernandes", telefone: "(11) 93412-6614", email: "lucia.f@gmail.com", compras: 31, totalGasto: 4120.9, fiado: 90.0, pontos: 412, ultimaCompra: "2026-05-24", status: "ativo" },
];

export const categorias = [
  { id: "cat1", nome: "Cervejas", produtos: 84, status: "ativa" },
  { id: "cat2", nome: "Vinhos", produtos: 42, status: "ativa" },
  { id: "cat3", nome: "Destilados", produtos: 38, status: "ativa" },
  { id: "cat4", nome: "Refrigerantes", produtos: 26, status: "ativa" },
  { id: "cat5", nome: "Energéticos", produtos: 14, status: "ativa" },
  { id: "cat6", nome: "Snacks", produtos: 51, status: "ativa" },
  { id: "cat7", nome: "Águas", produtos: 12, status: "ativa" },
  { id: "cat8", nome: "Tabacaria", produtos: 18, status: "ativa" },
  { id: "cat9", nome: "Gelo & Itens", produtos: 9, status: "ativa" },
];

export const movimentacoes = [
  { id: "m001", data: "2026-05-24T19:42:00", tipo: "saída", produto: "Heineken Long Neck 330ml", qtd: 12, origem: "Venda #10421", operador: "Ana Lima" },
  { id: "m002", data: "2026-05-24T18:30:00", tipo: "entrada", produto: "Coca-Cola 2L", qtd: 48, origem: "NF-e 00012345", operador: "Sistema" },
  { id: "m003", data: "2026-05-24T16:12:00", tipo: "ajuste", produto: "Vodka Smirnoff 998ml", qtd: -2, origem: "Ajuste de inventário", operador: "Carlos Silva" },
  { id: "m004", data: "2026-05-24T14:48:00", tipo: "perda", produto: "Cerveja Skol Lata 350ml", qtd: -6, origem: "Quebra", operador: "Bruno Souza" },
  { id: "m005", data: "2026-05-24T11:22:00", tipo: "entrada", produto: "Red Bull Energy Drink 250ml", qtd: 72, origem: "NF-e 00012344", operador: "Sistema" },
  { id: "m006", data: "2026-05-24T10:05:00", tipo: "saída", produto: "Whisky Johnnie Walker Red 1L", qtd: 1, origem: "Venda #10412", operador: "Bruno Souza" },
];

export const nfes = [
  { id: "nf1", numero: "00012345", emissor: "Distribuidora Ambev SP", valor: 8420.5, itens: 124, status: "importada", data: "2026-05-24" },
  { id: "nf2", numero: "00012344", emissor: "Red Bull Brasil", valor: 3210.0, itens: 48, status: "importada", data: "2026-05-24" },
  { id: "nf3", numero: "00012340", emissor: "Diageo Brasil", valor: 12480.0, itens: 64, status: "divergência", data: "2026-05-23" },
  { id: "nf4", numero: "00012338", emissor: "Coca-Cola FEMSA", valor: 5210.4, itens: 96, status: "pendente", data: "2026-05-22" },
];

export const despesas = [
  { id: "d1", descricao: "Aluguel mensal", categoria: "Estabelecimento", valor: 4800, vencimento: "2026-06-05", status: "pendente" },
  { id: "d2", descricao: "Energia elétrica", categoria: "Utilidades", valor: 920.5, vencimento: "2026-06-12", status: "pendente" },
  { id: "d3", descricao: "Folha de pagamento", categoria: "RH", valor: 14200, vencimento: "2026-05-31", status: "pendente" },
  { id: "d4", descricao: "Internet fibra 500MB", categoria: "Utilidades", valor: 189.9, vencimento: "2026-05-28", status: "pago" },
  { id: "d5", descricao: "Software gestão LyneCloud", categoria: "Sistemas", valor: 349, vencimento: "2026-05-30", status: "pago" },
];

export const contas = [
  { id: "ct1", tipo: "a receber", parceiro: "Eduardo Pinto", valor: 524.9, vencimento: "2026-05-28", status: "em aberto" },
  { id: "ct2", tipo: "a receber", parceiro: "Rafael Mendes", valor: 320.5, vencimento: "2026-05-25", status: "atrasada" },
  { id: "ct3", tipo: "a pagar", parceiro: "Distribuidora Ambev", valor: 8420.5, vencimento: "2026-06-10", status: "em aberto" },
  { id: "ct4", tipo: "a pagar", parceiro: "Diageo Brasil", valor: 12480.0, vencimento: "2026-06-04", status: "em aberto" },
  { id: "ct5", tipo: "a receber", parceiro: "Patrícia Ramos", valor: 180.0, vencimento: "2026-06-02", status: "em aberto" },
];

export const usuarios = [
  { id: "u1", nome: "Carlos Administrador", email: "admin@loja.com", role: "Administrador", status: "ativo", ultimoAcesso: "Agora" },
  { id: "u2", nome: "Ana Lima", email: "ana.lima@loja.com", role: "Operador PDV", status: "ativo", ultimoAcesso: "há 12 min" },
  { id: "u3", nome: "Bruno Souza", email: "bruno.souza@loja.com", role: "Operador PDV", status: "ativo", ultimoAcesso: "há 34 min" },
  { id: "u4", nome: "Carlos Silva", email: "carlos.silva@loja.com", role: "Gerente", status: "ativo", ultimoAcesso: "há 2h" },
  { id: "u5", nome: "Marina Reis", email: "marina.reis@loja.com", role: "Financeiro", status: "inativo", ultimoAcesso: "há 6 dias" },
];

export const logs = [
  { id: "l1", data: "2026-05-24T19:42:00", usuario: "Ana Lima", acao: "Venda finalizada", recurso: "Pedido #10421", ip: "192.168.1.42" },
  { id: "l2", data: "2026-05-24T19:30:00", usuario: "Carlos Administrador", acao: "Alterou permissão", recurso: "Bruno Souza", ip: "192.168.1.10" },
  { id: "l3", data: "2026-05-24T18:12:00", usuario: "Bruno Souza", acao: "Abriu caixa", recurso: "Caixa #3", ip: "192.168.1.55" },
  { id: "l4", data: "2026-05-24T17:50:00", usuario: "Sistema", acao: "Importou NF-e", recurso: "NF 00012345", ip: "—" },
  { id: "l5", data: "2026-05-24T16:12:00", usuario: "Carlos Silva", acao: "Ajuste de estoque", recurso: "Vodka Smirnoff 998ml", ip: "192.168.1.20" },
  { id: "l6", data: "2026-05-24T15:04:00", usuario: "Ana Lima", acao: "Login", recurso: "—", ip: "192.168.1.42" },
];

export const comandas = [
  { id: "cm1", numero: "01", cliente: "Mesa 12 — João", itens: 7, total: 184.5, abertura: "19:12", status: "aberta" },
  { id: "cm2", numero: "02", cliente: "Mesa 04 — Família Silva", itens: 12, total: 412.0, abertura: "18:48", status: "aberta" },
  { id: "cm3", numero: "03", cliente: "Balcão — Cliente Avulso", itens: 3, total: 48.0, abertura: "19:35", status: "aberta" },
  { id: "cm4", numero: "04", cliente: "Mesa 07 — Ricardo", itens: 5, total: 96.4, abertura: "19:01", status: "fechando" },
];

export const deliveries = [
  { id: "dl1", numero: "#D-204", cliente: "Patrícia Ramos", endereco: "Rua das Flores, 412", entregador: "Roberto", total: 412.0, status: "em rota", tempo: "12 min" },
  { id: "dl2", numero: "#D-203", cliente: "Camila Duarte", endereco: "Av. Paulista, 1820", entregador: "Felipe", total: 78.0, status: "entregue", tempo: "—" },
  { id: "dl3", numero: "#D-202", cliente: "Henrique Alves", endereco: "R. Aurora, 92", entregador: "—", total: 142.5, status: "preparando", tempo: "5 min" },
  { id: "dl4", numero: "#D-201", cliente: "Marina Lopes", endereco: "Av. Faria Lima, 3477", entregador: "Roberto", total: 286.9, status: "aguardando", tempo: "—" },
];

export const sessoesCaixa = [
  { id: "s1", caixa: "Caixa 01", operador: "Ana Lima", abertura: "08:00", fechamento: "—", inicial: 200, atual: 7240.9, status: "aberto" },
  { id: "s2", caixa: "Caixa 02", operador: "Bruno Souza", abertura: "12:00", fechamento: "18:00", inicial: 200, atual: 4820.5, status: "fechado" },
  { id: "s3", caixa: "Caixa 03", operador: "Carlos Silva", abertura: "14:00", fechamento: "20:00", inicial: 300, atual: 3120.0, status: "fechado" },
];
