# Conectar o studio ao Supabase + PostgreSQL

O projeto oferece dois modos: **demo**, com exemplos locais, e **supabase**, com login administrativo e dados no PostgreSQL. Os alunos são cadastros do studio e não precisam de contas. O frontend pode continuar no Cloudflare Pages; o Supabase fornece banco, autenticação, API e armazenamento privado de comprovantes.

## 1. Criar o projeto

1. Entre em [supabase.com/dashboard](https://supabase.com/dashboard) e escolha **New project**.
2. Informe um nome, por exemplo `katielle-studio`, e escolha São Paulo se disponível.
3. Gere uma senha forte para o banco e guarde-a no seu gerenciador de senhas. Ela não será usada no frontend.
4. Aguarde a criação do projeto. Você pode começar no plano Free para os testes; confira os limites e as opções de backup antes de usar como sistema principal do cliente.

Não é necessário instalar PostgreSQL na sua máquina nem manter um servidor Node na hospedagem.

## 2. Criar as tabelas, permissões e comprovantes

Abra **SQL Editor → New query**. Copie o conteúdo completo dos arquivos abaixo, execute um de cada vez e confirme o resultado de sucesso:

1. [`supabase/migrations/202610090001_studio.sql`](../supabase/migrations/202610090001_studio.sql)
2. [`supabase/migrations/202610090002_private_storage.sql`](../supabase/migrations/202610090002_private_storage.sql)
3. [`supabase/migrations/202610140003_studio_management.sql`](../supabase/migrations/202610140003_studio_management.sql)
4. [`supabase/migrations/202610140004_product_inventory.sql`](../supabase/migrations/202610140004_product_inventory.sql)
5. Para publicar os planos no portfólio: [`supabase/migrations/202610140005_public_plans.sql`](../supabase/migrations/202610140005_public_plans.sql). Essa consulta expõe apenas frequência e preço. Veja o [guia do site público](PORTFOLIO_PUBLICO.md).

Antes da migração 003, mantenha o cadastro público de Authentication desabilitado. Ela autoriza os usuários existentes e os próximos usuários criados como administradores. Para atualizar um projeto que já executou 001 e 002, siga [o guia de gestão](ATUALIZACAO_GESTAO.md) para aplicar 003 e [o guia de estoque](ATUALIZACAO_ESTOQUE.md) para aplicar 004. Se já executou 003, apenas 004 é necessária.

A primeira migração cria cadastros, planos, horários, mensalidades, recebimentos, avaliações, agendamentos, produtos, vendas, movimentações e configurações. Ela ativa RLS e permite alterações somente pelas funções transacionais da aplicação, depois de verificar a autorização administrativa. A segunda cria o bucket privado `studio-documents`.

O banco inicia **sem alunos, vendas ou cobranças fictícias**. Os cinco preços iniciais dos planos podem ser ajustados em Configurações. As migrações podem ser repetidas para instalar as mesmas definições, preservando os registros; futuras mudanças de estrutura devem ter novas migrações.

## 3. Criar e autorizar a conta administrativa

1. Em **Authentication → Providers/Sign In**, mantenha o login por e-mail habilitado e desabilite novos cadastros públicos (**Allow new users to sign up**). Os nomes dos menus podem variar no painel.
2. Em **Authentication → Users → Add user → Create new user**, cadastre o e-mail da administradora com uma senha forte. Use a opção de confirmar o e-mail automaticamente para essa conta criada manualmente.
3. Copie o **UID/UUID** do usuário criado. Não é o e-mail nem o identificador do projeto.
4. Com a migração 003, a conta recebe acesso administrativo automaticamente. Para instalações anteriores a 003, no SQL Editor substitua o marcador pelo UUID e execute:

```sql
insert into public.studio_admins (user_id)
values ('COLE-O-UUID-DO-USUARIO-AQUI'::uuid)
on conflict (user_id) do nothing;
```

O login sozinho não concede acesso ao studio. Somente usuários cadastrados nessa tabela conseguem consultar ou alterar os dados; a aplicação não pode conceder essa permissão a si mesma. Para outra conta administrativa, repita a criação e a autorização. Para revogar acesso aos dados:

A migração 003 cadastra automaticamente todos os usuários criados em Authentication nessa tabela. Não exponha cadastro público de contas. O modelo atual oferece o mesmo acesso administrativo a essas contas; o Dashboard e o nome de exibição são individuais.

```sql
delete from public.studio_admins
where user_id = 'UUID-DO-USUARIO-A-REMOVER'::uuid;
```

Para encerrar também as sessões da conta, use as opções de gerenciamento do usuário no painel de Authentication.

## 4. Configurar as variáveis na sua máquina

Nas configurações do projeto, localize a **Project URL** e a chave **Publishable** (`sb_publishable_...`), normalmente em **Connect/API Keys/Data API**. Se o projeto ainda usar as chaves antigas, a chave `anon` também é aceita.

Na pasta do projeto, crie `.env.local` a partir de `.env.example`:

```powershell
# Windows / PowerShell
Copy-Item .env.example .env.local
```

```sh
# macOS / Linux
cp .env.example .env.local
```

Edite `.env.local`:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://SEU-IDENTIFICADOR.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Use os valores reais do seu projeto. Não use a URL do dashboard nem a string de conexão PostgreSQL. Não coloque senha do banco, `service_role` ou `sb_secret_...` em uma variável `VITE_`: essas variáveis são incorporadas ao JavaScript servido aos visitantes. A chave publishable é própria para esse uso; o controle de acesso depende do login, da tabela `studio_admins` e das políticas do banco.

Os arquivos `.env` estão ignorados pelo Git; `.env.example` contém apenas marcadores. Não é necessário enviar credenciais pelo chat.

## 5. Rodar e testar localmente

Instale Node.js 22 ou superior. Abra o terminal dentro da pasta `SiteStudioPersonal`:

```sh
npm ci
npm run dev -- --port 5173 --strictPort --force
```

Abra no navegador o endereço local informado pelo Vite, na porta 5173. Entre com a conta criada no passo 3.

Teste no seu projeto de desenvolvimento:

1. Ajuste os dados do studio, planos e funcionamento em **Configurações**.
2. Cadastre um aluno com CPF de 11 dígitos, telefone, plano e os dias correspondentes.
3. Confira o perfil, horários e cobrança da competência atual.
4. Registre um recebimento parcial em **Mensalidades**, opcionalmente com comprovante.
5. Recarregue e confirme que aluno e recebimento permanecem. Confira também as tabelas `students`, `bills` e `receipts` no painel.
6. Cadastre um produto e registre uma venda. Confira estoque e Financeiro.
7. Saia da conta e confirme que a navegação exige login. Em outro navegador, entre com a mesma conta e confira os registros.

Se editar `.env.local`, pare o Vite com `Ctrl+C` e inicie novamente. Se usar outra porta, ajuste os endereços de recuperação do próximo passo.

Para apresentar apenas os exemplos, defina `VITE_DATA_MODE=demo` e reinicie. Nesse modo os dados ficam no navegador e **Restaurar exemplos** está disponível. Os exemplos não são importados para o Supabase; trocar de modo mantém os conjuntos separados. Use o modo Supabase para os cadastros reais do cliente.

## 6. Habilitar a recuperação de senha

Em **Authentication → URL Configuration**:

- **Site URL:** o endereço HTTPS final do sistema. Durante os testes exclusivamente locais, use `http://localhost:5173`.
- **Redirect URLs:** inclua `http://localhost:5173/`, `http://127.0.0.1:5173/` e o endereço HTTPS exato da hospedagem, por exemplo `https://katiellefaleiros.com.br/`. Inclua o domínio `pages.dev` se ele também for usado para acessar o sistema. Mantenha a barra final para corresponder ao redirecionamento da aplicação na raiz do site.

Use seu domínio real; os endereços acima são exemplos. A aplicação solicita o redirecionamento para o mesmo endereço em que o usuário está acessando. O link abre a tela de nova senha, que exige pelo menos 12 caracteres e confirmação.

Para enviar recuperação ao e-mail do cliente, configure um provedor em **Authentication → SMTP Settings** e valide a entrega. O serviço padrão do Supabase tem restrições de envio e não deve ser presumido como suficiente para contas de clientes. A tela mostra uma resposta genérica ao solicitar recuperação; confirme a chegada do e-mail e a troca da senha em um teste real. As credenciais SMTP ficam no painel do Supabase, não no frontend.

## 7. Publicar no Cloudflare Pages

1. Conecte o repositório `Thalesgcostta/SiteStudioPersonal` e a branch `main`.
2. Configure o build:

| Campo                         | Valor               |
| ----------------------------- | ------------------- |
| Framework                     | Vite / React        |
| Diretório raiz                | raiz do repositório |
| Comando de build              | `npm run build`     |
| Diretório de saída            | `dist`              |
| Versão do Node, se solicitada | `22` ou superior    |

3. Nas variáveis de **Production**, adicione os mesmos três nomes e valores de `.env.local`.
4. Faça um novo deploy. As variáveis são usadas no build; alterar um valor exige reconstruir/publicar o site.
5. Configure seu domínio em **Custom domains** e inclua o endereço final nas URLs autorizadas do Supabase.
6. Entre no domínio final e repita cadastro, recebimento, recarga e saída da conta.

Para **Preview**, prefira `VITE_DATA_MODE=demo` ou um projeto Supabase separado para testes. Um preview conectado à produção consegue alterar os mesmos dados quando um administrador entra nele.

Não é necessário publicar a pasta `supabase` como servidor. As migrações são aplicadas no Supabase; o Pages entrega `dist`. O domínio pode ser registrado no Registro.br e configurado no Pages.

## Operação e limites desta versão

As novas opções de perfil, capacidade, preços de exames, fotos, categorias e Dashboard individual estão detalhadas no [guia da atualização de gestão](ATUALIZACAO_GESTAO.md).

- **Exibição:** em Configurações → Tamanho da exibição, escolha 100%, 110%, 125% ou 150%. A preferência é aplicada imediatamente e salva neste navegador; não modifica as configurações de outros dispositivos e não amplia a interface em celulares.
- **Endereço por CEP:** o cadastro e a edição consultam ViaCEP ao sair do campo com 8 dígitos, apertar Enter ou usar Buscar CEP. A consulta preenche rua, bairro, cidade e estado; acrescente número/complemento no campo Endereço. CEPs gerais podem fornecer somente cidade/estado. A consulta envia apenas o CEP ao serviço público e o resultado fica salvo no campo de endereço existente. Não é necessária uma nova migração. Falhas de consulta permitem preenchimento manual, e respostas de buscas antigas não sobrescrevem uma nova busca ou edição manual.
- **Mensalidades:** novos alunos ativos com início até o fim do mês recebem a cobrança atual. Para os meses seguintes, selecione a competência e use **Gerar mensalidades**. O banco evita duplicatas e exclui inativos e alunos com início posterior à competência. Não há rotina mensal agendada. Alterar plano ou preço preserva cobranças emitidas.
- **Financeiro:** usa a data efetiva do recebimento/venda. Pagamentos parciais não podem superar o saldo. Vendas validam preço e estoque no banco e gravam os itens e a baixa em uma transação. São registros administrativos; não há integração com banco, Pix ou adquirente.
- **Comprovantes:** PNG, JPEG, WebP e PDF até 5 MB. O download usa a sessão administrativa. Se o envio funcionar e a gravação do recebimento falhar, pode restar um arquivo sem vínculo no bucket. Confira o resultado antes de reenviar e revise esses arquivos no painel quando necessário.
- **Várias sessões:** gravações e **Atualizar dados** recarregam o estado do banco. Pagamentos e vendas têm validações de conflitos; a edição de produtos detecta versões desatualizadas. Não há sincronização automática em tempo real. Outros cadastros/configurações podem ser substituídos pela última edição administrativa.
- **Dados locais:** no modo Supabase, os dados de negócio não são gravados no `localStorage` da aplicação. O SDK mantém a sessão no navegador. O modo demo guarda seu próprio conjunto fictício em uma chave separada.
- **Entrada dos 150 alunos:** use a tela de cadastro. Não foi criada importação em lote nem conversão automática dos exemplos. Não crie contas de autenticação para os alunos.
- **Backups:** defina e teste uma rotina de backup e restauração do PostgreSQL e dos arquivos privados antes de adotar o sistema como controle principal. O CSV do Financeiro é um relatório, não um backup completo. Backup e retenção dependem do plano contratado no Supabase.

## Validação do código

```sh
npm run build
npm test
```

Os testes executam migrações, RLS e funções em PostgreSQL local com PGlite, verificam a demonstração em Chromium e exercitam o SDK Supabase contra uma API de teste que chama essas funções SQL. Auth, Storage HTTP e respostas do ViaCEP são simulados; os testes não criam nem alteram seu projeto remoto. Os testes de exibição verificam ampliação, persistência, acessibilidade e adaptação das oito áreas e dos modais a diferentes larguras de tela.

Instale o Chromium do Playwright com `npx playwright install chromium` se necessário, ou informe um executável via `CHROMIUM_PATH`. O ambiente de nuvem preparado já possui Chromium. Os testes usam portas 5180 e 5181 e não reutilizam o servidor conectado ao seu banco real.

## Problemas comuns

| Sintoma                              | O que conferir                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Tela pede configurar Supabase        | Valores reais em `.env.local`, modo `supabase` e reinício do Vite; na hospedagem, variáveis de Production e novo build.   |
| E-mail ou senha incorretos           | Conta criada em Authentication no mesmo projeto e e-mail confirmado.                                                      |
| Usuário sem permissão administrativa | UUID exato da conta em `public.studio_admins`.                                                                            |
| Função ou tabela não encontrada      | Primeira migração completa e URL do projeto correto.                                                                      |
| Envio de comprovante falha           | Segunda migração, bucket privado, sessão administrativa, tipo e tamanho do arquivo.                                       |
| Gravação falha ou conexão cai        | Confira **Atualizar dados** antes de repetir pagamentos ou vendas. A confirmação pode se perder depois de o banco salvar. |
| Produto alterado em outra sessão     | Cancele, atualize os dados e abra a edição novamente.                                                                     |
| Recuperação não chega                | URLs autorizadas, SMTP, spam e logs de Authentication.                                                                    |
| Não há alunos/produtos após login    | É o estado inicial esperado do banco real; comece o cadastro.                                                             |
