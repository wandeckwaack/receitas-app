const assert = require('node:assert/strict');
const fs = require('node:fs');
const { normalizeDraft, parseRecipeText } = require('../ocr.js');
const ocrSource = fs.readFileSync(require.resolve('../ocr.js'), 'utf8');

assert.match(ocrSource, /const terminateWorker=\(\)=>\{const current=worker;worker=null;return current&&current\.terminate\(\)\}/,
  'o worker deve ser removido da referência imediatamente ao terminar');

assert.deepEqual(normalizeDraft({ text: '  Bolo da vó\r\n\r\n  2 xícaras de farinha  ', confidence: 0.86 }), {
  text: 'Bolo da vó\n\n2 xícaras de farinha', confidence: 0.86, confidenceLabel: 'Alta'
});
assert.equal(normalizeDraft({ text: 'x', confidence: .51 }).confidenceLabel, 'Média');
assert.equal(normalizeDraft({ text: 'x', confidence: .2 }).confidenceLabel, 'Baixa');

const parsed = parseRecipeText(`Bolo de milho\nReceita da vó, feita nas festas.\n2 xícaras de milho\n1 colher de açúcar\n- Misture tudo\n2. Asse por 40 minutos`);
assert.equal(parsed.title, 'Bolo de milho');
assert.deepEqual(parsed.ingredients, [
  { qty: '2', unit: 'xícaras', name: 'milho' },
  { qty: '1', unit: 'colher', name: 'açúcar' }
]);
assert.deepEqual(parsed.steps, ['Misture tudo', 'Asse por 40 minutos']);
assert.equal(parsed.originStory, 'Receita da vó, feita nas festas.');

console.log('ocr.test.js: ok');
