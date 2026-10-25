# Portfólio público do Studio Katielle Faleiros

O site institucional está em `site/`. Ele tem entrada HTML, código, estilos, configuração do Vite, testes e publicação próprios. O administrativo continua em `src/` e usa o build original. O portfólio não importa o aplicativo administrativo, não exige login e não consulta sua sessão.

## Imagens e composição

A atualização de outubro usa as **16 fotos de `FotosNovas.zip`**, preservadas na resolução nativa e sem recompressão. As imagens anteriores não são mais exibidas. Os nomes descritivos abaixo estão em `site/public/media/` e o build verifica sua existência antes de publicar.

| Original | Arquivo publicado | Uso e composição |
| --- | --- | --- |
| FotoKatielle.jpeg | katielle-apresentacao.jpg | Apresentação “Um espaço menor”, avatar e galeria da personal. Recorte mantém rosto e postura. |
| Alunos9.jpeg | orientacao-individual.jpg | Foto principal da abertura e galeria. Arquivo de 2336×4160 para o destaque maior. |
| Estrutura3.jpeg | studio-vista-ampla.jpg | Foto secundária da abertura, capa do vídeo e galeria. Vista horizontal completa. |
| Alunos10.jpeg | acompanhamento-no-supino.jpg | Item 01 do método e galeria: orientação de um exercício com barra. |
| Alunos3.jpeg | cuidado-na-maquina.jpg | Item 02 do método e galeria: acompanhamento da postura no aparelho. |
| Estrutura4.jpeg | studio-iluminacao.jpg | Item 03 do método e galeria: ambiente e estrutura. |
| Alunos.jpeg | treino-de-remada-novo.jpg | Galeria: técnica na remada. |
| Alunos2.jpeg | atendimento-na-polia.jpg | Galeria: orientação na polia. |
| Alunos4.jpeg | ajuste-na-elevacao.jpg | Galeria: atenção ao movimento com halteres. |
| Alunos5.jpeg | tecnica-no-movimento.jpg | Galeria: correção próxima do movimento. |
| Alunos6.jpeg | orientacao-com-halteres.jpg | Galeria: desenvolvimento de ombros acompanhado. |
| Alunos7.jpeg | atencao-na-puxada.jpg | Galeria: acompanhamento na puxada. |
| Alunos8.jpeg | treino-no-banco.jpg | Galeria: exercício com halteres no banco. |
| Estrutura1.jpeg | estrutura-anilhas.jpg | Galeria: anilhas e organização do espaço. |
| Estrutura2.jpeg | estrutura-aparelhos.jpg | Galeria: aparelhos de musculação. |
| Estrutura5.jpeg | halteres-do-studio.jpg | Galeria: pesos organizados. |

A abertura destaca a marca KF em vetor, com animação de entrada e transição das fotografias. Não bloqueia o conteúdo nem depende de vídeos automáticos. As animações respeitam `prefers-reduced-motion`.

Os três itens do método são botões: mouse, foco pelo teclado ou toque selecionam a foto correspondente. O texto permanece disponível em todos eles. Nenhuma foto é apresentada como sendo de um exame de bioimpedância; a imagem do terceiro item representa o ambiente de cuidado.

O carrossel alterna retratos e panoramas, com cartões maiores para as fotos horizontais e ampliação da imagem inteira. Os filtros são Treinos, Estrutura e A personal. Todos os quatro planos compartilham as mesmas cores e botões, sem plano em destaque. A consulta dos preços ao Supabase permanece igual.

## Localização

O contato exibe o endereço **R. Moacir Falaguasta, 2705 - Jardim Tropical, Franca - SP, 14407-061** e incorpora um mapa interativo do Google Maps, carregado quando o visitante se aproxima dessa seção. O endereço é usado também nos links externos do mapa e nos dados estruturados do site. Não é necessária uma chave de API ou configuração adicional no Cloudflare. O mapa depende do serviço e da conexão com o Google Maps; o link externo permanece disponível.

## Vídeo

O arquivo de `VideoStudio.zip` está em `studio-em-movimento.mp4`: aproximadamente 20 segundos, 1024×576 e 4,2 MB. O áudio e o vídeo originais foram preservados; apenas a organização interna do MP4 foi ajustada para iniciar a reprodução sem baixar o arquivo inteiro (`faststart`). A capa atual `studio-vista-ampla.jpg` mostra a estrutura do studio em formato horizontal.

