const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const index = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const sw = fs.readFileSync(require.resolve('../sw.js'), 'utf8');
const style = fs.readFileSync(require.resolve('../style.css'), 'utf8');

// Contratos que evitam regressões em comportamentos do navegador sem exigir DOM externo.
assert.match(app, /Promise\.all\(list\.map[\s\S]*?\)\.join\(''\)/,
  'a lista de cards deve unir o resultado assíncrono sem vírgulas');
assert.doesNotMatch(app, /\(await imageURL\(r\)\)[\s\S]{0,120}await imageURL\(r\)/,
  'cada card deve obter sua URL de imagem apenas uma vez');
assert.match(app, /activeRecognition\s*=\s*null/,
  'deve haver apenas um reconhecedor de voz ativo');
assert.match(app, /activeRecognition\.abort\(\)/,
  'um novo ditado deve abortar o anterior');
assert.match(app, /async function releaseWake\(\)/,
  'o Wake Lock deve ter uma rotina central de liberação');
assert.match(app, /function close\(id\)\{if\(id==='\#detailModal'\)\{stopRecognition\(\);stopSpeech\(\);void releaseWake\(\)\}/,
  'fechar o detalhe deve encerrar microfone, síntese e Wake Lock antes de destruir o modal');
assert.match(app, /function stopSpeech\(\)\{if\(window\.speechSynthesis\)window\.speechSynthesis\.cancel\(\)\}/,
  'o encerramento do detalhe deve cancelar a síntese quando ela estiver disponível');
assert.match(app, /async function requestWake\(\)\{[\s\S]*?navigator\.wakeLock\.request\('screen'\)[\s\S]*?catch\(_\)\{\}/,
  'o modo cozinha deve pedir Wake Lock progressivamente e ignorar rejeições sem quebrar a receita');
assert.match(app, /if\(kitchen\)\{wakeWanted=true;void requestWake\(\)\}else void releaseWake\(\)/,
  'entrar no modo cozinha deve pedir Wake Lock e sair deve liberá-lo');
assert.match(app, /save\.disabled=true/,
  'salvar deve bloquear clique duplicado');
assert.match(app, /finally\{save\.disabled=false\}/,
  'salvar deve ser reabilitado após erro');
assert.match(app, /role="dialog" aria-modal="true" aria-labelledby=/,
  'os modais precisam de semântica acessível');
assert.match(app, /URL\.revokeObjectURL\(url\)/,
  'a URL temporária do backup deve ser revogada');
assert.equal((app.match(/function form\(id,prefill\)/g)||[]).length, 1,
  'deve haver apenas a versão final do formulário, com suporte a fotos');
assert.match(app, /const MAX_BACKUP_PHOTO_DATA_SIZE=/,
  'o restore deve definir um limite explícito para foto embutida no backup');
assert.match(app, /isSafePhotoData=value=>.*?data:image\\\//s,
  'o restore deve aceitar somente data URLs de imagem');
assert.match(app, /if\(raw\.photoData\)\{if\(!isSafePhotoData\(raw\.photoData\)\)throw Error\('foto'\);const blob=await fetch\(raw\.photoData\)/,
  'o restore deve rejeitar foto inválida ou grande antes de chamar fetch');
assert.match(app, /e\.key!=='Tab'/,
  'Tab deve acionar o tratamento de foco dos modais');
assert.match(app, /const focusable=\[\.\.\.\$\(modal\)\.querySelectorAll\(/,
  'o modal deve coletar elementos focáveis para manter o foco dentro dele');
assert.match(app, /if\(e\.shiftKey&&document\.activeElement===first\)/,
  'Shift+Tab no primeiro controle deve voltar ao último');
assert.match(app, /else if\(!e\.shiftKey&&document\.activeElement===last\)/,
  'Tab no último controle deve voltar ao primeiro');
assert.match(app, /const time=m\.querySelector\('\#time'\);if\(time\)time\.min='0'/,
  'tempo não deve aceitar número negativo');
assert.match(app, /id="assistantTargetServings" type="number" min="1"/,
  'porções desejadas devem continuar exigindo ao menos uma porção');
assert.match(index, /rel="apple-touch-icon" href="icon-180\.png"/,
  'o ícone de tela inicial da Apple deve estar declarado');
assert.match(sw, /"\.\/icon-512-maskable\.png"/,
  'o ícone maskable deve entrar no cache inicial');
assert.match(index, /<script src="ocr\.js"><\/script>/,
  'o módulo OCR local deve ser carregado antes da interface');
assert.match(index, /<script src="assistant\.js"><\/script>/,
  'o assistente local deve ser carregado antes da interface');
assert.match(app, /aria-live="polite"/,
  'o progresso de OCR deve ser anunciado');
assert.match(app, /MemoriasDB\.putDraft/,
  'o OCR deve guardar a revisão temporária');
assert.match(app, /MemoriasDB\.deleteDraft/,
  'o rascunho OCR deve ser apagado ao concluir ou cancelar');
assert.match(app, /close\('#ocrModal'\);form\(null,parsed\)/,
  'usar texto OCR deve fechar o modal pelo fluxo central antes de abrir o formulário');
assert.match(app, /if\(pages\)\{const target=m\.querySelector\('textarea,button'\);if\(target\)target\.focus\(\)\}/,
  'o resultado OCR deve receber foco em seu primeiro campo acionável');
assert.match(app, /document\.addEventListener\('keydown',e=>\{const modal=.*?if\(e\.key==='Escape'\)/s,
  'Escape deve fechar o modal aberto');
assert.match(app, /returnFocus&&returnFocus\.isConnected/,
  'a restauração de foco não pode apontar para elemento removido');
assert.match(app, /photoURLInUse.*revokePhotoURL/s,
  'URLs de fotos removidas devem ser limpas apenas quando nenhuma imagem as usa');
assert.match(app, /async function removeRecipe\(id\).*?revokeUnusedPhotoURLs\(\)/s,
  'remover receita deve liberar URLs de foto somente após atualizar a interface');
assert.match(app, /async function refresh\(\).*?await render\(\);revokeUnusedPhotoURLs\(\)/s,
  'refresh deve limpar URLs de fotos que não pertencem mais às receitas');
assert.match(app, /capture="environment" multiple/,
  'a seleção de OCR deve manter suporte a múltiplas fotos');
assert.match(sw, /"\.\/ocr\.js"/,
  'somente o módulo OCR local deve entrar no cache do app');
assert.match(sw, /"\.\/assistant\.js"/,
  'o assistente local deve entrar no cache offline');
assert.doesNotMatch(sw, /tesseract|jsdelivr/i,
  'a CDN e o motor OCR não devem ser cacheados pelo service worker');
assert.match(app, /MemoriasAssistant\.searchRecipes\(recipes,\s*\$\('#search'\)\.value\)/,
  'a busca da interface deve usar o assistente local, sem serializar toda a receita');
assert.doesNotMatch(app, /recipes\.filter\(r=>JSON\.stringify\(r\)/,
  'a busca não deve voltar ao filtro JSON.stringify');
assert.match(app, /function detail\(id\)/,
  'cada card deve abrir o detalhe da receita');
assert.match(app, /<details class="assistant-panel">[\s\S]*?<summary>Assistente<\/summary>/,
  'o detalhe deve trazer um painel Assistente recolhível');
assert.match(app, /id="assistantTargetServings"[\s\S]*?aria-label="Porções desejadas"/,
  'o controle de porções precisa de label acessível');
assert.match(app, /oninput=scheduleAssistantDraw/,
  'alterar porções deve agendar, em vez de reconstruir, o Assistente a cada tecla');
assert.match(app, /setTimeout\([\s\S]*?,\s*\d{2,3}\)/,
  'o reagendamento das porções deve usar um debounce curto');
assert.match(app, /clearTimeout\(assistantRenderTimer\)/,
  'uma nova tecla deve cancelar a reconstrução pendente do Assistente');
assert.match(app, /MemoriasAssistant\.scaleIngredients\(r\.ingredients,\s*factor\)/,
  'as porções devem ser recalculadas pelo assistente sem alterar a receita');
assert.match(app, /MemoriasAssistant\.buildShoppingList\(\[\{\.\.\.r,ingredients:scaled\}\],\s*1\)/,
  'a lista de compras deve vir do assistente para a receita em exibição');
assert.match(app, /type="checkbox" data-shopping-check/,
  'a lista de compras de sessão precisa permitir marcação');
assert.match(app, /MemoriasAssistant\.suggestSubstitution\(/,
  'cada ingrediente deve poder pedir uma substituição');
assert.match(app, /MemoriasAssistant\.adaptCookingMethod\(r\.steps/, 
  'o seletor deve adaptar os passos para forno ou air fryer');
assert.match(app, /navigator\.share|navigator\.clipboard/,
  'o detalhe deve preservar compartilhamento');
assert.match(app, /window\.print\(\)/,
  'o detalhe deve preservar impressão');
assert.match(style, /button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible/,
  'controles devem exibir foco visível pelo teclado');
assert.match(style, /\.assistant-panel\s+:is\(button,input,select,textarea\):focus-visible/,
  'os controles do painel Assistente devem manter foco visível');
assert.match(style, /outline:\s*3px solid var\(--focus\)/,
  'o foco visível deve ter contraste reforçado');
assert.match(app, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/,
  'o modo cozinha deve detectar as duas variantes de reconhecimento de voz');
assert.match(app, /const kitchenVoice=m\.querySelector\('\#kitchenVoice'\);if\(kitchenVoice\)kitchenVoice\.setAttribute\('aria-pressed','false'\)/,
  'o botão de voz deve iniciar despressionado quando o detalhe é aberto');
assert.match(app, /id="kitchenVoice"[\s\S]*?aria-describedby="kitchenVoiceHelp"/,
  'o botão de voz deve ter explicação acessível');
assert.match(app, /voiceSupported\?'':'disabled'/,
  'o controle deve permanecer desabilitado quando a API não existir');
assert.match(app, /recognition\.onerror=reset;recognition\.onend=reset/,
  'o reconhecimento deve sempre restaurar o controle ao terminar ou falhar');
assert.match(app, /if\(activeRecognition\)\{stopRecognition\(\);return\}/,
  'uma nova escuta não pode iniciar enquanto houver sessão ativa');
assert.match(app, /MemoriasAssistant\.parseVoiceCommand\(text\)/,
  'a interface deve usar o parser local de intenções');
assert.match(app, /speakPlainText\(r\.steps\[kitchenStep\]/,
  'repetir deve falar texto simples do passo atual');
assert.match(app, /id="kitchenIngredients" aria-live="polite"/,
  'ingredientes mostrados por voz devem ser anunciados');
assert.match(style, /\.kitchen-voice-controls\{display:none\}\.kitchen \.kitchen-voice-controls\{display:block\}/,
  'os controles de voz devem aparecer apenas no modo cozinha');
assert.match(index, /<script src="ai-adapter\.js"><\/script>/,
  'o adaptador opcional deve carregar antes da interface');
assert.match(sw, /"\.\/ai-adapter\.js"/,
  'o adaptador opcional deve entrar no cache offline');
assert.match(app, /Pergunte sobre esta receita/,
  'o painel Assistente deve oferecer uma pergunta sobre a receita');
assert.match(app, /id="aiResponse" aria-live="polite"/,
  'a resposta do adaptador deve ser anunciada');
assert.match(app, /MemoriasAI\.ask\(question,context,\{endpoint\}\)/,
  'a pergunta só pode chamar o adaptador após ação explícita');
assert.match(app, /const result=await MemoriasAI\.ask\(question,context,\{endpoint\}\);[\s\S]*?if\(result\.mode==='proxy'\)localStorage\.setItem\('memorias-ai-endpoint',endpoint\);else localStorage\.removeItem\('memorias-ai-endpoint'\)/,
  'o endpoint só deve ser persistido após resposta em modo proxy e removido no fallback local');
assert.doesNotMatch(app, /<input id="aiShareContext" type="checkbox"[^>]*checked/,
  'o consentimento de contexto nunca pode ser marcado automaticamente');
assert.match(app, /O contexto não será enviado até marcar esta opção\./,
  'a UI deve esclarecer em cada abertura que contexto exige nova marcação');
assert.match(app, /try\{[\s\S]*?await MemoriasAI\.ask\(question,context,\{endpoint\}\)[\s\S]*?\}catch\(_\)\{response\.textContent='Não foi possível responder agora\. Tente novamente\.'/,
  'falhas inesperadas ao perguntar devem gerar mensagem amigável na resposta');
assert.match(app, /id="aiAsk" aria-label="Perguntar ao assistente"/,
  'o botão de pergunta deve ter nome acessível explícito');
assert.match(app, /Enviar título e porções ao proxy/,
  'o contexto enviado ao proxy deve exigir consentimento explícito');
assert.doesNotMatch(app, /api[_-]?key/i,
  'a interface não pode pedir ou armazenar chave de API');
assert.match(app, /id="recipePhoto" type="file" accept="image\/\*" capture="environment"/,
  'o formulário deve permitir foto pela câmera ou galeria');
assert.match(app, /id="photoPreview"[^>]*aria-live="polite"/,
  'a prévia de foto deve anunciar mudanças de forma acessível');
assert.match(app, /id="changePhoto"[\s\S]*?id="removePhoto"/,
  'o formulário deve permitir trocar e remover a foto');
assert.match(app, /const MAX_PHOTO_FILE_SIZE=10\*1024\*1024/,
  'a foto original deve ter limite explícito de 10 MB');
assert.match(app, /async function compressPhoto\(file\)[\s\S]*?Math\.min\(1,1600\/Math\.max\(image\.width,image\.height\)\)[\s\S]*?canvas\.toBlob[\s\S]*?'image\/jpeg',\.82/,
  'a foto deve ser reduzida para no máximo 1600 px e JPEG qualidade 0,82 antes de salvar');
assert.match(app, /await MemoriasDB\.putPhoto\(photoId,compressedPhoto\)/,
  'o Blob comprimido deve ser salvo no IndexedDB');
assert.match(app, /if\(removeCurrentPhoto&&r\.photoId\)[\s\S]*?await MemoriasDB\.removePhoto\(r\.photoId\)[\s\S]*?photoId=''/,
  'remover uma foto existente deve apagar o Blob e seu photoId');
assert.match(app, /let photoId=r\.photoId\|\|''/,
  'editar sem trocar a foto deve preservar o photoId existente');
assert.match(app, /function cleanupFormPhotoPreview\(\)[\s\S]*?URL\.revokeObjectURL\(formPhotoPreviewURL\)/,
  'a URL temporária da prévia do formulário deve ser revogada');
assert.match(index, /http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https:\/\/cdn\.jsdelivr\.net; connect-src 'self' https:; worker-src 'self' blob:; img-src 'self' blob: data:; style-src 'self' https:\/\/fonts\.googleapis\.com 'unsafe-inline'; font-src 'self' https:\/\/fonts\.gstatic\.com data:;"/,
  'a CSP deve permitir apenas os recursos locais e dependências necessárias');

console.log('app.test.js: ok');
