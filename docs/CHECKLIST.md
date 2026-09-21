# Checklist de ideia — Memórias à Mesa

## 0. Definição
| Item | Sev | Status | Evidência / motivo |
|---|---|---|---|
| Já existe? | 🔴 | ✅ | PWA existente em `index.html`; histórico preservado em `.history/`. |
| Uso e indisponibilidade | 🔴 | ✅ | Caderno familiar offline; se ficar 1 dia fora do ar, receitas locais continuam no aparelho salvo. |
| Dados | 🔴 | ✅ | Dados pessoais opcionais: autor e história de origem; sem conta ou envio a servidor. |
| Multi-tenant | 🔴 | N/A | App local, de uma pessoa por perfil do navegador. |
| Onde roda | 🔴 | ✅ | Navegador estático/GitHub Pages. |
| Produto pago / serviços externos | 🟡 | ✅ | OCR é local no navegador via Tesseract.js, carregado somente por solicitação; não há API paga. Na primeira utilização requer conexão para baixar o motor/modelo (~3 MB) e a falha deixa a revisão manual disponível. |

## 1. Código e dados
| Item | Sev | Status | Evidência / motivo |
|---|---|---|---|
| Segredos e variáveis | 🔴 | N/A | App sem servidor, chaves ou `.env`. |
| Migração e backup | 🔴 | ✅ | Migração localStorage → IndexedDB cria backup local antes de gravar. |
| Testes | 🟡 | ✅ | `node tests/db.test.js`; sem dependências e sem build. |
| Backup fora do aparelho | 🔴 | 🟡 Pendente | Usuário precisa baixar o backup; navegador não permite cópia automática externa. |
| Retenção / LGPD | 🟡 | 🟡 Pendente | Dados ficam até o usuário limpar o navegador ou restaurar outro backup; política pública é necessária antes de uso por terceiros. |
| Fotos para OCR | 🟡 | ✅ | A foto fica no aparelho: é processada localmente e o rascunho no IndexedDB é apagado ao cancelar ou ao abrir o formulário; não há sincronização. |
| Assistente de receitas | 🟡 | ✅ | A primeira micro-fatia é uma biblioteca local e determinística (`assistant.js`), sem rede, conta, voz ou proxy de IA. Sugestões de substituição trazem aviso de que não são orientação médica/nutricional. |
| Assistente — microfatia 2 | 🟡 | ✅ | Painel no detalhe usa somente `MemoriasAssistant`; porções não alteram a receita, compras são de sessão e não há API/sincronização. Ver `docs/RELATORIO-MICROFATIA-2.md`. |
| Revisão do assistente (2026-09-20) | 🟡 | ✅ | Lista de compras preserva medidas textuais e numéricas incompatíveis do mesmo ingrediente; adaptação só altera passos de forno/assamento e mantém o aviso de conferir o modelo; ovos ficam em “Laticínios e ovos”; fator de escala zero ou negativo mantém as quantidades, sem inserir `0` na lista. Coberto em `tests/assistant.test.js`. |
| Adaptador de IA opcional — microfatia 4 | 🟡 | ✅ | `ai-adapter.js` é local por padrão. Proxy aceita somente HTTPS (HTTP apenas localhost), não recebe chave no frontend, limita o payload a pergunta e título/porções explicitamente consentidos e volta ao modo local em falha. |
| Proxy externo configurado | 🟡 | 🟡 Pendente | O dono precisa definir e operar um backend próprio, com política de privacidade, custos, autenticação e retenção; esta microfatia não implementa backend. |

## Decisões que só o dono pode tomar

- Definir se o app terá sincronização/conta no futuro e onde os dados familiares ficarão hospedados.
- Definir retenção e política de privacidade antes de compartilhar com outras pessoas.
- Se usar proxy, escolher o operador, a política de dados/custos e como o backend autentica usuários sem expor segredo no navegador.
