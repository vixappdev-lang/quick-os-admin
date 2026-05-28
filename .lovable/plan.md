## Objetivo
Corrigir a tela **Supabase** para ela mostrar com precisão:
- O banco principal **Lovable Cloud**.
- A conexão externa `/t/admin` cadastrada.
- Em **Ações** de cada conexão, um botão de SQL de correção atualizado e específico para corrigir tabelas/colunas ausentes.

## Diagnóstico atual
- A conexão `/t/admin` existe no banco central: slug `admin`, usuário `admin@loja.com`, URL `https://utyhfwqegiwrwvppleah.supabase.co`.
- Se em produção aparece só “Lovable Cloud”, a causa mais provável é que o domínio publicado está lendo outro ambiente/banco ou a consulta de tenants está falhando/filtrando antes de renderizar.
- A tela hoje ainda tem botões globais no topo para copiar/baixar SQL; você pediu para o SQL ficar embaixo, nas **Ações** da linha da conexão.
- O app não tem ainda um mecanismo central para “capturar erro de tabela/coluna” e transformar isso em ação de correção visível na tela Supabase.

## Plano de implementação

### 1. Corrigir a origem da lista de conexões
- Ajustar a função `listTenants` para retornar sempre a lista diretamente do banco principal gerenciado, com dados necessários para a tela:
  - `id`, `slug`, `nome`, `supabase_url`, `user_id`, `created_at`.
  - Dados do usuário dono quando possível: nome/e-mail.
- Garantir que o front não dependa de uma segunda busca frágil para exibir `/t/admin`.
- Se a lista vier vazia ou com erro, mostrar estado técnico discreto dentro da tabela, não uma faixa/banner decorativa.

### 2. Remover SQL global do topo
- Remover da `PageHeader` os botões globais **Copiar SQL** e **Baixar SQL**.
- Manter somente **Nova conexão** no topo.
- O SQL ficará exclusivamente em **Ações** na linha da conexão, como solicitado.

### 3. Ações por conexão: SQL limpo e correto
- Na linha **Lovable Cloud**, manter ações úteis, mas o SQL será tratado como “schema principal/referência”.
- Na linha `/t/admin` e demais conexões externas, manter o botão de SQL em **Ações** com rótulo/tooltip claro:
  - “SQL de correção”.
- Ao clicar, abrir um modal limpo com:
  - Nome/slug da conexão.
  - Botão **Copiar SQL de correção**.
  - Botão **Abrir SQL Editor** para o projeto daquela conexão.
  - Prévia do SQL.
- Evitar linguagem visual bagunçada e remover textos grandes desnecessários.

### 4. Reconhecer erros de tabela/coluna do sistema
- Criar um registrador leve de erros de schema no front:
  - Detectar mensagens como `Could not find the table`, `Could not find`, `column ... does not exist`, `relation ... does not exist`, `schema cache`.
  - Identificar a tabela/área quando possível.
  - Salvar localmente por conexão ativa: slug, tabela/coluna, mensagem, horário e módulo provável.
- Integrar esse registrador nos pontos centrais de queries/mutations, principalmente `src/lib/queries.ts`, para capturar erros vindos de produtos, pedidos, PDV, caixa, financeiro, estoque, clientes, fornecedores etc.
- Quando houver erro reconhecido, a tela Supabase mostrará na linha da conexão um indicador discreto, por exemplo: “Correção pendente”.

### 5. SQL de correção atualizado conforme erros encontrados
- O modal de SQL da conexão vai carregar o `setup.sql` completo como base segura.
- Se houver erros de schema registrados para aquela conexão, o modal destacará:
  - Quais tabelas/colunas deram erro.
  - Que o SQL completo corrige o schema daquela conexão.
- O botão em **Ações** continuará copiando o SQL atualizado completo, porque é o caminho mais seguro para corrigir tabelas, funções, triggers, policies e grants sem deixar o banco pela metade.

### 6. Garantir que novas conexões apareçam corretamente
- Depois de salvar uma nova conexão:
  - Invalidar a lista de tenants.
  - Atualizar a tabela imediatamente.
  - Abrir o modal de SQL da própria conexão recém-criada.
- Se a conexão `/t/admin` já existe no banco principal, ela deverá aparecer sem precisar recriar.

### 7. Validação final
- Verificar que a tela `/supabase`:
  - Mostra Lovable Cloud + `/t/admin`.
  - Não tem botões globais de SQL no topo.
  - Tem SQL de correção dentro das ações da linha.
  - Mostra indicador de schema pendente quando erros de tabela/coluna forem capturados.
- Revisar sem mexer no design geral: somente ajustes funcionais e discretos na tela atual.

## Observação importante sobre produção
Se o domínio `lynecloud.online` estiver apontando para uma publicação que usa outro banco/ambiente, nenhuma mudança visual consegue “inventar” a conexão que não existe naquele ambiente. O que vou fazer no app é:
- Tornar a consulta de conexões mais robusta.
- Exibir erro/estado real se a produção não estiver lendo o mesmo banco.
- Garantir que, quando o banco correto estiver ativo, `/t/admin` apareça na lista.

A correção ideal é deixar o app sempre lendo o mesmo backend principal para tenants, e os bancos externos apenas para dados do cliente conectado.