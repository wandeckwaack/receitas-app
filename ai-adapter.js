/* Adaptador opcional: local por padrão; proxy sem segredos no navegador. */
(function (root, factory) {
  const assistant = typeof module === 'object' && module.exports ? require('./assistant.js') : root.MemoriasAssistant;
  const api = factory(assistant);
  if (typeof module === 'object' && module.exports) module.exports = { MemoriasAI: api };
  else root.MemoriasAI = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Assistant) {
  'use strict';

  const localNotice = 'Modo local, sem IA generativa.';
  const text = value => String(value == null ? '' : value).trim();
  const folded = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function isAllowedEndpoint(value) {
    try {
      const url = new URL(text(value));
      return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
    } catch (_) { return false; }
  }
  function minimumContext(context) {
    const source = context && typeof context === 'object' ? context : {};
    const result = {};
    if (text(source.title)) result.title = text(source.title).slice(0, 160);
    if (Number.isFinite(Number(source.servings)) && Number(source.servings) > 0) result.servings = Number(source.servings);
    return result;
  }
  function ingredientText(item) { return [item && item.qty, item && item.unit, item && item.name].filter(Boolean).join(' '); }

  class LocalFallback {
    async ask(question, context) {
      const asked = folded(question), recipe = context && typeof context === 'object' ? context : {};
      let answer;
      const portions = asked.match(/(?:para|porcoes?|porções)\s*(\d+)/) || asked.match(/(\d+)\s*porc/);
      if (/porc/.test(asked) && portions && Assistant) {
        const original = Number(recipe.servings) || 1, target = Number(portions[1]);
        const items = Assistant.scaleIngredients(recipe.ingredients, target / original).map(ingredientText).filter(Boolean);
        answer = items.length ? `Para ${target} porções: ${items.join('; ')}.` : `Posso recalcular quando a receita tiver ingredientes e porções.`;
      } else if (/substit|trocar|substituir/.test(asked) && Assistant) {
        const ingredient = (Array.isArray(recipe.ingredients) && recipe.ingredients[0] && recipe.ingredients[0].name) || '';
        const result = Assistant.suggestSubstitution(ingredient);
        answer = result.found ? `Sugestão para ${result.ingredient}: ${result.suggestions.join('; ')}. ${result.warning}` : 'Posso sugerir substituições simples quando o ingrediente estiver identificado na receita.';
      } else if (/air ?fryer|forno|assar|assamento/.test(asked) && Assistant) {
        const method = /air ?fryer/.test(asked) ? 'air fryer' : 'forno';
        const result = Assistant.adaptCookingMethod(recipe.steps, method);
        answer = result.supported ? `Adaptação local para ${result.method}: ${result.estimate} ${result.warning}` : 'Posso adaptar apenas para forno ou air fryer no modo local.';
      } else if (/compras|comprar|lista/.test(asked) && Assistant) {
        const list = Assistant.buildShoppingList([recipe], 1);
        const items = Object.values(list).flat().map(ingredientText).filter(Boolean);
        answer = items.length ? `Lista de compras: ${items.join('; ')}.` : 'Ainda não há ingredientes para montar a lista de compras.';
      } else {
        answer = 'Posso ajudar localmente com porções, substituições, forno/air fryer e lista de compras. Não interpreto perguntas abertas como uma IA generativa.';
      }
      return { mode: 'local', answer: `${localNotice} ${answer}` };
    }
  }

  class ProxyAdapter {
    constructor(options) {
      const config = options || {};
      if (!isAllowedEndpoint(config.endpoint)) throw new Error('O endpoint do proxy deve usar HTTPS (ou HTTP apenas em localhost para desenvolvimento).');
      this.endpoint = text(config.endpoint);
      this.fetch = config.fetch || (typeof fetch === 'function' ? fetch.bind(root) : null);
      this.timeout = Math.max(1, Number(config.timeout) || 10000);
      if (!this.fetch) throw new Error('Fetch indisponível para o proxy.');
    }
    async ask(question, context) {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          if (controller) controller.abort();
          reject(new Error('O proxy excedeu o tempo limite de resposta.'));
        }, this.timeout);
      });
      try {
        const request = this.fetch(this.endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text(question).slice(0, 1000), context: minimumContext(context) }),
          signal: controller && controller.signal
        });
        const response = await Promise.race([request, timeout]);
        if (!response || !response.ok) throw new Error(`Proxy respondeu com HTTP ${response && response.status || 'erro'}.`);
        const data = await response.json();
        if (!data || !text(data.answer)) throw new Error('Proxy respondeu sem uma resposta válida.');
        return { mode: 'proxy', answer: text(data.answer) };
      } finally { clearTimeout(timer); }
    }
  }
  async function ask(question, context, options) {
    const config = options || {};
    if (config.endpoint) {
      try { return await new ProxyAdapter(config).ask(question, context); }
      catch (_) {
        const result = await new LocalFallback().ask(question, context);
        return { ...result, notice: 'O proxy não respondeu; a resposta abaixo está no modo local.' };
      }
    }
    return new LocalFallback().ask(question, context);
  }
  return { LocalFallback, ProxyAdapter, ask, isAllowedEndpoint, minimumContext };
}));
