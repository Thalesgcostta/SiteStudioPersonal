# Atualização de produtos e estoque

Esta versão acrescenta a terceira aba **Controle de estoque**, edição completa dos produtos, ajuste direto de quantidades, exclusão com preservação das vendas e 12 desenhos à escolha para os produtos sem foto.

## Atualizar o banco do site publicado

1. Faça um backup antes de atualizar o banco de produção.
2. Se a atualização de gestão (003) já foi executada, abra **Supabase → SQL Editor → New query** e execute apenas o conteúdo completo de [`supabase/migrations/202610140004_product_inventory.sql`](../supabase/migrations/202610140004_product_inventory.sql).
3. Se o banco ainda tem somente as migrações 001 e 002, siga primeiro [a atualização de gestão](ATUALIZACAO_GESTAO.md) para aplicar 003 e, depois, aplique 004.
4. No **Cloudflare → Workers & Pages → projeto → Deployments**, aguarde **Success** para o commit desta atualização. Recarregue o site depois do SQL e do deploy.

Não é preciso recriar tabelas nem mudar as variáveis de ambiente. A migração mantém os produtos, suas fotos, quantidades e preços, além das vendas existentes. Ela acrescenta o desenho escolhido e a indicação de exclusão. Execute as migrações na ordem: repetir apenas 003 depois de 004 reinstala as funções da versão anterior.

Se aparecer **Atualização do banco pendente**, confira se o SQL foi executado no mesmo projeto de `VITE_SUPABASE_URL` e recarregue o site. Enquanto 004 estiver pendente, catálogo, vendas e edição básica do estoque continuam disponíveis; exclusão e escolha dos novos desenhos ficam bloqueadas.

## Controle de estoque

Em **Vendas de produtos → Controle de estoque**:

- Consulte o total de produtos, unidades disponíveis e itens com estoque baixo ou zerado.
- Pesquise por nome, descrição ou categoria. Os filtros permitem selecionar uma categoria e consultar produtos com estoque acima de 3, baixo (1 a 3) ou zerado.
- Altere a **Quantidade disponível** na própria linha e clique em **Salvar**. O número representa o estoque total atual, e deve ser inteiro e maior ou igual a zero.
- Use **Editar** para alterar nome, categoria, preço, quantidade, descrição, cor, foto ou desenho.
- Use **Excluir** e confirme para retirar o produto do catálogo e do estoque. Ele também deixa de participar de novas vendas e dos alertas de estoque. As vendas anteriores e suas receitas continuam no histórico e no financeiro.

A exclusão é guardada como um registro de retirada, preservando os vínculos necessários ao histórico. Por isso, uma categoria ainda vinculada a um produto excluído permanece protegida contra remoção. O arquivo da foto continua no Storage. Esta versão não inclui uma tela para restaurar produtos excluídos.

Alterações de estoque e exclusões verificam a versão do produto. Se outro administrador vender ou editar o item enquanto o formulário estiver aberto, a operação desatualizada é recusada para evitar que o estoque seja sobrescrito. Atualize os dados antes de tentar novamente.

## Escolher um desenho

Em **Cadastrar produto** ou **Editar produto**, o campo **Desenho padrão do produto** oferece:

1. Whey protein
2. Pré-treino
3. Creatina
4. Barra de proteína
5. Coqueteleira
6. Garrafa de água
7. Elástico de resistência
8. Halter
9. Tapete de treino
10. Camiseta fitness
11. Vitaminas
12. Pasta de amendoim

Escolher um desenho substitui a foto vinculada. **Cor da ilustração** personaliza o desenho, e **Usar imagem padrão da categoria** retorna ao padrão automático. Uma nova foto da galeria tem prioridade sobre o desenho. Os desenhos são SVGs locais, sem upload ou consumo adicional do Storage.

## Validação

```sh
npm run build
npm test
```

Os testes de banco validam a edição, os desenhos, as permissões, a exclusão idempotente, a preservação das vendas e a migração de produtos antigos. Os testes de navegador validam o estoque, a escolha do desenho, a exclusão e a manutenção dos valores financeiros, incluindo recarregamento e visualização mobile.

Auth e Storage HTTP são simulados nos testes de integração; o SQL é executado em PostgreSQL local. A migração não é aplicada automaticamente ao Supabase hospedado pelo deploy do Cloudflare.
