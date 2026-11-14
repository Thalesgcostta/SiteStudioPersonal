# Portfólio público do Studio Katielle Faleiros

O site institucional está em `site/`. Ele tem entrada HTML, código, estilos, configuração do Vite, testes e publicação próprios. O administrativo continua em `src/` e usa o build original. O portfólio não importa o aplicativo administrativo, não exige login e não consulta sua sessão.

## Imagens e composição

A atualização de outubro usa as **16 fotos de `FotosNovas.zip`**, preservadas na resolução nativa e sem recompressão. As imagens anteriores não são mais exibidas. Os nomes descritivos abaixo estão em `site/public/media/` e o build verifica sua existência antes de publicar.

| Original | Arquivo publicado | Uso e composição |
| --- | --- | --- |
| FotoKatielle.jpeg | katielle-apresentacao.jpg | Apresentação “Um espaço menor”, avatar e galeria da personal. Recorte mantém rosto e postura. |
| Alunos9.jpeg | orientacao-individual.jpg | Foto principal da abertura e galeria. Arquivo de 2336×4160 para o destaque maior. |
| Estrutura3.jpeg | studio-vista-ampla.jpg | Foto secundária da abertura e galeria; também preservada como capa do vídeo local antigo. Vista horizontal completa. |
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

A abertura usa uma composição escura com a KF em vetor e três anéis de atividade desenhados com **Framer Motion** (`LazyMotion` + `domAnimation`). Um pulso se expande durante a entrada e a marca se consolida no centro. Os três anéis continuam girando em velocidades e direções diferentes; a KF permanece estável. O controle de pausa congela a rotação e permite retomá-la. Os painéis de VO₂ Máx, pace e batimentos, a foto de orientação e o halter em vetor compõem o ambiente. A paralaxe usa MotionValues e springs para atualizar transforms diretamente, sem renderizações React a cada movimento do mouse. As animações iniciam automaticamente no PC e no celular, mesmo se o navegador informar `prefers-reduced-motion`. Os controles de pausa e retomada continuam disponíveis na abertura e na galeria. Não é necessário clicar em play na primeira visita nem ter uma preferência salva. Em telas de toque não há paralaxe pelo cursor. O alinhamento dos anéis usa somente uma transformação CSS com origem no centro do SVG, inclusive quando a animação está desligada.

O código fica separado em `site/src/hero/`: `Hero.tsx` organiza a seção, `PerformanceScene.tsx` apresenta os elementos, `useHeroParallax.ts` controla o movimento e `metrics.ts` define o contrato `PerformanceSnapshot`. A prop `metrics` aceita novos snapshots de uma futura integração; o portfólio atual não consulta dados esportivos pessoais nem apresenta uma conexão em tempo real. O exemplo inicial (`42.1`, `05:02`, `142 bpm`) é identificado na tela como **métricas ilustrativas**. O player de vídeo só é preparado quando fica visível ou quando há uma ação explícita do visitante.

Os três itens do método são botões: mouse, foco pelo teclado ou toque selecionam a foto correspondente. O texto permanece disponível em todos eles. Nenhuma foto é apresentada como sendo de um exame de bioimpedância; a imagem do terceiro item representa o ambiente de cuidado.

O carrossel alterna retratos e panoramas, com cartões maiores para as fotos horizontais e ampliação da imagem inteira. Os filtros são Treinos, Estrutura e A personal. Todos os cinco planos voltaram ao tom claro original `#f8f7f3` e ampliam suavemente no hover ou foco no botão, sem plano em destaque. O texto escuro mantém contraste sobre os cartões claros. A ampliação segue o controle de movimento do site. A consulta dos preços ao Supabase permanece igual.

O carrossel avança automaticamente a cada **2,5 segundos** e retorna ao início ao chegar ao fim da área rolável. O visitante pode pausar e retomar pelo controle ao lado das setas. A reprodução fica suspensa fora da tela, em abas ocultas, durante hover nas fotos, foco pelo teclado, gesto de toque ou ampliação de foto. Passar o mouse pelo título ou pelos controles e clicar no botão de reprodução não prende a galeria em pausa. Trocar de categoria reinicia o intervalo. A navegação manual continua disponível pelas setas, filtros, teclado e gestos. O avanço automático começa por padrão, inclusive no PC, respeitando as pausas por interação. Durante o avanço automático, o contador não gera anúncios repetidos para leitores de tela.

