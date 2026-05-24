Plano de correção sem bagunçar o painel:

1. Corrigir o deploy na Vercel de verdade
- Remover a solução atual de copiar build para `public`, porque isso tenta publicar o app como estático e não atende bem TanStack Start com rotas `/api/public/*` e renderização server-side.
- Adicionar um build específico para Vercel com Nitro, conforme documentação atual de TanStack Start/Vercel.
- Criar uma configuração separada `vite.vercel.config.ts` para não misturar o build da Lovable Cloud/Cloudflare com o build da Vercel.
- Instalar/adicionar `nitro` ao projeto e usar preset Vercel.
- Ajustar `vercel.json` para apontar para a saída correta do Nitro/Vercel, sem fallback SPA manual quebrando server routes.
- Substituir o script `prepare-vercel-output.mjs` por um verificador de saída que falha com mensagem clara se a Vercel não gerar a pasta esperada.

Resultado esperado:
- Vercel não vai mais procurar `public` depois do build.
- Rotas internas, refresh/deep links e `/api/public/v1` continuam funcionando.
- O domínio atual da hospedagem continua sendo detectado automaticamente pela API.

2. Corrigir definitivamente a rota de Novo Pedido
- Normalizar a rota `pedidos.index.tsx` para `/pedidos` sem barra final problemática.
- Garantir que `/pedidos/novo` seja uma rota própria e renderize o `PedidoForm` dentro do layout autenticado.
- Validar os links e navegações: botão “Novo pedido”, voltar, salvar e redirecionar para detalhe do pedido.
- Não alterar o fluxo visual já feito do formulário além do necessário para a tela aparecer e funcionar.

3. Melhorar a fluidez ao trocar de abas/telas
- Pré-carregar rotas principais do menu assim que o painel autenticado estiver aberto, em vez de esperar o clique.
- Pré-buscar dados mais usados em segundo plano: pedidos, produtos, clientes, categorias, configurações e caixa.
- Ajustar links do menu para preloading imediato/eficiente, mantendo acessibilidade e sem transformar navegação em botões.
- Evitar refetch desnecessário ao trocar de tela, mantendo cache com `staleTime` adequado e `keepPreviousData` onde já existe.
- Reduzir hidratação duplicada do usuário se houver chamada repetida de perfil/roles no início.

4. Validação final
- Checar `/pedidos`, `/pedidos/novo`, detalhe de pedido e `/api/public/v1`.
- Conferir que a configuração Vercel não aponta mais para `public` e que o build esperado gera a saída correta.
- Revisar console/rede para garantir ausência de erros e menor espera visual na troca de telas.

Arquivos previstos
- `package.json`
- `vercel.json`
- `vite.vercel.config.ts`
- `scripts/prepare-vercel-output.mjs` ou novo script equivalente de verificação
- `src/routes/_authenticated/pedidos.index.tsx`
- `src/routes/_authenticated/pedidos.novo.tsx` se necessário
- `src/routes/_authenticated.tsx`
- `src/components/app-sidebar.tsx`
- `src/lib/auth.tsx` se confirmado o excesso de hidratação