# Plano de 6 vezes e autorização de imagem

O portfólio de `katiellefaleiros.com.br` agora apresenta os planos de 2 a 6 vezes por semana. A frequência de 6 vezes começa em R$ 600,00/mês. Os preços publicados vêm da função pública `get_public_studio_plans` do mesmo Supabase da gestão, sem consultar sessões ou dados de alunos. Alterações em **Configurações → Planos e valores** aparecem no portfólio ao recarregar.

## Publicação

1. No Supabase usado pela gestão, aplique `supabase/migrations/202611060009_image_consent.sql` após a 008, antes de publicar os frontends. A migração cria o sexto plano somente se ele ainda não existe, preserva os demais preços e não altera mensalidades já emitidas. Pode ser repetida sem redefinir o valor do sexto plano.
2. Publique a gestão (`npm ci && npm run build`, saída `dist`) em `gestao.katiellefaleiros.com.br`. O build inclui `cadastro.html`.
3. Publique o portfólio (`npm ci && npm run build:site`, saída `dist-site`) em `katiellefaleiros.com.br`. Configure **no build** `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do mesmo projeto usado pela gestão. Nunca use chaves secretas ou service_role em `VITE_*`.
4. Confira os cinco cartões de 2 a 6 vezes no portfólio, o sexto valor na gestão e um novo cadastro pelo link com seis dias de preferência. A ativação continua sujeita à capacidade dos horários e gera a mensalidade com o valor vigente.

A gestão é publicada a partir de `main` e o portfólio a partir de `feat/public-portfolio`. Não é necessário mesclar as branches. Em uma instalação já atualizada até 008, execute somente a 009, disponível na branch `main`.

Antes da migração, o formulário continua enviando o payload anterior e não oferece a nova autorização. Após aplicar a 009 e reabrir o link, a autorização aparece automaticamente. O portfólio preserva os quatro preços anteriores caso a RPC antiga ainda não retorne o sexto plano; somente o sexto fica sob consulta.

## Autorização de imagem

O cadastro por link oferece uma caixa separada, opcional e desmarcada:

> Autorizo o uso da minha imagem em fotos e vídeos para divulgação do studio em seu site e redes sociais. Esta autorização é opcional e pode ser revogada entrando em contato com o studio.

A escolha é salva em `students.image_consent`, com data em `image_consent_at` e versão `2026-11-06-v1` em `image_consent_version`. O perfil administrativo mostra **Autorizado**, **Não autorizado** ou **Não informado**. Cadastros antigos ficam sem autorização registrada. Um novo envio com CPF já existente não altera a escolha anterior. O formulário antigo continua compatível: se não enviar a escolha, ela será registrada como não autorizada.

A autorização de uso dos dados para cadastro permanece separada e obrigatória. Uma solicitação de revogação deve ser atendida pela equipe do studio; esta atualização não cria um fluxo automático de revogação.

## Validação local

Na branch `main`: `npm run build`, `npm run test:database` e `npx playwright test --project=supabase --grep 'formulário público'`. Na branch `feat/public-portfolio`: `npm run build:site` e `npm run test:site`.

Os testes usam banco PostgreSQL embarcado e API simulada, sem alterar o Supabase de produção.
