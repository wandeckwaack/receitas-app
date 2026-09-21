const json = (data, status = 200, origin = '*') => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  }
});

const cleanSuggestions = value => Array.isArray(value) ? value.slice(0, 5).map(item => ({
  title: String(item?.title || '').slice(0, 160),
  category: String(item?.category || 'Receitas').slice(0, 80),
  time: Number(item?.time) || null,
  servings: Number(item?.servings) || null,
  difficulty: String(item?.difficulty || 'Fácil').slice(0, 40),
  ingredients: Array.isArray(item?.ingredients) ? item.ingredients.slice(0, 50).map(ingredient => ({
    qty: String(ingredient?.qty || '').slice(0, 24),
    unit: String(ingredient?.unit || '').slice(0, 40),
    name: String(ingredient?.name || '').slice(0, 160)
  })).filter(item => item.name) : [],
  steps: Array.isArray(item?.steps) ? item.steps.slice(0, 30).map(step => String(step).slice(0, 500)).filter(Boolean) : [],
  tips: String(item?.tips || '').slice(0, 1500)
})).filter(item => item.title && item.ingredients.length && item.steps.length) : [];

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }});
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/suggestions') return json({ error: 'Não encontrado.' }, 404, origin);
    const requestOrigin = request.headers.get('origin');
    if (env.ALLOWED_ORIGIN && requestOrigin !== env.ALLOWED_ORIGIN) return json({ error: 'Origem não permitida.' }, 403, origin);
    if (!env.GEMINI_API_KEY) return json({ error: 'Serviço de receitas não configurado.' }, 503, origin);
    try {
      const body = await request.json();
      const query = String(body?.query || '').trim().slice(0, 200);
      const maxResults = Math.max(1, Math.min(5, Number(body?.maxResults) || 3));
      if (query.length < 3) return json({ error: 'Busca muito curta.' }, 400, origin);
      const model = env.GEMINI_MODEL || 'gemini-3.6-flash';
      const prompt = `Você é uma cozinheira especialista em receitas brasileiras e do mundo. Crie até ${maxResults} receitas completas e específicas para o pedido: ${query}. Responda APENAS JSON válido no formato {"suggestions":[{"title":"","category":"","time":30,"servings":4,"difficulty":"Fácil","ingredients":[{"qty":"","unit":"","name":""}],"steps":[""],"tips":""}]}. Respeite exatamente o prato e os ingredientes pedidos; não troque por uma receita genérica. Escreva em português do Brasil. Inclua pelo menos 4 ingredientes e de 4 a 8 passos claros, cada passo em uma ou duas frases curtas. Dicas: no máximo uma frase.`;
      const call = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } } })
      });
      let response = await call();
      if (response.status === 503 || response.status === 429) { await new Promise(done => setTimeout(done, 1500)); response = await call(); }
      if (!response.ok) return json({ error: 'A busca online não respondeu.' }, 502, origin);
      const data = await response.json();
      const text = (data?.candidates?.[0]?.content?.parts || []).find(part => part.text && !part.thought)?.text || '{}';
      const parsed = JSON.parse(text);
      const suggestions = cleanSuggestions(parsed.suggestions);
      if (!suggestions.length) return json({ error: 'A busca online não encontrou uma receita completa.' }, 502, origin);
      return json({ suggestions }, 200, origin);
    } catch (_) {
      return json({ error: 'Não consegui concluir a busca online.' }, 502, origin);
    }
  }
};