Todas as seções, o cabeçalho, o menu móvel e o rodapé usam o mesmo fundo escuro `#0b1013`. Os textos, os filtros da galeria, os itens do método e a legenda do mapa têm cores ajustadas para leitura nesse fundo. Os cartões claros dos planos permanecem como elementos de contraste.

## Localização

O contato exibe o endereço **R. Moacir Falaguasta, 2705 - Jardim Tropical, Franca - SP, 14407-061** e incorpora um mapa interativo do Google Maps, carregado quando o visitante se aproxima dessa seção. O endereço é usado também nos links externos do mapa e nos dados estruturados do site. Não é necessária uma chave de API ou configuração adicional no Cloudflare. O mapa depende do serviço e da conexão com o Google Maps; o link externo permanece disponível.

## Vídeos do YouTube

A seção **“Um pouco do studio. Muito sobre cuidar.”** apresenta um player maior com borda laranja e três miniaturas com bordas azuis. A seleção inicial usa o vídeo indicado pelo studio, <https://youtu.be/ZsS8bJw2i9k>, e deixa os três outros espaços vazios. Cada miniatura preenchida troca o vídeo do player principal. Há um link permanente para <https://www.youtube.com/@KatielleFaleiros.> e acesso direto ao vídeo no YouTube.

A seleção é administrada em **gestao.katiellefaleiros.com.br → Configurações → Vídeos do YouTube**, na versão da gestão publicada pela branch `main`. Ela exige a nova migração **202611140010_studio_videos.sql**, disponível na `main`, executada no mesmo Supabase depois da 009. Consulte [`docs/VIDEOS_YOUTUBE.md` na main](https://github.com/Thalesgcostta/SiteStudioPersonal/blob/main/docs/VIDEOS_YOUTUBE.md) para instalação e operação. Não mescle todo o administrativo nessa branch pública para atualizar os vídeos.

O portfólio usa as variáveis públicas de build já utilizadas pelos planos, consulta somente `get_public_studio_videos` e nunca importa a sessão administrativa. Alterações salvas na gestão aparecem ao recarregar o site, sem novo deploy. Não é necessária chave da API do YouTube nem login do canal: a curadoria é manual por links e títulos.

O player é preparado quando pelo menos 55% da sua área fica visível, após terminar a consulta da seleção pública, ou por uma ação explícita do visitante. A API oficial de iframe do YouTube é carregada sob demanda de `www.youtube.com/iframe_api`, e a incorporação usa `www.youtube-nocookie.com`; as imagens vêm de `i.ytimg.com`. A reprodução automática é solicitada **sem som** e com controles. O visitante pode ativar o áudio, pausar ou reproduzir manualmente. O vídeo pausa ao sair da área visível ou ao ocultar a aba; voltar à seção não desfaz uma pausa manual nem reinicia automaticamente uma sessão já tentada. Bloqueios de autoplay, demora no início ou falhas do player oferecem reprodução manual e o link externo, sem afirmar que um iframe carregado comprova que o vídeo tocou. Vídeos privados ou com incorporação bloqueada podem não tocar no site; o link externo permanece disponível. Sem a RPC/configuração ou durante falhas de rede, aparece o vídeo inicial escolhido. Uma seleção salva vazia é respeitada. Os espaços não preenchidos não simulam botões de vídeo.

O MP4 local anterior foi preservado nos assets, mas essa seção não o carrega mais.

## Apresentação para smartphones

Até **767 px de largura**, o site abre em uma apresentação compacta: textos mais curtos, história da Katielle e explicação do método expansíveis, galeria menor e planos com os valores/condições essenciais. Os três espaços de vídeos ainda não preenchidos ficam lado a lado, sem repetir textos. O mapa só é inserido quando o visitante abre **Ver mapa do studio**; o endereço e o link externo permanecem visíveis.

Na seção do método, a imagem e os três cards ficam juntos: os cards aparecem lado a lado, alternam a foto por toque ou teclado e mostram uma descrição curta abaixo. O grupo cabe até na área útil de um smartphone de 320 × 568 px, sem precisar voltar para cima ao escolher o terceiro item. As explicações completas permanecem expansíveis.

A logo KF com os três anéis animados, os cartões de métricas ilustrativas, a foto e os controles de pausa/retomada continuam na abertura. A animação inicia como antes; a paralaxe não responde a gestos de toque. O bloco repetido “Katielle Faleiros — O nosso cuidado, em cada vídeo” foi removido da seção de vídeos em todas as telas.

O botão **Ver versão desktop**, disponível somente no rodapé, mostra todo o conteúdo da apresentação completa, mantendo o layout legível na largura do celular. **Voltar à versão celular** restaura a apresentação compacta. A escolha é salva localmente quando o navegador permite; a alternância funciona durante a visita mesmo se o armazenamento estiver bloqueado. Em telas a partir de **768 px**, o conteúdo completo sempre aparece. Ao voltar para uma largura de smartphone, a preferência anterior é respeitada. Alternar a apresentação não recarrega a página nem reinicia o player de vídeo ou a escolha de pausa das animações.

Essa apresentação usa o mesmo site e as mesmas consultas públicas, sem alterar a gestão ou exigir nova migração SQL.

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

No mesmo projeto Supabase do administrativo, aplique a migração `202611060009_image_consent.sql`, disponível na branch `main`, após a migração 008. Consulte [as instruções da gestão](https://github.com/Thalesgcostta/SiteStudioPersonal/blob/main/docs/ATUALIZACAO_PLANOS_IMAGEM.md). A atualização inclui o plano de 6 vezes por R$ 600,00 somente se ele ainda não existir e preserva os preços cadastrados.

A função pública `get_public_studio_plans` retorna somente frequência semanal e valor mensal dos cinco planos de **2 a 6 dias por semana**. Alunos, CPF, contatos, agenda, vendas, avaliações, pagamentos, usuários e configurações administrativas continuam protegidos. O site usa a chave publishable/anon, sem login, sem `service_role` e sem sessão administrativa. A interface também aceita a RPC anterior: mantém os quatro preços existentes e apresenta somente o sexto plano como Consulte até a migração ser aplicada.

Configure no ambiente local ou na hospedagem pública:

```text
VITE_SUPABASE_URL=URL do mesmo projeto do administrativo
VITE_SUPABASE_PUBLISHABLE_KEY=mesma chave pública publishable
```

Uma chave anon legada também é aceita em `VITE_SUPABASE_ANON_KEY`. Nunca use chaves secretas ou senha do banco. O site não depende de `VITE_DATA_MODE`.

Alterar **Configurações → Planos e valores** no administrativo atualiza a consulta pública; o visitante verá os valores novos ao abrir ou recarregar o portfólio. Se a consulta falhar, os planos continuam disponíveis para contato, com preço **Consulte**, sem inventar um valor. Em desenvolvimento local sem configuração, aparecem os valores de referência iniciais do projeto para 2 a 6 dias (R$ 220, R$ 280, R$ 360, R$ 420 e R$ 600), identificados como referência. Esse fallback não é usado em produção.

## Publicação separada

O projeto público usa a branch `feat/public-portfolio`. O build `npm run build:site` produz `dist-site/`, incluindo fotos, capa e vídeo. A publicação pode usar Cloudflare Workers com assets estáticos ou Cloudflare Pages; as duas variáveis públicas do Supabase devem estar disponíveis durante o **build** no projeto público, com a migração 009 aplicada no banco. Alterar as variáveis exige um novo build; adicioná-las somente ao runtime do Worker não altera os arquivos estáticos já gerados.

Em Workers, a publicação deve apontar explicitamente os assets para `dist-site` e o nome do Worker público. Em Pages, o diretório de saída é `dist-site`. O administrativo mantém seu próprio build e sua hospedagem.

Um arranjo possível é o domínio principal para o portfólio e `admin.seudominio.com.br` para o administrativo. Configure os domínios no painel; o código não muda os endereços da instalação existente. O contato público usa **(16) 99214-8454**, Instagram **@katiifaleiros** e a localização fornecida **Franca, SP**. O link do mapa faz uma busca pelo nome do studio, porque não foi informado um endereço completo.

## Verificação

Os testes validam as informações, a leitura dos valores, a ausência de chamadas administrativas, o carregamento das fotos reais, filtros e navegação do carrossel, ampliação por teclado, inicialização do player por visibilidade, reprodução automática sem som, pausa fora de tela, retomada manual e bloqueios do navegador, seleção de vídeos, espaços vazios, falhas da consulta e das miniaturas, menu mobile, FAQ, WhatsApp, verificações automáticas de acessibilidade e largura de tela em 320 e 390 pixels. A suíte SQL confirma acesso anônimo limitado aos preços e manutenção das permissões administrativas.

As APIs públicas de preços/vídeos, as miniaturas externas e o player YouTube são simulados nos testes de navegador. As fotos do studio continuam sendo servidas dos arquivos recebidos. Os testes verificam URLs e interação do embed, sem comprovar reprodução real no YouTube. A migração é validada em PostgreSQL local. Esses testes não confirmam instalação no Supabase hospedado nem publicação no Cloudflare.
