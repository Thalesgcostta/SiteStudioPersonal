# Exclusão definitiva de alunos e rótulos do gráfico

Em uma instalação com a migração 007 já aplicada, execute somente o conteúdo completo de `supabase/migrations/202610170008_student_deletion.sql` no SQL Editor do mesmo Supabase do administrativo. A instalação não exclui alunos. O build continua `npm run build`, na branch `main`.

Em **Alunos**, abra o perfil e clique em **Excluir aluno**. Confira o nome e confirme. Funciona com alunos ativos, inativos e cadastros pendentes recebidos pelo link. Cancelar não altera nada. A exclusão exige uma sessão administrativa e remove, em uma transação:

- Cadastro e preferências de horário.
- Agendamentos e bioimpedâncias, incluindo seus recebimentos.
- Mensalidades e recebimentos vinculados.
- Vendas e itens de vendas vinculados ao aluno.

A exclusão é irreversível. Indicadores financeiros passam a refletir os registros restantes. O estoque não é alterado: apagar um cadastro não registra devolução física de mercadorias. Dados de outros alunos e movimentações avulsas permanecem. Arquivos de comprovantes previamente enviados ao bucket privado do Storage não são apagados por essa operação; sua remoção, quando necessária, deve ser feita no Storage do Supabase.

Se o objetivo for manter o histórico de um aluno que deixou de treinar, use **Inativar aluno**.

No gráfico, o eixo horizontal mostra apenas o mês abreviado. Os detalhes dos pontos e **Ver valores do gráfico** continuam mostrando mês e ano, permitindo distinguir competências em períodos com vários anos.
