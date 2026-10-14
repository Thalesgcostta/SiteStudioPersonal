# Atualizar o studio já publicado

Esta versão acrescenta perfil da conta logada, fontes maiores, capacidade por horário, cobrança de bioimpedância, categorias e fotos de produtos, filtros financeiros e Dashboard individual.

Depois desta atualização (003), siga também [a atualização de produtos e estoque](ATUALIZACAO_ESTOQUE.md) para aplicar 004 e habilitar exclusão e desenhos dos produtos. Para um projeto que já tem 003, execute somente 004.

## 1. Preparar o acesso administrativo

No Supabase, abra **Authentication → Providers / Sign In** e confirme que **Allow new users to sign up está desabilitado**. Não há cadastro público de alunos: as contas são criadas pelo responsável em **Authentication → Users → Add user**.

A migração autoriza todos os usuários de Authentication que já existem e autoriza automaticamente os próximos usuários criados. Todos são administradores do mesmo studio, conforme solicitado. Por isso, mantenha o cadastro público desabilitado antes de executar o SQL.

## 2. Executar a nova migração

Faça um backup do banco antes de atualizar o ambiente de produção. No **SQL Editor → New query**, copie o conteúdo completo de:

[`supabase/migrations/202610140003_studio_management.sql`](../supabase/migrations/202610140003_studio_management.sql)

Execute e confirme o resultado de sucesso. Para um projeto já conectado, **somente o arquivo 003 é necessário**. Não é preciso recriar as tabelas nem executar novamente os arquivos 001 e 002.

A migração preserva alunos, cobranças, pagamentos, vendas e avaliações. Exames antigos recebem valor zero, sem cobrança retroativa. Ela cria as tabelas de recebimentos de exames e Dashboard por usuário, acrescenta capacidade/preço nas configurações e instala o bucket privado `product-images`.

O SQL roda em uma transação: se ocorrer erro, a atualização não fica aplicada pela metade. Ele pode ser repetido para reinstalar as definições, mas também volta a autorizar todos os usuários atuais de Authentication; considere isso se alguma conta teve sua permissão removida manualmente.

## 3. Conferir o deploy

O código está na branch `main`, que o Cloudflare Pages acompanha. Abra **Workers & Pages → projeto → Deployments** e aguarde **Success** no commit mais recente. Se necessário, use **Retry deployment / Redeploy**.

Mantenha as variáveis atuais de Supabase. Não há nova variável, senha ou chave para essa atualização.

Depois do SQL e do deploy, recarregue o site. Se aparecer **Atualização do banco pendente**, confira se o arquivo 003 foi executado no mesmo projeto indicado em `VITE_SUPABASE_URL`. O código mantém a consulta dos dados e os fluxos anteriores durante essa transição, bloqueando gravações das funções que dependem da nova estrutura. Após executar o SQL, recarregar a página libera as funções.

## 4. Configurar e validar

1. **Configurações → Meu perfil:** confirme o e-mail e informe o nome de exibição. O avatar, os menus e a saudação do Dashboard acompanham esse nome. Sem nome cadastrado, o sistema usa o identificador do e-mail.
2. **Fontes:** o tamanho dos textos foi aumentado na própria interface, inclusive tabelas, campos e botões. O ajuste de exibição continua disponível; se você usava 125% ou 150%, pode experimentar voltar a 100% com as fontes novas.
3. **Horários e pagamentos:** configure o máximo de alunos por horário, de 1 a 50. A agenda mostra ocupação e aumenta a altura das células para acomodar os nomes. Novos encaixes e reativações respeitam o limite no banco. Reduzir o limite não exclui alunos de horários existentes: esses horários ficam marcados como excedidos e precisam ser reorganizados. A edição de dados pessoais mantém os horários existentes.
4. **Valor da bioimpedância:** configure o preço, que começa em zero. O valor é capturado quando um exame é registrado e não muda se o preço for alterado depois.
5. **Bioimpedância:** digite o nome em Pesquisar aluno e selecione o resultado. A busca também está no formulário de nova avaliação. Ao registrar o exame, marque Registrar pagamento agora apenas se ele tiver sido recebido. Caso contrário, use Receber exame depois; são aceitos recebimentos parciais até o saldo. Avaliações com pagamentos ficam protegidas contra exclusão para preservar o financeiro.
6. **Categorias de produtos:** adicione categorias e salve. Categorias com produtos não podem ser removidas.
7. **Produtos:** cadastre ou edite o item e escolha uma foto da galeria (PNG, JPEG ou WebP até 2 MB), ou use a imagem padrão da categoria. Fotos ficam em bucket privado e são exibidas com links temporários autenticados. Remover a foto do produto retira o vínculo; o arquivo anterior pode permanecer no Storage para revisão posterior.
8. **Financeiro:** escolha Tudo, Mensalidades, Produtos ou Bioimpedância. Indicadores, gráfico, lista e CSV seguem a origem e os filtros do período. Receitas usam a data efetiva do pagamento. No filtro de uma origem, despesas gerais não são atribuídas ao serviço: a tela mostra a receita daquela origem e seu saldo a receber. O gráfico mostra até 36 meses do período selecionado.
9. **Dashboard:** marque os itens desejados, escolha a largura e use as setas para mudar a ordem. As posições seguem da esquerda para a direita e de cima para baixo. Salve e volte ao Dashboard. A organização é guardada por usuário, sem alterar a organização dos outros administradores.

Confirme a persistência recarregando a página após salvar. Para testar uma segunda conta, crie-a pelo painel de Authentication e entre em outro navegador; ela terá acesso administrativo e seu próprio Dashboard.

## Verificações do código

Os testes executam as migrações em PostgreSQL local, incluindo uma base com registros anteriores, permissões, capacidade, pagamentos, categorias e organização individual. Os testes de navegador cobrem o perfil, pesquisas, pagamentos de exames, fotos, filtros, persistência, acessibilidade e telas ampliadas.

```sh
npm run build
npm test
```

Auth, Storage HTTP e ViaCEP são simulados nos testes de integração; as funções SQL são executadas em PostgreSQL. Não foram aplicadas alterações diretamente no seu Supabase hospedado nem confirmada a publicação no seu domínio por esses testes.
