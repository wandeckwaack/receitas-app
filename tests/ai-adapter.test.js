const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { MemoriasAI } = require('../ai-adapter.js');

const recipe = {
  title: 'Bolo simples', servings: 4,
  ingredients: [{ qty: 2, unit: 'xícara', name: 'farinha de trigo' }],
  steps: ['Asse no forno a 200°C por 30 minutos.'],
  photoId: 'foto-privada'
};

async function run() {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'ai-adapter.js'), 'utf8'), sandbox, { filename: 'ai-adapter.js' });
  assert.equal(typeof sandbox.MemoriasAI.ask, 'function');
  assert.equal(typeof sandbox.MemoriasAI.LocalFallback, 'function');
  assert.equal(typeof sandbox.MemoriasAI.ProxyAdapter, 'function');
  assert.equal(typeof sandbox.MemoriasAI.isAllowedEndpoint, 'function');
  assert.equal(typeof sandbox.MemoriasAI.minimumContext, 'function');

  const local = new MemoriasAI.LocalFallback();
  const portions = await local.ask('Ajuste para 8 porções', recipe);
  assert.equal(portions.mode, 'local');
  assert.match(portions.answer, /modo local, sem IA generativa/i);
  assert.match(portions.answer, /4 xícara/i);
  assert.match((await local.ask('O que você não consegue fazer?', recipe)).answer, /sem IA generativa/i);
  assert.match((await local.ask('Posso trocar farinha?', recipe)).answer, /Sugestão/i);
  assert.match((await local.ask('Dá para fazer na air fryer?', recipe)).answer, /air fryer/i);
  assert.match((await local.ask('Monte a lista de compras', recipe)).answer, /lista de compras/i);

  assert.equal(MemoriasAI.isAllowedEndpoint('https://ia.exemplo.test/perguntar'), true);
  assert.equal(MemoriasAI.isAllowedEndpoint('http://localhost:8787/ask'), true);
  assert.equal(MemoriasAI.isAllowedEndpoint('http://127.0.0.1:8787/ask'), true);
  assert.equal(MemoriasAI.isAllowedEndpoint('http://ia.exemplo.test/ask'), false);
  assert.equal(MemoriasAI.isAllowedEndpoint('javascript:alert(1)'), false);

  let sent, signal;
  const proxy = new MemoriasAI.ProxyAdapter({ endpoint: 'https://ia.exemplo.test/perguntar', fetch: async (_url, init) => {
    sent = JSON.parse(init.body);
    signal = init.signal;
    return { ok: true, json: async () => ({ answer: 'Resposta do proxy.' }) };
  }});
  const response = await proxy.ask('Como assar?', { title: 'Bolo simples', servings: 4, photoId: 'não pode ir' });
  assert.equal(response.mode, 'proxy');
  assert.equal(response.answer, 'Resposta do proxy.');
  assert.deepEqual(sent, { question: 'Como assar?', context: { title: 'Bolo simples', servings: 4 } });
  assert.ok(signal, 'o proxy deve receber sinal de AbortController para timeout/cancelamento');
  assert.equal(Object.hasOwn(sent.context, 'photoId'), false);

  const noAbortSandbox = { URL, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'ai-adapter.js'), 'utf8'), noAbortSandbox, { filename: 'ai-adapter.js' });
  const noAbortProxy = new noAbortSandbox.MemoriasAI.ProxyAdapter({
    endpoint: 'https://ia.exemplo.test/perguntar', timeout: 10,
    fetch: () => new Promise(() => {})
  });
  await assert.rejects(() => noAbortProxy.ask('Vai expirar?', {}), /tempo limite/i,
    'sem AbortController, o proxy ainda deve encerrar a espera por timeout');

  assert.throws(() => new MemoriasAI.ProxyAdapter({ endpoint: 'http://inseguro.test' }), /https/i);
  const failing = new MemoriasAI.ProxyAdapter({ endpoint: 'https://ia.exemplo.test', fetch: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(() => failing.ask('Oi', {}), /503/);

  const fallback = await MemoriasAI.ask('Ajuste para 8 porções', recipe, { endpoint: 'https://ia.exemplo.test', fetch: async () => { throw new Error('sem rede'); } });
  assert.equal(fallback.mode, 'local');
  assert.match(fallback.notice, /proxy/i);
  assert.doesNotMatch(require('node:fs').readFileSync(require.resolve('../ai-adapter.js'), 'utf8'), /api[_-]?key|authorization:\s*bearer/i);
  console.log('ai-adapter.test.js: ok');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
