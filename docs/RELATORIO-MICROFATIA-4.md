# Relatório — Micro-fatia 4: adaptador de IA opcional

Data: 2026-09-20

## Entrega

- Criado `ai-adapter.js` em UMD/CommonJS, expondo `MemoriasAI` com
  `LocalFallback`, `ProxyAdapter` e `ask`.
- O modo local usa somente as capacidades de `MemoriasAssistant` para porções,
  substituições, forno/air fryer e compras; informa sempre “modo local, sem IA
  generativa”.
- O proxy só aceita HTTPS (ou HTTP em `localhost`/`127.0.0.1`), usa timeout com
  `AbortController`, trata HTTP não-OK e volta automaticamente ao local em erro.
  Não existe chave de API no frontend.
- O payload é limitado a pergunta e, apenas quando marcado pelo usuário, título
  e porções. Receita completa, passos, ingredientes e foto não são enviados.
- O painel Assistente ganhou “Pergunte sobre esta receita”, configuração opcional
  do endpoint, indicação de modo e resposta em `aria-live`. A chamada acontece
  exclusivamente após o clique em “Perguntar”.
- Service worker atualizado para manter o adaptador disponível offline.
- Corrigido o export UMD: no navegador, o global `MemoriasAI` expõe diretamente
  `ask`, `LocalFallback`, `ProxyAdapter`, `isAllowedEndpoint` e
  `minimumContext`; em CommonJS permanece o contrato `{ MemoriasAI }`.

## TDD e validação

1. `tests/ai-adapter.test.js` foi criado antes da implementação.
2. RED registrado: `Cannot find module '../ai-adapter.js'`.
3. GREEN: o teste cobre respostas locais, limitação honesta, endpoint permitido,
   payload mínimo sem foto, HTTP não-OK e fallback automático.
4. `tests/app.test.js` recebeu contratos de carregamento offline, interface,
   `aria-live`, consentimento e ausência de chave de API.
5. RED/GREEN do contrato de navegador: um teste com `node:vm` executa
   `ai-adapter.js` sem `module`/`require`. Antes da correção,
   `sandbox.MemoriasAI.ask` era indefinido; depois, é uma função e os demais
   membros públicos são verificados.

## Achados finais corrigidos

- O endpoint só entra em `localStorage` depois de uma resposta com `mode: 'proxy'`;
  se houver fallback local, ele é removido. O checkbox de contexto permanece
  desmarcado e não persiste consentimento; a interface avisa isso a cada abertura.
- A pergunta passou a tratar falhas inesperadas e anunciar uma mensagem amigável.
  O botão recebeu `aria-label="Perguntar ao assistente"`.
- `ProxyAdapter` usa corrida entre a requisição e um timer. Em navegadores modernos
  o timer também aborta a requisição; sem `AbortController`, ainda encerra a espera.
- Contratos novos em `tests/app.test.js` e `tests/ai-adapter.test.js` foram
  executados em RED antes da implementação e em GREEN depois dela.

Não houve commit, push ou deploy.

Não houve commit, push ou deploy.
