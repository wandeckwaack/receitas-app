const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const index = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const sw = fs.readFileSync(require.resolve('../sw.js'), 'utf8');
const style = fs.readFileSync(require.resolve('../style.css'), 'utf8');

assert.equal((app.match(/function form\(id,prefill\)/g) || []).length, 1);
assert.match(app, /MemoriasAI\.suggestRecipes\(query/);
assert.match(app, /role="dialog" aria-modal="true" aria-labelledby=/);
assert.match(app, /async function releaseWake\(\)/);
assert.match(app, /navigator\.(share|clipboard)/);
assert.match(app, /window\.print\(\)/);
assert.match(app, /aria-live="polite"/);
assert.match(app, /MemoriasDB\.putDraft/);
assert.match(app, /MemoriasDB\.deleteDraft/);
assert.match(app, /MAX_BACKUP_PHOTO_DATA_SIZE/);
assert.match(app, /isSafePhotoData/);
assert.match(app, /URL\.revokeObjectURL\(url\)/);
assert.match(app, /save\.disabled=true/);
assert.match(app, /finally\{save\.disabled=false\}/);
assert.doesNotMatch(app, /api[_-]?key/i);

assert.match(index, /id="search"/);
assert.match(index, /id="aiImport"/);
assert.match(index, /id="restoreButton"/);
assert.match(index, /Content-Security-Policy/);
assert.match(sw, /memorias-a-mesa-v[0-9]+/);
assert.match(sw, /"\.\/ai-adapter\.js"/);
assert.match(sw, /"\.\/assistant\.js"/);
assert.match(style, /prefers-reduced-motion/);
assert.match(style, /\.welcome/);
assert.match(style, /\.kitchen-illustration/);
assert.match(style, /button:focus-visible/);

console.log('app.test.js: ok');

assert.match(app, /async function runSearch\(query\)/);
assert.match(app, /MemoriasAI\.suggestRecipes\(query/);
assert.match(app, /window\.MEMORIAS_PROXY_URL\|\|''/);
assert.match(app, /data-save-result/);
assert.match(app, /MemoriasDB\.put\(\{\.\.\.items/);
assert.doesNotMatch(app, /aiSuggestModal|openAISuggestions|previewSuggestion/);
assert.doesNotMatch(app, /MemoriasAssistant\.(scaleIngredients|buildShoppingList|suggestSubstitution|adaptCookingMethod)/);
assert.doesNotMatch(app, /SpeechRecognition|speechSynthesis|memorias-ai-endpoint/);
assert.doesNotMatch(app, /capture="environment"/);
assert.match(index, /id="heroSearchForm"/);
assert.match(index, /id="results"/);
assert.match(index, /id="closeResults"/);
assert.match(index, /id="aiImport"/);
assert.match(index, /Guardar uma cópia das receitas/);
assert.doesNotMatch(index, /aiSuggest|Assistente|Comandos de voz|proxy/i);
assert.match(style, /\.result-card/);
