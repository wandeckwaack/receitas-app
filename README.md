# Memórias à Mesa

PWA (app instalável) de receitas e histórias de família. Funciona offline, sem
conta e sem API externa. Os dados novos ficam no IndexedDB do navegador;
receitas antigas em `localStorage` são copiadas automaticamente após um backup
local versionado. Não são criadas receitas de demonstração.

## Arquitetura e dados

- `index.html`, `style.css` e `app.js`: interface vanilla, compatível com GitHub Pages.
- `db.js`: dados, migração e IndexedDB. Fotos são `Blob` no IndexedDB, reduzidas a
  no máximo 1600 px e JPEG de qualidade 82%.
- `assistant.js`: funções locais para interpretar e escalar ingredientes, montar
  compras, sugerir substituições, adaptar forno/air fryer e buscar receitas. É
  exposto como `MemoriasAssistant` no navegador e CommonJS nos testes. No detalhe
  de cada receita, o painel recolhível **Assistente** usa essas funções sem rede:
  recalcula porções sem salvar a alteração, monta uma lista de compras marcada só
  durante a sessão, apresenta substituições e estima a adaptação para forno ou
  air fryer.
- `ai-adapter.js`: adaptador opcional para perguntas. Sem endpoint configurado,
  responde localmente e de modo determinístico; não há IA generativa. Um proxy
  próprio pode ser configurado com URL HTTPS (ou localhost no desenvolvimento),
  sem chave no navegador. Nada é enviado antes do clique em **Perguntar**; por
  padrão vai apenas a pergunta e título/porções exigem marcação explícita a cada
  abertura do painel. O endpoint só é lembrado quando o proxy responde; em falha,
  o app volta ao modo local e o remove. O proxy também possui timeout mesmo em
  navegadores sem `AbortController` (API de cancelamento de requisições).
- **Pesquisa de receitas** abre uma revisão de sugestões de receitas. Sem proxy, funciona
  offline com modelos locais curados — não é IA generativa — para intenções como
  almoço rápido, jantar econômico, vegetariana, sobremesa, sopa, frango, peixe,
  carne, moqueca, lasanha, massa italiana, curry, tacos, pão de queijo,
  brigadeiro e salada. IA generativa exige um endpoint/proxy externo configurado
  pelo usuário. As preferências de tempo e estilo são filtros de busca, não
  garantia nutricional, de alergênicos ou de restrições alimentares.
  Com proxy configurado, envia exclusivamente o texto da busca — limitado a 200
  caracteres — e o número máximo de opções; receitas, ingredientes, histórias e
  fotos nunca são enviados nesse fluxo. O app aceita respostas JSON com opções
  e limita seus campos antes de exibir. Cada opção abre o formulário normal para
  revisão; nenhuma sugestão é salva automaticamente. A URL do proxy só é lembrada
  depois de uma resposta bem-sucedida dele e, se falhar ou responder dados
  inválidos, o app volta aos modelos locais.
- Cada receita preserva título, categoria, tempo, porções, dificuldade,
  ingredientes, passos, favorito e inclui autor, origem/história, dicas e foto.
- Backup exporta metadados e fotos em data URL; isso pode tornar o arquivo grande.

## Limitações honestas

Ditado usa Web Speech API do navegador: pode exigir internet, permissão de
microfone e não existe em todos os navegadores. Quando indisponível, fica
desabilitado. A importação por foto usa OCR local: a foto não é enviada e o
texto sempre passa por revisão humana antes de virar receita. OCR funciona
melhor com texto impresso; manuscrito pode ter baixa precisão. A primeira
utilização precisa de conexão para baixar o motor (cerca de 3 MB), mas não há
API paga obrigatória. Não há sincronização entre aparelhos; baixe backups
regularmente.

A importação permite até quatro fotos. Em dispositivos móveis/touch, **Tirar
foto agora** abre a câmera para uma foto por vez; acrescente as demais usando
**Escolher da galeria/arquivos**, que também permanece disponível no desktop.

