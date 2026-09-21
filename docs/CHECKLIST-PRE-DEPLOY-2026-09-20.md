# Checklist pré-publicação — Memórias à Mesa

Data: 2026-09-20

## Resultado do gate

Pode preparar o commit local. Não há bloqueador vermelho identificado para uma publicação estática, mas a validação em celular real continua obrigatória antes de divulgar o endereço.

## Evidências

| Item | Severidade | Status | Evidência |
|---|---:|---|---|
| Suíte automatizada | 🟡 | OK | `node tests/db.test.js`, `app.test.js`, `ocr.test.js`, `assistant.test.js` e `ai-adapter.test.js` passaram. |
| Sintaxe JavaScript | 🟡 | OK | `node --check` em `app.js`, `db.js`, `ocr.js`, `assistant.js` e `ai-adapter.js`. |
| Integridade de whitespace | 🟢 | OK | `git diff --check` passou. |
| Smoke test web | 🟡 | OK parcial | App abriu em `http://127.0.0.1:4173`; formulário “Nova receita” abriu; console sem erros. |
| Segredos no código | 🔴 | OK | Busca por chaves, senhas, tokens e chaves privadas não encontrou segredo do projeto. |
| Dados familiares no repositório | 🔴 | OK | Não há receitas preenchidas nos arquivos; `.history/` e `.work/` serão excluídos pelo `.gitignore`. |
| Backend/conta/multi-tenant | 🔴 | Não aplica | PWA estático local, sem servidor, conta ou banco remoto. |
| Backup externo | 🔴 | Pendente do usuário | O backup depende de o usuário baixar o JSON e guardá-lo fora do aparelho. |
| Política de privacidade | 🟡 | Pendente antes de compartilhar com terceiros | Necessária se o app deixar de ser apenas familiar/privado. |
| Proxy de IA | 🟡 | Não configurado | O app funciona no modo local; não há endpoint real para publicar. |
| Celular real | 🟡 | Pendente | Ainda falta validar instalação, câmera, OCR, IndexedDB, voz, Wake Lock, Web Share e restore em Safari/iOS ou Android. |
| Remoto GitHub | 🔴 | Pendente | `git remote -v` não retorna remoto; destino e visibilidade ainda não foram definidos. |

## Decisão

Commit local permitido. Push e publicação ficam bloqueados até definir o repositório remoto e executar a validação manual em celular real.
