# Endereço, despesas fixas e cadastro de alunos por link

Para uma instalação que já usa as migrações 001 a 004, execute apenas o conteúdo completo de [`202610170007_studio_registration_expenses.sql`](../supabase/migrations/202610170007_studio_registration_expenses.sql) no SQL Editor do mesmo Supabase do administrativo. As migrações 005/006 do portfólio podem permanecer instaladas; esta atualização não altera sua função de planos públicos.

O comando de build do administrativo continua sendo `npm run build`, com saída em `dist/`. Ele também gera `cadastro.html`. As mesmas variáveis públicas de Supabase do administrativo precisam estar disponíveis durante esse build; não há um segundo projeto ou uma nova chave para o formulário.

## Endereço e vendas

O endereço tem CEP opcional, rua, número (inclusive letras ou S/N), complemento, bairro, cidade e estado. O ViaCEP completa os campos de localização e preserva número e complemento. Os dados estruturados são guardados em `students.address_fields`; a coluna `address` mantém uma representação legível para o histórico e os clientes anteriores. Endereços antigos não são apagados. Ao editar um endereço antigo, confira a divisão dos campos.

O resumo da venda aparece após adicionar um produto, em painel flutuante. É possível minimizar e reabrir pelo botão do carrinho. Esvaziar ou finalizar a venda oculta o painel. As regras de estoque e confirmação do pagamento são preservadas.

## Despesas e competência

Em **Financeiro → Despesas fixas**, cadastre aluguel, funcionários e outras despesas mensais. Configure valor, vencimento e primeira competência. A última competência é opcional e encerra a recorrência. Vencimentos nos dias 29, 30 ou 31 usam o último dia disponível nos meses mais curtos.

As despesas previstas aparecem automaticamente nas competências correspondentes, sem tarefas agendadas. Use **Registrar pagamento** quando a saída ocorrer. O regime de caixa permanece: indicadores e gráficos usam a data e o valor efetivamente pagos. Editar a despesa não reescreve os pagamentos anteriores; o valor novo vale para pagamentos ainda não registrados. Há proteção contra pagamento duplicado e edição desatualizada.

Os meses são calculados em tempo de execução, no fuso de São Paulo. A interface verifica a mudança de data também com a aba aberta e ao retornar a ela. A competência atual avança na virada do mês; uma competência histórica escolhida pelo usuário permanece selecionada. As setas permitem navegar para outros meses sem limite fixo de ano. O gráfico do Dashboard acompanha os seis meses que terminam na competência selecionada.

## Formulário público

Em **Alunos → Cadastro por link**, copie o endereço e envie aos alunos. Ele abre `cadastro.html` com uma identificação do link no fragmento da URL. Os alunos não precisam de conta ou login. É possível desativar o recebimento e gerar um novo link, invalidando o anterior.

O formulário pede dados pessoais, endereço, contato de emergência, frequência e horários de preferência, além de autorização para o cadastro. O envio salva o aluno diretamente em `students`, com status **Cadastro pendente**, sem ocupar uma vaga ou criar cobrança. A equipe confere as informações e ativa o cadastro. A ativação verifica capacidade da agenda e cria a primeira mensalidade quando a data de início permitir.

Um CPF já existente recebe a mesma confirmação, sem revelar ou sobrescrever seu cadastro. A função pública não aceita status ativo, identificadores de alunos ou condições financeiras enviados pelo visitante, não dá acesso às tabelas e não retorna registros pessoais. O cliente público não importa o login nem utiliza a sessão administrativa. Reenvios da mesma solicitação são idempotentes; há validação no banco e limite de 300 novos envios por 10 minutos.

## Verificação

Os testes de PostgreSQL cobrem as permissões, persistência, reenvio, duplicidade de CPF, disponibilidade de agenda, edição das despesas e preservação de pagamentos. Os testes de navegador cobrem endereço manual e por CEP, painel flutuante, envio público até a ativação no administrativo, responsividade e passagem de dezembro de 2026 para janeiro de 2027, ano de 2032 e fevereiro bissexto de 2028.

Os testes usam PostgreSQL local e uma API simulada para transporte, sem alterar o Supabase do cliente.
