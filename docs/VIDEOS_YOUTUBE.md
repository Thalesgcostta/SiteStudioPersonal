# Vídeos do canal no portfólio

A seção **“Um pouco do studio. Muito sobre cuidar.”** apresenta um vídeo principal e mais três espaços para miniaturas, nas cores laranja e azul da KF. O vídeo inicial é o indicado pelo studio: <https://youtu.be/ZsS8bJw2i9k>. Os outros três espaços ficam vazios até a escolha de novos vídeos.

## Preparar o Supabase

No mesmo projeto usado pela gestão e pelo portfólio, execute **somente a nova migração**, após a 009:

[`supabase/migrations/202611140010_studio_videos.sql`](../supabase/migrations/202611140010_studio_videos.sql)

Ela cria a seleção editorial e três RPCs, sem alterar alunos, planos, cobranças ou arquivos. Inicializa apenas uma seleção inexistente; reaplicar não sobrescreve os vídeos já escolhidos, nem uma seleção esvaziada. O SQL deve ser aplicado no banco remoto para habilitar a edição em produção. Os testes locais não o aplicam no Supabase do cliente.

## Escolher os vídeos na gestão

1. Acesse **Configurações → Vídeos do YouTube** com sua conta administrativa.
2. Cole o link e escreva um título de até 120 caracteres. São aceitos links de vídeos normais, Shorts, lives e links `youtu.be`.
3. Use as setas para ordenar: o primeiro vídeo é o destaque, os próximos três são miniaturas. É possível deixar espaços sem seleção.
4. Clique em **Salvar vídeos**. Recarregue o portfólio para ver a seleção atualizada; não é necessário novo deploy a cada alteração.

A seleção é manual. Novos envios no canal não substituem automaticamente os vídeos escolhidos. Use vídeos públicos ou não listados com incorporação habilitada no YouTube. O título é editorial, preenchido na gestão; não é buscado automaticamente e não precisa de chave da API do YouTube. A gestão valida o formato do link, mas não comprova propriedade, disponibilidade nem permissão de incorporação do vídeo.

Se outra pessoa alterar a seleção enquanto você edita, o sistema preserva seus campos e impede sobrescrever a nova versão. **Recarregar seleção salva** substitui esses campos pela versão do banco. O modo demonstração salva somente no navegador e não publica no site.

## Leitura pública e publicação

O portfólio consulta apenas `get_public_studio_videos`, com as mesmas variáveis públicas de **build** do Supabase já utilizadas pelos planos. Não importa a sessão da gestão. As RPCs de leitura administrativa e salvamento exigem administrador; a tabela não permite acesso direto pelo navegador. A leitura pública retorna somente a versão e os IDs/títulos selecionados.

O player do YouTube só é inserido depois de um clique. As miniaturas usam `i.ytimg.com`; a reprodução usa `www.youtube-nocookie.com`. O link **Assistir no YouTube** permanece disponível para vídeos sem incorporação, bloqueios do navegador ou indisponibilidade do player. O canal é <https://www.youtube.com/@KatielleFaleiros.>.

Sem configuração, sem a migração ou durante falha da consulta pública, o site exibe o vídeo inicial indicado. Uma resposta válida vazia é respeitada e mostra apenas o convite para o canal. As miniaturas não preenchidas são espaços informativos, sem botão falso de reprodução.

Publique a gestão na branch `main` e o portfólio na `feat/public-portfolio`, preservando os builds e projetos separados no Cloudflare. Push no GitHub não comprova deploy concluído. A aplicação da migração e a publicação do site são etapas separadas.

## Verificação local

`npm run build`, `npm run test:database`, `npm run test:ui` e `npm run test:integration` verificam gestão, persistência, permissões e validação. Na branch pública, execute também `npm run build:site` e `npm run test:site`. Os testes usam PostgreSQL local e transporte simulado: não comprovam reprodução real no YouTube nem a atualização do banco remoto.
