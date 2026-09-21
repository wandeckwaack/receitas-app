# Memórias à Mesa

PWA (app instalável) de receitas e histórias de família. Funciona offline, sem
conta e sem API externa. Os dados novos ficam no IndexedDB do navegador;
receitas antigas em `localStorage` são copiadas automaticamente após um backup
local versionado. Não são criadas receitas de demonstração.

## Arquitetura e dados

- `index.html`, `style.css` e `app.js`: interface vanilla, compatível com GitHub Pages.
- `db.js`: dados, migração e IndexedDB. Fotos são `Blob` no IndexedDB, reduzidas a
  no máximo 1600 px e JPEG de qualidade 82%.
- `assistant.js`: funções locais de apoio (busca nas receitas salvas, interpretação de
  ingredientes). A interface simplificada usa só a busca; o restante fica disponível
  para uso futuro.
- `ai-adapter.js`: busca de receitas. Tenta primeiro a IA online (Worker abaixo) e, se
  ela não responder, mostra modelos locais curados como reserva.
- **Pesquisa de receitas**: o campo "O que você quer cozinhar hoje?" fica na própria
  página inicial. O resultado aparece logo abaixo, sem abrir outra janela; cada receita
  abre na hora e tem o botão **Guardar nas minhas receitas**, que salva direto. O
  navegador envia só o texto da busca (até 200 caracteres) e o número de opções; nada
  das receitas, histórias ou fotos guardadas. Demora de 10 a 30 segundos, conforme a
  demanda do Google.
- **IA online**: Cloudflare Worker `memorias-a-mesa-ai` (`server/gemini-worker.js`,
  `wrangler.toml`) chamando o Gemini (`gemini-3.6-flash`, raciocínio baixo). A chave
  fica só como segredo do Worker (`npx wrangler secret put GEMINI_API_KEY --name
  memorias-a-mesa-ai`), nunca no navegador. O Worker só aceita pedidos vindos de
  `https://wandeckwaack.github.io` e tenta de novo uma vez se o Google estiver
  sobrecarregado. Para publicar mudanças: `npx wrangler deploy`.
- Cada receita preserva título, categoria, tempo, porções, dificuldade,
  ingredientes, passos, favorito e inclui autor, origem/história, dicas e foto.
- Backup exporta metadados e fotos em data URL; isso pode tornar o arquivo grande.

## Limitações honestas

A importação por foto usa OCR local: a foto não é enviada e o
texto sempre passa por revisão humana antes de virar receita. OCR funciona
melhor com texto impresso; manuscrito pode ter baixa precisão. A primeira
utilização precisa de conexão para baixar o motor (cerca de 3 MB), mas não há
API paga obrigatória. Não há sincronização entre aparelhos; baixe backups
regularmente.

A cópia de receita por foto (**Ou copie uma receita de uma foto**) aceita até quatro
fotos; no celular o próprio sistema oferece tirar a foto ou escolher da galeria.

Na receita aberta há: **Letras grandes** (deixa o texto maior e a tela acesa
enquanto você cozinha, se o navegador permitir), **Imprimir**, **Compartilhar**,
**Editar** e **Excluir**. O formulário tem ingredientes e passos em texto livre, um
em cada linha.

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
| `app.js` | interface, busca de receitas, fotos, backup e interação do usuário |
| `db.js` | camada de dados: IndexedDB, migração, normalização e fotos |
| `assistant.js` | funções locais de apoio e busca nas receitas salvas |
| `ai-adapter.js` | busca de receitas: IA online com reserva local, sem segredos no frontend |
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