A seção entre o método e a galeria mantém o formato horizontal 16:9. O MP4 só é solicitado após o visitante clicar em reproduzir. Há controles nativos de áudio, pausa e tela cheia, reprodução inline no celular, descrição visual e acesso direto ao arquivo em caso de erro. Não há reprodução automática.

## Rodar localmente

Na raiz do repositório:

```sh
npm ci
npm run dev:site -- --port 5174 --strictPort
```

O administrativo pode rodar separadamente com `npm run dev -- --port 5173 --strictPort`. Nenhum site redireciona para o outro.

```sh
npm run check:site-assets
npm run build:site
npm run test:site
```

`build:site` gera `dist-site/`. O build existente `npm run build` continua gerando apenas `dist/`, do administrativo.

## Planos do administrativo

No mesmo projeto Supabase do administrativo, execute no **SQL Editor** o conteúdo completo de [`supabase/migrations/202610170006_public_plans_two_to_five.sql`](../supabase/migrations/202610170006_public_plans_two_to_five.sql). Com as migrações 001 a 004 já aplicadas, esta atualização funciona com ou sem a 005 e pode ser repetida. Ela atualiza somente a função pública, sem alterar valores, cadastros ou históricos.

A função pública `get_public_studio_plans` retorna somente frequência semanal e valor mensal dos quatro planos de **2 a 5 dias por semana**. Alunos, CPF, contatos, agenda, vendas, avaliações, pagamentos, usuários e configurações administrativas continuam protegidos. O site usa a chave publishable/anon, sem login, sem `service_role` e sem sessão administrativa. A interface também aceita a versão anterior da função, mas exibe somente os quatro planos públicos.

Configure no ambiente local ou na hospedagem pública:

```text
VITE_SUPABASE_URL=URL do mesmo projeto do administrativo
VITE_SUPABASE_PUBLISHABLE_KEY=mesma chave pública publishable
```

Uma chave anon legada também é aceita em `VITE_SUPABASE_ANON_KEY`. Nunca use chaves secretas ou senha do banco. O site não depende de `VITE_DATA_MODE`.

Alterar **Configurações → Planos e valores** no administrativo atualiza a consulta pública; o visitante verá os valores novos ao abrir ou recarregar o portfólio. Se a consulta falhar, os planos continuam disponíveis para contato, com preço **Consulte**, sem inventar um valor. Em desenvolvimento local sem configuração, aparecem os valores de referência iniciais do projeto para 2 a 5 dias (R$ 220, R$ 280, R$ 360 e R$ 420), identificados como referência. Esse fallback não é usado em produção.

## Publicação separada

O projeto público usa a branch `feat/public-portfolio`. O build `npm run build:site` produz `dist-site/`, incluindo fotos, capa e vídeo. A publicação pode usar Cloudflare Workers com assets estáticos ou Cloudflare Pages; as duas variáveis públicas do Supabase devem estar disponíveis durante o **build** no projeto público, com a migração 006 aplicada no banco. Alterar as variáveis exige um novo build; adicioná-las somente ao runtime do Worker não altera os arquivos estáticos já gerados.

Em Workers, a publicação deve apontar explicitamente os assets para `dist-site` e o nome do Worker público. Em Pages, o diretório de saída é `dist-site`. O administrativo mantém seu próprio build e sua hospedagem.

Um arranjo possível é o domínio principal para o portfólio e `admin.seudominio.com.br` para o administrativo. Configure os domínios no painel; o código não muda os endereços da instalação existente. O contato público usa **(16) 99214-8454**, Instagram **@katiifaleiros** e a localização fornecida **Franca, SP**. O link do mapa faz uma busca pelo nome do studio, porque não foi informado um endereço completo.

## Verificação

Os testes validam as informações, a leitura dos valores, a ausência de chamadas administrativas, o carregamento das fotos reais, filtros e navegação do carrossel, ampliação por teclado, reprodução do MP4 real após clique, tratamento de falha do vídeo, menu mobile, FAQ, WhatsApp, verificações automáticas de acessibilidade e largura de tela em 320 e 390 pixels. A suíte SQL confirma acesso anônimo limitado aos preços e manutenção das permissões administrativas.

Somente a API de preços é simulada nos testes de navegador; fotos e vídeo são servidos dos arquivos recebidos. A migração é validada em PostgreSQL local. Esses testes não confirmam instalação no Supabase hospedado nem publicação no Cloudflare.
