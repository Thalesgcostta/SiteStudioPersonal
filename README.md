# Katielle Faleiros · Gestão do studio

Sistema administrativo em português do Brasil, com React, TypeScript, Vite e integração com Supabase + PostgreSQL. Somente administradores acessam o sistema; os alunos são registros do studio. A identidade usa o laranja `#FF6800`, o azul `#579ABA` e a marca KF em SVG. A logo final pode ser carregada em **Configurações → Identidade visual**.

## Conectar o banco

Siga o [passo a passo do Supabase](docs/SUPABASE.md) para criar o projeto, executar as migrações, autorizar a administradora e configurar o acesso local e no Cloudflare Pages. O arquivo [.env.example](.env.example) lista as variáveis públicas do frontend.

- **Modo `supabase`:** login por e-mail/senha, autorização administrativa, dados persistidos no PostgreSQL, operações transacionais e comprovantes privados.
- **Modo `demo`:** apresentação com dados fictícios no `localStorage`, sem serviço externo. É o padrão quando não há configuração de Supabase.

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
2. **Alunos:** busca, filtros, perfil, cadastro, edição e ativação/inativação. Os dias escolhidos correspondem ao plano; os horários representam preferências.
3. **Agenda e horários:** grade semanal e consulta por dia/horário, com visão diária em celular. A capacidade indicada de quatro alunos é uma referência visual e não bloqueia cadastros.
4. **Bioimpedância:** registro, histórico, IMC, evolução, comparação e agendamento de avaliações.
5. **Mensalidades:** geração por competência, recebimentos totais e parciais, formas de pagamento e comprovantes. Em demo, o anexo registra apenas o nome; em Supabase, envia o arquivo para armazenamento privado.
6. **Produtos:** cadastro e edição, catálogo, carrinho, desconto, aluno opcional, estoque e histórico de vendas.
7. **Financeiro:** mensalidades, produtos, despesas e outras receitas, filtros, confirmação de exclusão e relatório CSV.
8. **Configurações:** studio, logo, cores, preços dos planos, funcionamento e formas de pagamento.

O financeiro usa regime de caixa: a data do recebimento determina a receita. Alterar um plano não altera cobranças emitidas. As mensalidades dos meses seguintes são geradas pela ação **Gerar mensalidades**; não há agendamento automático. Gravações recarregam o estado persistido, e **Atualizar dados** permite consultar alterações de outra sessão.

Não há processamento de pagamentos, envio de mensagens, importação em lote ou acesso de alunos nesta versão. Consulte no [guia](docs/SUPABASE.md#operação-e-limites-desta-versão) os detalhes de operação, conflitos entre sessões e backups.

O layout inclui navegação responsiva, foco visível, modais com foco contido, feedback de ações e respeito à preferência por movimento reduzido.

Capturas da demonstração: [dashboard no desktop](docs/dashboard-desktop.png) e [dashboard no celular](docs/dashboard-mobile.png).
