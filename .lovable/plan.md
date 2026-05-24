Vou corrigir isso como um ajuste integrado do painel, sem refazer a arquitetura inteira e sem reintroduzir dados mockados onde o sistema já tem banco real.

## 1. Pedidos: tela, cards, status e romaneio

- Redesenhar `Novo pedido` com layout operacional no estilo pedido/romaneio de vendas: cabeçalho compacto, blocos bem separados, busca de cliente/produto mais rápida, tabela de itens mais densa, totais fixos e ações claras.
- Melhorar os cards da tela de pedidos com informação útil e sincronizada:
  - número do pedido;
  - cliente;
  - origem;
  - pagamento;
  - produtos principais;
  - quantidade de itens;
  - total;
  - tags de status com cor própria.
- Aplicar cores diferentes e consistentes por status:
  - `pendente`: amarelo/atenção;
  - `autorizado`: azul;
  - `separacao`: ciano/operacional;
  - `conferencia`: roxo/checagem;
  - `concluido`: verde;
  - `cancelado/reprovado`, quando aparecer: vermelho.
- Reestruturar o romaneio de impressão para ficar parecido com documento profissional de venda:
  - título `VENDA: número do pedido`;
  - bloco de cliente completo;
  - bloco de pedido/vendedor/data/pagamento;
  - tabela de itens com referência, descrição, unidade, quantidade, unitário e total;
  - totais alinhados;
  - observações;
  - assinatura;
  - layout próprio para impressão A4, sem aparência simples.
- Manter ações de coluna do Kanban e impressão por pedido/por coluna sem quebrar o fluxo atual.

## 2. Produtos: editar sem recarregar, criar real e ações na lista

- Trocar o comportamento atual de `Editar produto` que navega/recarrega a tela.
- Na própria tela de produtos, ao clicar em um item ou ação:
  - `Ver`: abre painel lateral somente leitura;
  - `Editar`: o mesmo painel vira formulário editável;
  - `Excluir`: confirma e remove de verdade;
  - `Novo produto`: abre o painel em modo criação, salva no banco e atualiza a lista.
- Corrigir o fluxo de salvar produto:
  - criar produto real;
  - editar produto real;
  - atualizar a lista imediatamente após salvar;
  - mostrar erro real quando o banco recusar SKU, permissão ou campo obrigatório.
- Adicionar coluna/área de ações em cada produto: `ver`, `editar`, `excluir`.
- Colocar paginação nas listas, começando por produtos, com 12 itens por página e controles de anterior/próxima/página atual.
- Reaproveitar essa paginação para outras listas principais sem bagunçar o visual.

## 3. Remover mock do PDV e tornar venda real

- Substituir o PDV que hoje usa `src/data/mock.ts` por produtos reais do banco.
- O carrinho começará vazio, sem produtos falsos pré-carregados.
- Finalizar venda criará um pedido real com origem `pdv`.
- Se houver caixa aberto, registrar movimento de venda no caixa com o valor exato.
- Usar cálculo monetário seguro em centavos internamente no front antes de salvar, evitando erros de arredondamento em subtotal, desconto, total, recebido e troco.

## 4. Configurações do PDV e métodos de pagamento

- Criar uma configuração persistida do sistema para o PDV:
  - PDV ativo/desativado;
  - métodos habilitados: PIX, crédito, débito, dinheiro, fiado;
  - QR Code PIX salvo para uso no checkout.
- Adicionar na aba `Configurações > PDV`:
  - chave geral para ativar/desativar a tela de PDV;
  - toggles por método de pagamento;
  - upload/URL do QR Code PIX;
  - prévia do QR Code.
- No PDV:
  - mostrar só métodos ativos;
  - se PIX estiver ativo e selecionado, exibir o QR Code salvo;
  - se o PDV estiver desativado, manter a tela visível porém bloqueada com blur/glass e mensagem: `Essa tela está desativada. Vá até Configurações > PDV para ativar.`

## 5. Notificações funcionais

- Transformar o sino do topo em menu funcional.
- Gerar notificações úteis a partir dos dados reais, por exemplo:
  - produtos em ruptura;
  - produtos com estoque baixo;
  - pedidos pendentes;
  - caixa fechado;
  - PDV desativado.
- Exibir contador no ícone e lista em dropdown com links para a área correta.

## 6. Fluidez e bug de “recarregar no mesmo segundo”

- Corrigir a hidratação de autenticação que hoje está disparando consultas duplicadas de perfil/permissão.
- Evitar que abrir uma aba/tela refaça a mesma busca imediatamente sem necessidade.
- Ajustar cache e invalidações para:
  - manter dados anteriores enquanto atualiza;
  - evitar piscadas de carregamento;
  - não limpar a tela durante navegação;
  - só invalidar o necessário após criar/editar/excluir.

## 7. Suporte visual no modo claro

- Melhorar contornos, bordas e contraste no modo claro usando os tokens existentes do design system.
- Reforçar bordas de cards, tabelas, dropdowns, painéis laterais e inputs sem deixar pesado.
- Preservar o visual atual do painel, só deixando mais legível e profissional.

## 8. Banco e arquivos necessários

Será necessário adicionar estrutura real para configurações e QR Code PIX:

- tabela de configurações do sistema/PDV com RLS para equipe;
- bucket/armazenamento do QR Code PIX, com política segura;
- hooks/mutations para ler e salvar configurações;
- integração do PDV com essas configurações.

## Validação depois da implementação

- Testar ao vivo `/pedidos`, `/pedidos/novo`, detalhe/impressão do pedido, `/produtos`, criação/edição/exclusão de produto, `/pdv`, `/configuracoes` e o sino de notificações.
- Conferir que o PDV não usa mais mock.
- Conferir que produto novo aparece na lista sem recarregar manualmente.
- Conferir que editar no painel lateral salva de verdade.
- Conferir que a navegação não pisca/recarrega no mesmo segundo.