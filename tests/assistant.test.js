const assert = require('node:assert/strict');
const {
  parseIngredients,
  scaleIngredients,
  convertIngredient,
  buildShoppingList,
  suggestSubstitution,
  adaptCookingMethod,
  searchRecipes,
  parseVoiceCommand
} = require('../assistant.js');

const ingredients = [
  '2 xícaras de farinha de trigo',
  { qty: 'a gosto', unit: '', name: 'sal' },
  { qty: 'uma pitada', unit: '', name: 'canela' },
  { qty: 'quanto baste', unit: '', name: 'azeite' }
];
const parsed = parseIngredients(ingredients);
assert.deepEqual(parsed[0], { qty: 2, unit: 'xícara', name: 'farinha de trigo' });
assert.deepEqual(parsed.slice(1), [
  { qty: 'a gosto', unit: '', name: 'sal' },
  { qty: 'uma pitada', unit: '', name: 'canela' },
  { qty: 'quanto baste', unit: '', name: 'azeite' }
]);
assert.deepEqual(scaleIngredients(parsed, 2), [
  { qty: 4, unit: 'xícara', name: 'farinha de trigo' },
  { qty: 'a gosto', unit: '', name: 'sal' },
  { qty: 'uma pitada', unit: '', name: 'canela' },
  { qty: 'quanto baste', unit: '', name: 'azeite' }
]);
assert.deepEqual(parsed[0], { qty: 2, unit: 'xícara', name: 'farinha de trigo' }, 'não pode mutar ingredientes');
assert.deepEqual(parseIngredients(null), []);
assert.deepEqual(parseIngredients(['pitada de noz-moscada']), [{ qty: 'pitada', unit: '', name: 'noz-moscada' }]);
assert.deepEqual(scaleIngredients([{ qty: 2, unit: 'unidade', name: 'ovos' }], 0), [{ qty: 2, unit: 'unidade', name: 'ovos' }],
  'fator zero deve preservar a quantidade, sem criar item de compra com zero');
assert.deepEqual(scaleIngredients([{ qty: 2, unit: 'unidade', name: 'ovos' }], -1), [{ qty: 2, unit: 'unidade', name: 'ovos' }],
  'fator negativo deve preservar a quantidade, sem criar item de compra inválido');
assert.doesNotMatch(require('node:fs').readFileSync(require.resolve('../assistant.js'), 'utf8'), /JSON\.stringify/,
  'a busca não deve serializar a receita inteira');

assert.deepEqual(convertIngredient({ qty: 1, unit: 'L', name: 'leite' }, 'ml'), { qty: 1000, unit: 'ml', name: 'leite' });
assert.deepEqual(convertIngredient({ qty: 500, unit: 'g', name: 'farinha' }, 'kg'), { qty: 0.5, unit: 'kg', name: 'farinha' });
assert.deepEqual(convertIngredient({ qty: 1, unit: 'colher de sopa', name: 'óleo' }, 'colher de chá'), { qty: 3, unit: 'colher de chá', name: 'óleo' });
assert.deepEqual(convertIngredient({ qty: 1, unit: 'xícara', name: 'leite' }, 'ml'), { qty: 240, unit: 'ml', name: 'leite' });
assert.deepEqual(convertIngredient({ qty: 'a gosto', unit: '', name: 'sal' }, 'g'), { qty: 'a gosto', unit: '', name: 'sal' });

const shopping = buildShoppingList([
  { title: 'Bolo', ingredients: [{ qty: 1, unit: 'xícara', name: 'farinha de trigo' }, { qty: 'a gosto', unit: '', name: 'sal' }] },
  { title: 'Pão', ingredients: [{ qty: 240, unit: 'ml', name: 'farinha de trigo' }, { qty: 2, unit: 'unidades', name: 'ovos' }] }
], 2);
assert.deepEqual(shopping.Despensa, [
  { qty: 4, unit: 'xícara', name: 'farinha de trigo' }
]);
assert.deepEqual(shopping.Temperos, [
  { qty: 'a gosto', unit: '', name: 'sal' }
]);
assert.deepEqual(shopping['Laticínios e ovos'], [{ qty: 4, unit: 'unidade', name: 'ovos' }]);
assert.equal(shopping.Despensa.length, 1, 'ingredientes equivalentes devem ser deduplicados com conversão volumétrica segura');

