# Portfólio público do Studio Katielle Faleiros

O site institucional está em `site/`. Ele tem entrada HTML, código, estilos, configuração do Vite, testes e publicação próprios. O administrativo continua em `src/` e usa o build original. O portfólio não importa o aplicativo administrativo, não exige login e não consulta sua sessão.

## Imagens e composição

As 21 imagens dos arquivos `Imagens.zip` e `ImagensNovas.zip` estão incorporadas em `site/public/media/`, com nomes descritivos e sem recompressão. A abertura usa duas das novas fotos de 720×1280; os retratos de Katielle ficam na apresentação. O carrossel reúne 18 fotos entre treinos, estrutura e comunidade, com filtros e ampliação por teclado.

O build público verifica a existência dos arquivos abaixo e interrompe a publicação se algum estiver faltando. Não afeta o build do administrativo.

| Ordem na mensagem | Conteúdo                                   | Arquivo em `site/public/media/` | Uso no site                                   |
| ----------------- | ------------------------------------------ | ------------------------------- | --------------------------------------------- |
| 1                 | Halteres com iluminação roxa               | `halteres.jpg`                  | Estrutura e cuidado; galeria                  |
| 2                 | Katielle orientando aluna no banco         | `acompanhamento-individual.jpg` | Carrossel de treinos                          |
| 3                 | Orientação a aluno com halter              | `correcao-movimentos.jpg`       | Carrossel de treinos                          |
| 4                 | Katielle e aluno sorrindo com halteres     | `treino-acompanhado.jpg`        | Carrossel de treinos                          |
| 5                 | Katielle no aparelho, de perfil            | `tecnica-katielle.jpg`          | Técnica na prática, no carrossel              |
| 6                 | Orientação de postura de aluna sentada     | `orientacao-proxima.jpg`        | Acompanhamento próximo, no carrossel          |
| 7                 | Aluno na puxada com texto na foto          | `atendimento-personalizado.jpg` | Carrossel, preservando o texto original       |
| 8                 | Aluna de rosa no aparelho                  | `aluna-em-treino.jpg`           | Carrossel, preservando a marca original       |
| 9                 | Katielle sorrindo e fazendo sinal positivo | `katielle-no-studio.jpg`        | Apresentação da profissional                  |
| 10                | Retrato quadrado de Katielle               | `katielle-retrato.jpg`          | Avatar menor na apresentação inicial          |
| 11                | Vista aérea da fachada                     | `fachada-studio.jpg`            | Estrutura/localização, no carrossel           |
| 12                | Marca KF em formato horizontal             | `marca-kf.webp`                 | Identidade na seção de contato                |
| 13                | Foto da parceria local                     | `comunidade-studio.jpg`         | Comunidade, sem anunciar uma promoção vigente |

| Fotos novas | Arquivo em `site/public/media/` | Uso |
| --- | --- | --- |
| Orientação com barra | `orientacao-na-barra.jpg` | Abertura do carrossel |
| Apoio no exercício de banco | `apoio-no-banco.jpg` | Foto secundária da abertura e carrossel |
| Demonstração de remada | `treino-de-remada.jpg` | Carrossel de treinos |
| Acompanhamento na polia | `treino-na-polia.jpg` | Foto principal da abertura e carrossel |
| Desenvolvimento de ombros | `treino-de-ombros.jpg` | Carrossel de treinos |
| Orientação no aparelho | `cuidado-no-aparelho.jpg` | Carrossel de treinos |
| Correção do movimento | `ajuste-de-movimento.jpg` | Carrossel de treinos |
| Ambiente e iluminação | `interior-studio.jpg` | Carrossel de estrutura |

As fotos verticais mantêm a proporção de aproximadamente 9:16 nos destaques e no carrossel. A ampliação abre a foto inteira, sem cortar o exercício ou os textos. O retrato de 225×225 não é usado como imagem grande. No celular, a foto dos halteres permite um recorte horizontal, pois o assunto é a estrutura, sem rostos.

## Vídeo

O arquivo de `VideoStudio.zip` está em `studio-em-movimento.mp4`: aproximadamente 20 segundos, 1024×576 e 4,2 MB. O áudio e o vídeo originais foram preservados; apenas a organização interna do MP4 foi ajustada para iniciar a reprodução sem baixar o arquivo inteiro (`faststart`). A capa `studio-video-capa.jpg` é um quadro do próprio vídeo.

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

No mesmo projeto Supabase do administrativo, execute no **SQL Editor** o conteúdo completo de [`supabase/migrations/202610140005_public_plans.sql`](../supabase/migrations/202610140005_public_plans.sql). Não repita as migrações anteriores se já foram aplicadas.

A função pública `get_public_studio_plans` retorna somente frequência semanal e valor mensal dos cinco planos. Alunos, CPF, contatos, agenda, vendas, avaliações, pagamentos, usuários e configurações administrativas continuam protegidos. O site usa a chave publishable/anon, sem login, sem `service_role` e sem sessão administrativa.

Configure no ambiente local ou na hospedagem pública:

```text
VITE_SUPABASE_URL=URL do mesmo projeto do administrativo
VITE_SUPABASE_PUBLISHABLE_KEY=mesma chave pública publishable
```

Uma chave anon legada também é aceita em `VITE_SUPABASE_ANON_KEY`. Nunca use chaves secretas ou senha do banco. O site não depende de `VITE_DATA_MODE`.

Alterar **Configurações → Planos e valores** no administrativo atualiza a consulta pública; o visitante verá os valores novos ao abrir ou recarregar o portfólio. Se a consulta falhar, os planos continuam disponíveis para contato, com preço **Consulte**, sem inventar um valor. Em desenvolvimento local sem configuração, aparecem os valores de referência iniciais do projeto (R$ 160, R$ 220, R$ 280, R$ 360 e R$ 420), identificados como referência. Esse fallback não é usado em produção.

## Publicação separada

O projeto público usa a branch `feat/public-portfolio`. O build `npm run build:site` produz `dist-site/`, incluindo fotos, capa e vídeo. A publicação pode usar Cloudflare Workers com assets estáticos ou Cloudflare Pages; as duas variáveis públicas do Supabase devem ser configuradas no projeto público, com a migração 005 aplicada no banco.

Em Workers, a publicação deve apontar explicitamente os assets para `dist-site` e o nome do Worker público. Em Pages, o diretório de saída é `dist-site`. O administrativo mantém seu próprio build e sua hospedagem.

Um arranjo possível é o domínio principal para o portfólio e `admin.seudominio.com.br` para o administrativo. Configure os domínios no painel; o código não muda os endereços da instalação existente. O contato público usa **(16) 99214-8454**, Instagram **@katiifaleiros** e a localização fornecida **Franca, SP**. O link do mapa faz uma busca pelo nome do studio, porque não foi informado um endereço completo.

## Verificação

Os testes validam as informações, a leitura dos valores, a ausência de chamadas administrativas, o carregamento das fotos reais, filtros e navegação do carrossel, ampliação por teclado, reprodução do MP4 real após clique, tratamento de falha do vídeo, menu mobile, FAQ, WhatsApp, verificações automáticas de acessibilidade e largura de tela em 320 e 390 pixels. A suíte SQL confirma acesso anônimo limitado aos preços e manutenção das permissões administrativas.

Somente a API de preços é simulada nos testes de navegador; fotos e vídeo são servidos dos arquivos recebidos. A migração é validada em PostgreSQL local. Esses testes não confirmam instalação no Supabase hospedado nem publicação no Cloudflare.
