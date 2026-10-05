# Katielle Faleiros · Gestão do studio

Protótipo navegável de uma área administrativa, em português do Brasil, criado com React, TypeScript e Vite. A identidade usa o laranja `#FF6800`, o azul `#579ABA` e as formas geométricas da referência KF enviada. O símbolo foi reproduzido em SVG para manter nitidez e proporções; a imagem final da marca pode ser carregada em **Configurações → Identidade visual**.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e npm. O ambiente preparado usa Node.js 24.

```sh
cd /workspace/SiteStudioPersonal
npm ci
npm run dev -- --port 5173 --strictPort --force
```

Não são necessários serviços externos, variáveis de ambiente ou credenciais. A tipografia Inter e os ícones são servidos localmente, e os produtos usam ilustrações vetoriais.

```sh
npm run build
npm test
```

Os testes de navegação usam Chromium. O ambiente atual já oferece `/usr/bin/chromium`. Em outra máquina, execute `npx playwright install chromium` ou informe o caminho de um Chromium instalado por meio de `CHROMIUM_PATH`.

## Roteiro de apresentação

1. **Dashboard:** competência mensal, indicadores, gráfico, distribuição de mensalidades, agenda do dia, cobranças em aberto, avaliações e atalhos.
2. **Alunos:** busca, filtros, tabela/cartões, perfil e cadastro com os cinco planos solicitados. Os dias escolhidos devem corresponder ao plano; os horários são preferências.
3. **Agenda e horários:** grade recorrente semanal, consulta por dia/horário e agenda diária em celular. Capacidade demonstrativa de quatro alunos por horário.
4. **Bioimpedância:** registro, histórico, IMC calculado, evolução, comparação sem classificação de melhora/piora e agendamento de avaliações.
5. **Mensalidades:** competências, filtros, recebimentos totais e parciais, formas de pagamento e confirmação simulada. O comprovante demonstra apenas o nome do arquivo selecionado.
6. **Produtos:** catálogo, categorias, carrinho, quantidades, desconto, aluno opcional, baixa de estoque, histórico e produtos mais vendidos.
7. **Financeiro:** receitas separadas entre mensalidades e produtos, despesas, outras receitas, filtros de período/categoria, exclusão com confirmação e exportação CSV.
8. **Configurações:** dados do studio, logo e cores, valores dos planos, funcionamento e formas de pagamento.

## Dados e limites

Todos os dados são fictícios e ficam no `localStorage` deste navegador. O mês inicial acompanha a data em `America/Sao_Paulo`, e o conjunto demonstrativo contém seis competências. **Configurações → Restaurar exemplos** recria os exemplos após confirmação.

O financeiro usa regime de caixa: a data do recebimento determina a receita, enquanto a competência identifica a cobrança. Alterar um plano não altera cobranças emitidas. Novos alunos ativos recebem uma cobrança da competência atual. Vendas e recebimentos atualizam o dashboard e o financeiro a partir do mesmo estado.

Este protótipo não oferece autenticação, servidor, transações reais, envio de mensagens ou armazenamento seguro de documentos. A indicação de área privada representa o contexto administrativo da interface. Utilize somente dados fictícios durante a apresentação.

O layout inclui navegação responsiva, foco visível, modais com foco contido e fechamento por Escape, feedback de ações e respeito à preferência por movimento reduzido.

Capturas para revisão: [dashboard no desktop](docs/dashboard-desktop.png) e [dashboard no celular](docs/dashboard-mobile.png).
