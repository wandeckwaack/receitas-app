const assert = require('node:assert/strict');
const { normalizeRecipe, makeBackup, legacyRecipes } = require('../db.js');

const legacy = [{ id: 'antiga', title: 'Bolo', category: 'Doce', time: 30, servings: 8,
  difficulty: 'Fácil', favorite: true, ingredients: [{ qty: '1', unit: 'xíc.', name: 'farinha' }], steps: ['Misture.'] }];

assert.deepEqual(legacyRecipes(JSON.stringify(legacy)), legacy);
assert.deepEqual(legacyRecipes({ receitas: legacy }), legacy);
const recipe = normalizeRecipe({ ...legacy[0], author: 'Vó Ana', originStory: 'Caderno da família', tips: 'Forno baixo' });
assert.equal(recipe.author, 'Vó Ana');
assert.equal(recipe.originStory, 'Caderno da família');
assert.equal(recipe.tips, 'Forno baixo');
assert.deepEqual(recipe.ingredients, legacy[0].ingredients);
const backup = makeBackup([recipe], { migratedAt: '2026-09-20T00:00:00.000Z' });
assert.equal(backup.app, 'memorias-a-mesa');
assert.equal(backup.versao, 2);
assert.equal(backup.receitas[0].author, 'Vó Ana');
console.log('db.test.js: ok');
