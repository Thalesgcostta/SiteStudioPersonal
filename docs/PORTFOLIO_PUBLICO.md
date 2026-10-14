# Portfólio público do Studio Katielle Faleiros

O site institucional está em `site/`. Ele tem entrada HTML, código, estilos, configuração do Vite, testes e publicação próprios. O administrativo continua em `src/` e usa o build original. O portfólio não importa o aplicativo administrativo, não exige login e não consulta sua sessão.

## Imagens e composição

As 13 imagens da conversa foram analisadas visualmente, mas seus arquivos não estavam disponíveis no ambiente. **A incorporação das fotos originais e a revisão final dos enquadramentos dependem do envio dos arquivos, preferencialmente em ZIP.** As imagens utilizadas nos testes são fixtures técnicas; elas não substituem as fotos do studio.

O build público verifica a existência dos arquivos abaixo e interrompe a publicação se algum estiver faltando. Não afeta o build do administrativo.

| Ordem na mensagem | Conteúdo                                   | Arquivo em `site/public/media/` | Uso no site                                   |
| ----------------- | ------------------------------------------ | ------------------------------- | --------------------------------------------- |
| 1                 | Halteres com iluminação roxa               | `halteres.jpg`                  | Estrutura e cuidado; galeria                  |
| 2                 | Katielle orientando aluna no banco         | `acompanhamento-individual.jpg` | Foto secundária do destaque inicial           |
| 3                 | Orientação a aluno com halter              | `correcao-movimentos.jpg`       | Carrossel de treinos                          |
| 4                 | Katielle e aluno sorrindo com halteres     | `treino-acompanhado.jpg`        | Foto principal do destaque inicial            |
| 5                 | Katielle no aparelho, de perfil            | `tecnica-katielle.jpg`          | Técnica na prática, no carrossel              |
| 6                 | Orientação de postura de aluna sentada     | `orientacao-proxima.jpg`        | Acompanhamento próximo, no carrossel          |
| 7                 | Aluno na puxada com texto na foto          | `atendimento-personalizado.jpg` | Carrossel, preservando o texto original       |
| 8                 | Aluna de rosa no aparelho                  | `aluna-em-treino.jpg`           | Carrossel, preservando a marca original       |
| 9                 | Katielle sorrindo e fazendo sinal positivo | `katielle-no-studio.jpg`        | Apresentação da profissional                  |
| 10                | Retrato quadrado de Katielle               | `katielle-retrato.jpg`          | Avatar menor na apresentação inicial          |
| 11                | Vista aérea da fachada                     | `fachada-studio.jpg`            | Estrutura/localização, no carrossel           |
| 12                | Marca KF em formato horizontal             | `marca-kf.png`                  | Identidade na seção de contato                |
| 13                | Foto da parceria local                     | `comunidade-studio.jpg`         | Comunidade, sem anunciar uma promoção vigente |

As fotos verticais mantêm a proporção de aproximadamente 9:16 nos destaques e no carrossel. A ampliação abre a foto inteira, sem cortar o exercício ou os textos. O retrato de 225×225 não é usado como imagem grande. No celular, a foto dos halteres permite um recorte horizontal, pois o assunto é a estrutura, sem rostos. Os arquivos podem manter outra extensão se os caminhos em `site/src/content.ts` forem ajustados para a mídia recebida.

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

## Publicar em um projeto separado do Cloudflare Pages

Depois de incorporar as fotos e aplicar o SQL 005:

1. Crie **outro projeto Pages**, conectado ao mesmo repositório do GitHub. Mantenha o projeto administrativo existente.
2. Use a branch que contém o portfólio; a versão inicial está na branch `feat/public-portfolio` enquanto aguarda as fotos.
3. Mantenha o diretório raiz como a raiz do repositório.
4. Comando de build: **`npm run build:site`**.
5. Diretório de saída: **`dist-site`**.
6. Copie as duas variáveis públicas de Supabase para as variáveis de produção do novo projeto.
7. Aguarde o deploy com sucesso. Atribua um domínio ou subdomínio próprio a esse projeto.

Um arranjo possível é o domínio principal para o portfólio e `admin.seudominio.com.br` para o administrativo. Configure os domínios no painel; o código não muda os endereços da instalação existente. O contato público usa **(16) 99214-8454**, Instagram **@katiifaleiros** e a localização fornecida **Franca, SP**. O link do mapa faz uma busca pelo nome do studio, porque não foi informado um endereço completo.

## Verificação

Os testes validam as informações, a leitura dos valores, a ausência de chamadas administrativas, filtros e navegação do carrossel, ampliação por teclado, menu mobile, FAQ, WhatsApp, acessibilidade e largura de tela em 320 e 390 pixels. A suíte SQL confirma acesso anônimo limitado aos preços e manutenção das permissões administrativas.

As APIs e imagens dos testes de navegador são simuladas. A migração é validada em PostgreSQL local. Isso não confirma instalação no Supabase hospedado, deploy no domínio nem a composição das fotos reais enquanto os arquivos estiverem pendentes.
