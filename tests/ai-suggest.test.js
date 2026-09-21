const assert = require('node:assert/strict');
const { MemoriasAI } = require('../ai-adapter.js');

async function run() {
  assert.equal(typeof MemoriasAI.suggestRecipes, 'function',
    'a API pública de sugestões deve existir');

  const local = await MemoriasAI.suggestRecipes('fazer arroz mineiro');
  assert.equal(local.mode, 'local');
  assert.match(local.notice, /modelos locais.*não.*IA generativa/i);
  assert.ok(local.suggestions.length >= 3, 'arroz mineiro deve oferecer ao menos três variações');
  assert.deepEqual(local.suggestions.map(item => item.title), [
    'Arroz mineiro tradicional',
    'Arroz mineiro com frango',
    'Arroz mineiro vegetariano'
  ]);
  for (const suggestion of local.suggestions) {
    assert.ok(suggestion.title);
    assert.ok(suggestion.ingredients.length <= 50);
    assert.ok(suggestion.steps.length <= 30);
    assert.equal(Object.hasOwn(suggestion, 'id'), false);
    assert.equal(Object.hasOwn(suggestion, 'photoId'), false);
  }

  const limited = await MemoriasAI.suggestRecipes('arroz mineiro', { maxResults: 1 });
  assert.equal(limited.suggestions.length, 1);
  await assert.rejects(() => MemoriasAI.suggestRecipes('oi'), /3 caracteres/i);

  const localIntents = [
    ['almoco rapido', /almoço rápido/i], ['jantar economico', /jantar econômico/i],
    ['vegetariana', /vegetariana/i], ['sobremesa', /sobremesa|bolo/i], ['sopa', /sopa/i],
    ['frango', /frango/i], ['peixe', /peixe/i], ['carne', /carne/i], ['moqueca', /moqueca/i],
    ['lasanha', /lasanha/i], ['massa italiana', /massa italiana/i], ['curry', /curry/i],
    ['tacos', /tacos/i], ['pao de queijo', /pão de queijo/i], ['brigadeiro', /brigadeiro/i],
    ['salada', /salada/i]
  ];
  for (const [query, expected] of localIntents) {
    const result = await MemoriasAI.suggestRecipes(query, { maxResults: 5 });
    assert.ok(result.suggestions.length >= 1, `${query} deve ter ao menos um modelo local`);
    assert.match(result.suggestions[0].title, expected, `${query} deve aceitar variações sem acento`);
  }

  const genericDinner = await MemoriasAI.suggestRecipes('jantar; estilo econômica', { maxResults: 5 });
  assert.ok(genericDinner.suggestions.some(item => item.title === 'Jantar econômico de legumes'),
    'uma busca genérica por jantar com estilo econômica deve encontrar o jantar econômico');

  const firstSurprise = await MemoriasAI.suggestRecipes('surpreenda-me', { maxResults: 3 });
  const secondSurprise = await MemoriasAI.suggestRecipes('surpreenda-me', { maxResults: 3 });
  assert.notDeepEqual(firstSurprise.suggestions.map(item => item.title), secondSurprise.suggestions.map(item => item.title),
    'chamadas consecutivas de surpreenda-me devem variar a primeira sequência de modelos locais');

  const filtered = await MemoriasAI.suggestRecipes('vegetariana até 30 min; estilo vegetariana', { maxResults: 5 });
  assert.ok(filtered.suggestions.length >= 1, 'filtros incorporados à consulta devem manter modelos compatíveis');
  assert.ok(filtered.suggestions.every(item => item.time <= 30), 'o filtro de tempo deve limitar os modelos locais');
  assert.ok(filtered.suggestions.every(item => item.tags.includes('vegetariana')),
    'o filtro de estilo deve ser aplicado aos modelos locais');

  const lactoseFree = await MemoriasAI.suggestRecipes('sobremesa; estilo sem lactose', { maxResults: 5 });
  assert.ok(lactoseFree.suggestions.length >= 1, 'preferência sem lactose deve compor a consulta local');
  assert.ok(lactoseFree.suggestions.every(item => item.tags.includes('sem-lactose')),
    'a preferência sem lactose deve filtrar modelos marcados para ela');

  let payload;
  const proxied = await MemoriasAI.suggestRecipes('x'.repeat(250), {
    endpoint: 'https://ia.exemplo.test/sugerir', maxResults: 9,
    fetch: async (_url, init) => {
      payload = JSON.parse(init.body);
      return { ok: true, json: async () => ({ suggestions: [{
        title: 'Modelo do proxy', category: 'Pratos', time: 25, servings: 4,
        difficulty: 'Fácil', ingredients: [{ qty: '1', unit: 'xícara', name: 'arroz' }],
        steps: ['Cozinhe e sirva.'], tips: 'Prove o sal.', originStory: 'Teste.', id: 'não-vai', photoId: 'nem-isto'
      }, { category: 'Inválida' }] }) };
    }
  });
  assert.equal(proxied.mode, 'proxy');
  assert.deepEqual(payload, { query: 'x'.repeat(200), maxResults: 5 });
  assert.equal(proxied.suggestions.length, 1);
  assert.equal(Object.hasOwn(proxied.suggestions[0], 'id'), false);
  assert.equal(Object.hasOwn(proxied.suggestions[0], 'photoId'), false);

  const fallback = await MemoriasAI.suggestRecipes('bolo simples', {
    endpoint: 'https://ia.exemplo.test/sugerir', fetch: async () => { throw new Error('sem rede'); }
  });
  assert.equal(fallback.mode, 'local');
  assert.match(fallback.notice, /busca online|proxy/i);
  console.log('ai-suggest.test.js: ok');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