O assistente pode usar um proxy opcional configurado pelo usuário, mas não inclui
chaves de API e não envia receita, ingredientes, passos ou foto por padrão. O
consentimento de título e porções não é lembrado: a cada abertura, o contexto não
será enviado até marcar a opção. Se o proxy falhar, responde no modo local, sem IA
generativa. No **Modo cozinha**, quando
o navegador oferece Web Speech API, o botão **Ouvir comando** reconhece somente
um comando por vez: “próximo passo”, “passo anterior”/“voltar”, “repetir”, “ler
ingredientes”, “mostrar ingredientes” e “modo escuro”. O texto reconhecido é
interpretado localmente; nenhuma gravação ou transcrição é salva. Sem suporte no
navegador, o controle fica desabilitado e explica a limitação. A leitura em voz
alta de passos e ingredientes também depende do sintetizador de voz do aparelho.
A ativação do **Modo cozinha** pede ao navegador para manter a tela ligada enquanto
estiver ativa; esse pedido pode não ser suportado ou ser recusado e, nesses casos,
o modo continua disponível. Ao sair do modo ou fechar o detalhe, o app libera essa
trava de tela, cancela a leitura em voz alta e encerra uma escuta de comando em
andamento. A lista de compras não sincroniza e é descartada ao fechar/recarregar a página.
As conversões
usam medidas caseiras aproximadas (xícara = 240 ml; colher de sopa = 15 ml;
colher de chá = 5 ml), não convertem volume em peso e preservam expressões como
“a gosto” e “pitada”. Categorias, busca e substituições são heurísticas e podem
errar contexto. Substituições são apenas sugestões culinárias: não são
orientação médica/nutricional; confira alergias, restrições e rótulos.

## Testes

    node tests/db.test.js
    node tests/app.test.js
    node tests/ocr.test.js
    node tests/assistant.test.js
    node tests/ai-adapter.test.js
    node tests/ai-suggest.test.js
    node --check db.js
    node --check app.js
    node --check ocr.js
    node --check assistant.js
    node --check ai-adapter.js
    git diff --check

> Recuperado em 2026-09-05 do histórico interno do Claude Code
> (`~/.claude/file-history/`) depois que a versão em `~/Desktop/receitas-app`
> sumiu numa sincronização do iCloud. **Agora mora fora do iCloud**, em
> `~/claude-projetos/receitas-app`.

## Arquivos

| arquivo | o que é |
|---|---|
| `index.html` | estrutura HTML, manifesto e carregamento dos módulos do app |
| `style.css` | estilos responsivos, temas e impressão |
| `app.js` | interface, modais, fotos, ditado, Wake Lock, backup e interação do usuário |
| `db.js` | camada de dados: IndexedDB, migração, normalização e fotos |
| `assistant.js` | assistente local: ingredientes, compras, substituições, preparo e busca |
| `ai-adapter.js` | perguntas e sugestões locais/proxy opcionais, sem segredos no frontend |
| `tests/db.test.js`, `tests/app.test.js` | testes do núcleo de dados e contratos testáveis da interface |
| `sw.js` | service worker — faz funcionar offline |
| `manifest.webmanifest` | deixa instalar como app no celular |
| `icon-192/512/180/512-maskable.png` | ícones (gerados por `gen_icons.py`) |
| `gen_icons.py` | recria os ícones: `python3 gen_icons.py` |
| `index.rascunho-anterior.html` | versão antiga do index, guardada só por segurança — pode apagar |

## Ver no computador

    cd ~/claude-projetos/receitas-app
    python3 -m http.server 8000
    # abre http://localhost:8000

(precisa ser via servidor, não abrir o arquivo direto — o service worker exige http://)

## Publicar (GitHub Pages, pra instalar no celular)

1. Criar um repositório no GitHub, subir estes arquivos (menos os dois de
   rascunho/README se quiser).
2. Settings → Pages → Branch: `main` / `/root`.
3. Abrir a URL no celular → menu do navegador → "Adicionar à tela de início".

## Atenção sobre as receitas já digitadas

As receitas que você tenha adicionado dentro do app ficam no `localStorage` do
navegador **daquele endereço** onde você abriu o app. Elas **não** estão nestes
arquivos. Se você abriu o app antes por um caminho `file://` ou outra URL, use o
botão de **Backup → Baixar minhas receitas** lá pra tirar um `.json` antes de
migrar pro endereço novo, e depois **Restaurar** aqui.
