# Relatório — Micro-fatia 3: comandos de voz

Data: 2026-09-20

## Entrega

- `assistant.js` ganhou `parseVoiceCommand(text)`, função pura e local para
  comandos em pt-BR, tolerante a acentos, maiúsculas e pontuação.
- O Modo cozinha passou a exibir controles de voz apenas nesse modo. Quando a
  Web Speech API não existe, o botão fica desabilitado com explicação acessível.
- Os comandos avançam ou voltam o passo, repetem o passo por síntese de voz
  quando disponível, leem/mostram ingredientes e alternam o tema.
- Apenas uma sessão de reconhecimento fica ativa. Cancelar, encerrar ou receber
  erro reabilita o controle. O fechamento do detalhe continua usando o fluxo
  central que encerra reconhecimento e libera Wake Lock.
- Conteúdo que vai ao DOM é escapado; a síntese recebe o texto simples da receita.
- Revisão de voz (achados médios): o fechamento do detalhe — pelo botão, Escape,
  editar ou excluir — agora interrompe reconhecimento, cancela a síntese disponível
  e libera o Wake Lock antes de destruir o modal. O botão de comando inicia com
  `aria-pressed="false"`. Ao entrar no Modo cozinha, o app solicita Wake Lock de
  tela de forma progressiva; falta, recusa ou uma resposta tardia são tratadas sem
  erro e a trava é liberada ao sair ou fechar o detalhe.

## TDD e validação

1. Foram criados primeiro testes de `parseVoiceCommand` em
   `tests/assistant.test.js`.
2. RED registrado: `TypeError: parseVoiceCommand is not a function`.
3. Parser implementado e testes do assistente passaram em GREEN.
4. `tests/app.test.js` recebeu contratos para suporte de navegador,
   acessibilidade, sessão única, encerramento e anúncio de ingredientes.
5. Nesta revisão, os contratos foram adicionados antes da implementação. RED
   registrado: falha em “fechar o detalhe deve encerrar microfone, síntese e Wake
   Lock antes de destruir o modal”; GREEN: `node tests/app.test.js` passou após a
   implementação.

## Checklist de ideia (escopo desta micro-fatia)

| Item | Status | Evidência / motivo |
|---|---|---|
| Dados pessoais e rede | Não aplica | Parser e comandos são locais; não há envio, conta ou nova API. |
| Permissão de microfone | Pendente do navegador | A Web Speech API pede a permissão quando suportada; interface explica indisponibilidade. |
| Acessibilidade | OK | Botão possui nome, descrição e `aria-live` para ingredientes/status. |
| Sessões concorrentes | OK | `app.js` mantém `activeRecognition` único e chama `abort()` ao cancelar. |
| Segurança de saída | OK | `esc()` é usado no HTML; síntese recebe texto simples. |
| Proxy de IA | Não aplica | Explicitamente fora desta micro-fatia. |

Não houve commit, push ou deploy.
