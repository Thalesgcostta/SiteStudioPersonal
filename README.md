# Katielle Faleiros · Gestão do studio

Sistema administrativo em português do Brasil, com React, TypeScript, Vite e integração com Supabase + PostgreSQL. Somente administradores acessam o sistema; os alunos são registros do studio. A identidade usa o laranja `#FF6800`, o azul `#579ABA` e a marca KF em SVG. A logo final pode ser carregada em **Configurações → Identidade visual**.

## Conectar o banco

Para atualizar uma instalação já configurada até a migração 004, aplique a [atualização de cadastro e financeiro](docs/ATUALIZACAO_CADASTRO_FINANCEIRO.md) (007). Ela acrescenta endereços separados, despesas fixas e formulário de alunos por link, preservando os históricos. O build continua `npm run build` e também gera `cadastro.html`.

Para atualizar um site já em operação, siga [Atualizar produtos e estoque](docs/ATUALIZACAO_ESTOQUE.md): se a migração 003 já foi aplicada, execute somente 004. Caso tenha apenas 001 e 002, aplique [a atualização de gestão](docs/ATUALIZACAO_GESTAO.md) (003) antes de 004. Os registros existentes são preservados. Todos os usuários cadastrados são administradores; mantenha o cadastro público de Authentication desabilitado.

Siga o [passo a passo do Supabase](docs/SUPABASE.md) para criar o projeto, executar as migrações, autorizar a administradora e configurar o acesso local e no Cloudflare Pages. O arquivo [.env.example](.env.example) lista as variáveis públicas do frontend.

- **Modo `supabase`:** login por e-mail/senha, autorização administrativa, dados persistidos no PostgreSQL, operações transacionais e comprovantes privados.
- **Modo `demo`:** apresentação com dados fictícios no `localStorage`, sem exigir configuração do Supabase. É o padrão quando não há configuração de Supabase.

O banco real inicia sem os exemplos do navegador. Os modos não importam dados um do outro. Configure `VITE_DATA_MODE=supabase` explicitamente na hospedagem do cliente.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e npm. Dentro da pasta do projeto:

```sh
npm ci
npm run dev -- --port 5173 --strictPort --force
```

Para conectar ao Supabase, copie `.env.example` para `.env.local` e preencha a URL e a chave **publishable** conforme o guia. Nunca inclua `service_role`, chaves secretas ou senha do banco em variáveis `VITE_`. Reinicie o Vite depois de alterar variáveis.

```sh
npm run build
npm test
```

O build de produção fica em `dist`, pronto para o Cloudflare Pages. Tipografia Inter, ícones e ilustrações são servidos localmente.

Os testes cobrem SQL/RLS/transações em PostgreSQL local, fluxos da demonstração e integração da interface com o SDK Supabase e uma API simulada. Nenhum teste acessa seu banco remoto. Os testes de navegador usam Chromium: `npx playwright install chromium` ou `CHROMIUM_PATH` para um executável existente. O ambiente de nuvem usa `/usr/bin/chromium`.

## Áreas do sistema

1. **Dashboard:** competência mensal, indicadores, receitas, distribuição de mensalidades, agenda, cobranças em aberto e avaliações.
2. **Alunos:** busca, filtros, perfil, cadastro, edição e ativação/inativação. Endereço em campos separados, com CEP opcional e busca pelo ViaCEP. O cadastro por link recebe dados dos alunos sem login e aguarda conferência/ativação. Os dias escolhidos correspondem ao plano; os horários representam preferências.
3. **Agenda e horários:** grade semanal e consulta por dia/horário, com visão diária em celular, capacidade configurável e células que acomodam os alunos. Novos encaixes respeitam o limite; horários antigos acima do limite permanecem visíveis.
4. **Bioimpedância:** pesquisa do aluno, registro, histórico, IMC, evolução, comparação, agendamento e recebimentos integrais/parciais conforme o preço configurado.
5. **Mensalidades:** geração por competência, recebimentos totais e parciais, formas de pagamento e comprovantes. Em demo, o anexo registra apenas o nome; em Supabase, envia o arquivo para armazenamento privado.
6. **Produtos:** cadastro, categorias configuráveis, fotos da galeria ou 12 desenhos à escolha, catálogo, carrinho flutuante exibido com itens, desconto, aluno opcional, controle de estoque com edição/exclusão e histórico de vendas preservado.
7. **Financeiro:** mensalidades, produtos, bioimpedância, despesas e outras receitas; despesas fixas mensais editáveis com confirmação de pagamento, sem duplicidade; filtros por origem e período aplicados aos valores, gráficos, histórico e CSV. Calendário automático e navegação para competências de outros anos.
8. **Configurações:** studio, identidade visual, planos, capacidade, preço dos exames, categorias, perfil da conta, Dashboard individual e tamanho da exibição (100%, 110%, 125% ou 150%). As fontes da interface foram aumentadas; o ajuste de exibição permanece salvo neste navegador.

Os endereços separados, as despesas fixas e o cadastro público requerem a migração 007. O endereço legível continua em `students.address`, e os campos separados ficam em `students.address_fields`. A consulta de CEP requer acesso a `https://viacep.com.br`; se o serviço estiver indisponível ou não encontrar o CEP, os campos podem ser preenchidos manualmente.

O financeiro usa regime de caixa: a data do recebimento determina a receita. Alterar um plano não altera cobranças emitidas. As mensalidades dos meses seguintes são geradas pela ação **Gerar mensalidades**; não há agendamento automático. Gravações recarregam o estado persistido, e **Atualizar dados** permite consultar alterações de outra sessão.

Não há processamento de pagamentos, envio de mensagens, importação em lote ou acesso de alunos nesta versão. Consulte no [guia](docs/SUPABASE.md#operação-e-limites-desta-versão) os detalhes de operação, conflitos entre sessões e backups.

O layout inclui navegação responsiva, foco visível, modais com foco contido, feedback de ações e respeito à preferência por movimento reduzido.

Capturas da demonstração: [dashboard no desktop](docs/dashboard-desktop.png) e [dashboard no celular](docs/dashboard-mobile.png).
