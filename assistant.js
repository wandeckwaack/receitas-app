/* Memórias à Mesa — assistente local, sem rede ou dependências. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoriasAssistant = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const aliases = {
    ml: 'ml', mililitro: 'ml', mililitros: 'ml', l: 'L', litro: 'L', litros: 'L',
    g: 'g', grama: 'g', gramas: 'g', kg: 'kg', quilo: 'kg', quilos: 'kg',
    'colher de cha': 'colher de chá', 'colher de chá': 'colher de chá', 'colheres de cha': 'colher de chá', 'colheres de chá': 'colher de chá',
    'colher de sopa': 'colher de sopa', 'colheres de sopa': 'colher de sopa',
    xicara: 'xícara', xicaras: 'xícara', 'xícara': 'xícara', 'xícaras': 'xícara',
    unidade: 'unidade', unidades: 'unidade', un: 'unidade', uns: 'unidade'
  };
  const factors = {
    ml: { volume: 1 }, L: { volume: 1000 }, 'colher de chá': { volume: 5 },
    'colher de sopa': { volume: 15 }, 'xícara': { volume: 240 },
    g: { mass: 1 }, kg: { mass: 1000 }, unidade: { count: 1 }
  };
  const categoryWords = {
    Hortifruti: ['alho', 'cebola', 'batata', 'cenoura', 'tomate', 'abobora', 'abobrinha', 'limão', 'limao', 'banana', 'maçã', 'maca'],
    'Laticínios e ovos': ['leite', 'queijo', 'manteiga', 'creme de leite', 'iogurte', 'ovo'],
    Carnes: ['carne', 'frango', 'peixe', 'linguiça', 'bacon'],
    Padaria: ['pão', 'pao', 'fermento biologico'],
    Temperos: ['sal', 'pimenta', 'orégano', 'oregano', 'canela', 'cominho', 'paprica', 'açafrão', 'acafrao'],
    Despensa: []
  };
  const substitutions = {
    manteiga: { suggestions: ['margarina (mesma medida)', 'óleo vegetal (cerca de 80% da medida)'], confidence: 0.78 },
    leite: { suggestions: ['bebida vegetal sem açúcar (mesma medida)', 'água em massas simples, com ajuste de sabor'], confidence: 0.72 },
    ovo: { suggestions: ['1 colher de sopa de linhaça moída + 3 de água, por ovo (massas)', 'purê de banana em receitas doces'], confidence: 0.65 },
    'farinha de trigo': { suggestions: ['farinha de aveia ou mistura sem glúten; textura e líquido podem mudar'], confidence: 0.55 },
    açúcar: { suggestions: ['açúcar mascavo (mesma medida, sabor diferente)', 'adoçante culinário conforme a embalagem'], confidence: 0.64 },
    creme: { suggestions: ['iogurte natural em preparos frios ou molhos, ajustando a acidez'], confidence: 0.58 }
  };
  const warning = 'Sugestão culinária geral; não é orientação médica/nutricional. Confira alergias, restrições e rótulos.';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function fold(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function canonicalUnit(unit) { return aliases[fold(unit)] || clean(unit); }
  function numberQty(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const text = clean(value).replace(',', '.');
    if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
    const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
    return fraction && Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
  }
  function cloneIngredient(item) { return { qty: item.qty, unit: item.unit, name: item.name }; }
  function parseOne(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const qty = numberQty(raw.qty);
      return { qty: qty === null ? clean(raw.qty) : qty, unit: canonicalUnit(raw.unit), name: clean(raw.name) };
    }
    const text = clean(raw);
    if (!text) return null;
    const match = text.match(/^\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s+(.+)$/);
    if (!match) {
      const special = text.match(/^(a gosto|uma pitada|pitada|quanto baste)\b\s*(.*)$/i);
      return special ? { qty: special[1].toLowerCase(), unit: '', name: clean(special[2]).replace(/^de\s+/i, '') } : { qty: '', unit: '', name: text };
    }
    const remainder = match[2];
    const known = Object.keys(aliases).sort((a, b) => b.length - a.length).find(unit => fold(remainder) === unit || fold(remainder).startsWith(unit + ' '));
    const unit = known ? canonicalUnit(known) : '';
    return { qty: numberQty(match[1]), unit, name: clean(known ? clean(remainder.slice(known.length)).replace(/^de\s+/i, '') : remainder) };
  }
  function parseIngredients(input) { return Array.isArray(input) ? input.map(parseOne).filter(Boolean) : []; }
  function scaleIngredients(input, factor) {
    const multiplier = Number(factor);
    return parseIngredients(input).map(item => ({ ...item, qty: typeof item.qty === 'number' && Number.isFinite(multiplier) && multiplier > 0 ? item.qty * multiplier : item.qty }));
  }
  function convertIngredient(input, targetUnit) {
    const item = parseOne(input) || { qty: '', unit: '', name: '' };
    const target = canonicalUnit(targetUnit), from = factors[item.unit], to = factors[target];
    if (typeof item.qty !== 'number' || !from || !to) return cloneIngredient(item);
    const dimension = Object.keys(from)[0];
    if (!Object.prototype.hasOwnProperty.call(to, dimension)) return cloneIngredient(item);
    return { ...item, qty: item.qty * from[dimension] / to[dimension], unit: target };
  }
  function categoryFor(name) {
    const normalized = fold(name);
    return Object.keys(categoryWords).find(category => categoryWords[category].some(word => normalized.includes(fold(word)))) || 'Despensa';
  }
  function singular(name) { return fold(name).replace(/\b(oes|ãos)\b/g, 'ao').replace(/s$/,''); }
  function buildShoppingList(recipes, factor) {
    const output = {}, index = new Map();
    (Array.isArray(recipes) ? recipes : []).forEach(recipe => {
      scaleIngredients(recipe && recipe.ingredients, factor).forEach(item => {
        if (!item.name) return;
        const category = categoryFor(item.name), key = category + '|' + singular(item.name);
        const numericEntries = index.get(key) || [];
        if (typeof item.qty !== 'number') {
          const copy = cloneIngredient(item); (output[category] ||= []).push(copy); return;
        }
        const prior = numericEntries.find(entry => convertIngredient(item, entry.unit).unit === entry.unit);
        if (prior) prior.qty += convertIngredient(item, prior.unit).qty;
        else {
          const copy = cloneIngredient(item); (output[category] ||= []).push(copy); numericEntries.push(copy); index.set(key, numericEntries);
        }
      });
    });
    return output;
  }
  function suggestSubstitution(ingredient) {
    const name = fold(ingredient), match = Object.keys(substitutions).find(key => name === fold(key) || name.includes(fold(key)));
    return match ? { found: true, ingredient: clean(ingredient), ...substitutions[match], warning } : { found: false, ingredient: clean(ingredient), suggestions: [], confidence: 0, warning };
  }
  function adaptCookingMethod(steps, method) {
    const requested = fold(method), supported = requested === 'forno' || requested === 'air fryer' || requested === 'airfryer';
    const original = Array.isArray(steps) ? steps.map(clean) : [];
    if (!supported) return { supported: false, method: clean(method), steps: original, warning: 'Método ainda não suportado nesta micro-fatia.' };
    const target = requested === 'forno' ? 'forno' : 'air fryer';
    const adapted = original.map(step => /\bforno\b|\bass(?:e|a|ad|am)\w*\b/i.test(step)
      ? step.replace(/forno/ig, target).replace(/(\d{2,3})\s*°?\s*c/ig, (_, t) => target === 'air fryer' ? Math.max(150, Number(t) - 20) + '°C' : Number(t) + '°C').replace(/(\d+)\s*minutos?/ig, (_, t) => target === 'air fryer' ? Math.max(5, Math.round(Number(t) * 0.8)) + ' minutos' : Number(t) + ' minutos')
      : step);
    return { supported: true, method: target, steps: adapted, estimate: target === 'air fryer' ? 'Em geral, reduza cerca de 20°C e 20% do tempo indicado para forno.' : 'Use a temperatura e o tempo originais como ponto de partida.', warning: 'Estimativa: confira o modelo, o tamanho da porção e o ponto do alimento durante o preparo.' };
  }
  function tokens(value) { return fold(value).match(/[\p{L}\p{N}]+/gu) || []; }
  function searchRecipes(recipes, query) {
    const sought = tokens(query); if (!sought.length) return Array.isArray(recipes) ? recipes.slice() : [];
    return (Array.isArray(recipes) ? recipes : []).map((recipe, order) => {
      const haystack = [recipe && recipe.title, recipe && recipe.category]
        .concat(recipe && recipe.tags, recipe && recipe.aliases)
        .concat(Array.isArray(recipe && recipe.ingredients) ? recipe.ingredients.map(i => typeof i === 'string' ? i : i && i.name) : []).join(' ');
      const words = tokens(haystack); const score = sought.reduce((sum, token) => sum + (words.some(word => word === token || word.startsWith(token) || token.startsWith(word)) ? 1 : 0), 0);
      return { recipe, order, score };
    }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).map(row => row.recipe);
  }
  function parseVoiceCommand(text) {
    const command = fold(text).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    const match = (pattern, intent, confidence) => pattern.test(command) ? { intent, confidence } : null;
    return match(/\b(proximo|proxima) passo\b/, 'next-step', 1)
      || match(/\bpasso anterior\b|\bvoltar\b/, 'previous-step', 1)
      || match(/\brepetir\b|\brepita\b|\brepete\b/, 'repeat-step', 0.9)
      || match(/\bler(?: os)? ingredientes?\b/, 'read-ingredients', 1)
      || match(/\bmostrar ingredientes?\b/, 'show-ingredients', 0.9)
      || match(/\bmodo escuro\b/, 'toggle-dark-mode', 1)
      || { intent: 'none', confidence: 0 };
  }
  return { parseIngredients, scaleIngredients, convertIngredient, buildShoppingList, suggestSubstitution, adaptCookingMethod, searchRecipes, parseVoiceCommand };
}));