const incompatibleShopping = buildShoppingList([
  { ingredients: [{ qty: 2, unit: 'unidade', name: 'cebola' }, { qty: 'a gosto', unit: '', name: 'cebola' }] },
  { ingredients: [{ qty: 'a gosto', unit: '', name: 'alho' }, { qty: 1, unit: 'unidade', name: 'alho' }] }
], 1);
assert.deepEqual(incompatibleShopping.Hortifruti, [
  { qty: 2, unit: 'unidade', name: 'cebola' },
  { qty: 'a gosto', unit: '', name: 'cebola' },
  { qty: 'a gosto', unit: '', name: 'alho' },
  { qty: 1, unit: 'unidade', name: 'alho' }
], 'ocorrências numéricas e textuais incompatíveis devem permanecer separadas');

const substitute = suggestSubstitution('manteiga');
assert.equal(substitute.found, true);
assert.ok(substitute.confidence > 0 && substitute.confidence <= 1);
assert.match(substitute.warning, /não é orientação médica\/nutricional/i);
assert.equal(suggestSubstitution('ingrediente inexistente').found, false);

const steps = ['Asse em forno médio por 30 minutos.', 'Sirva quente.'];
const adapted = adaptCookingMethod(steps, 'air fryer');
assert.equal(adapted.method, 'air fryer');
assert.match(adapted.steps[0], /air fryer/i);
assert.match(adapted.warning, /confira o modelo/i);
assert.deepEqual(steps, ['Asse em forno médio por 30 minutos.', 'Sirva quente.'], 'não pode mutar os passos');
const mixedSteps = ['Refogue na panela por 20 minutos a 180°C.', 'Asse no forno a 200°C por 30 minutos.'];
const mixedAdapted = adaptCookingMethod(mixedSteps, 'air fryer');
assert.equal(mixedAdapted.steps[0], mixedSteps[0], 'passo de panela não pode ter tempo ou temperatura alterados');
assert.match(mixedAdapted.steps[1], /air fryer a 180°C por 24 minutos/i);
assert.match(mixedAdapted.warning, /confira o modelo/i);
assert.match(adaptCookingMethod(['Inicie o assamento a 200°C por 30 minutos.'], 'air fryer').steps[0], /180°C por 24 minutos/i,
  'passo que indica assamento deve receber a estimativa para air fryer');
assert.equal(adaptCookingMethod(steps, 'panela').supported, false);

const found = searchRecipes([
  { title: 'Bolo de cenoura', category: 'Bolos', ingredients: [{ name: 'cenoura' }, { name: 'farinha' }] },
  { title: 'Sopa de abóbora', category: 'Sopas', ingredients: [{ name: 'abóbora' }] },
  { title: 'Macarrão alho e óleo', category: 'Massas', ingredients: [{ name: 'alho' }] }
], 'cenoura bolo');
assert.deepEqual(found.map(recipe => recipe.title), ['Bolo de cenoura']);
assert.deepEqual(searchRecipes([{ title: 'Bolo', notes: 'tem cenoura escondida' }], 'cenoura'), [], 'campos não pesquisáveis não devem causar falso positivo');
assert.deepEqual(searchRecipes([{ title: 'Pão', ingredients: [{ name: 'farinha' }] }], 'pao'), [{ title: 'Pão', ingredients: [{ name: 'farinha' }] }]);

assert.deepEqual(parseVoiceCommand('próximo passo'), { intent: 'next-step', confidence: 1 });
assert.deepEqual(parseVoiceCommand('PROXIMO  PASSO!'), { intent: 'next-step', confidence: 1 });
assert.deepEqual(parseVoiceCommand('passo anterior'), { intent: 'previous-step', confidence: 1 });
assert.deepEqual(parseVoiceCommand('voltar'), { intent: 'previous-step', confidence: 1 });
assert.deepEqual(parseVoiceCommand('repita, por favor'), { intent: 'repeat-step', confidence: 0.9 });
assert.deepEqual(parseVoiceCommand('ler os ingredientes'), { intent: 'read-ingredients', confidence: 1 });
assert.deepEqual(parseVoiceCommand('mostrar ingrediente'), { intent: 'show-ingredients', confidence: 0.9 });
assert.deepEqual(parseVoiceCommand('ative o modo escuro'), { intent: 'toggle-dark-mode', confidence: 1 });
assert.deepEqual(parseVoiceCommand('quero dançar enquanto cozinho'), { intent: 'none', confidence: 0 });
assert.deepEqual(parseVoiceCommand(null), { intent: 'none', confidence: 0 });

console.log('assistant.test.js: ok');
