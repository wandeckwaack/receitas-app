(function(root, factory){
  const api = factory(root);
  if(typeof module !== 'undefined') module.exports = api;
  root.MemoriasOCR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root){
  const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const clean = value => String(value == null ? '' : value).replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const label = confidence => confidence >= .75 ? 'Alta' : confidence >= .45 ? 'Média' : 'Baixa';
  function normalizeDraft(draft){
    const confidence = Math.max(0, Math.min(1, Number(draft && draft.confidence) || 0));
    return { text: clean(draft && draft.text), confidence, confidenceLabel: label(confidence) };
  }
  function parseRecipeText(source){
    const lines = clean(source).split('\n').filter(Boolean);
    const title = lines.shift() || '';
    const ingredients = [], steps = [], notes = [];
    const amount = /^(\d+(?:[.,]\d+)?|½|¼|¾|uma?|meia)\s*(x[ií]cara(?:s)?|colher(?:es)?(?:\s+de\s+(?:sopa|chá))?|g|kg|ml|l|litro(?:s)?|pitada(?:s)?|unidade(?:s)?|ovo(?:s)?|fatias?|latas?)\b\s*(?:de\s+)?(.+)$/i;
    const step = /^(?:\d+[.)]|[-–•])\s*(.+)$/;
    for(const line of lines){
      const ingredient = line.match(amount), instruction = line.match(step);
      if(ingredient) ingredients.push({ qty: ingredient[1], unit: ingredient[2], name: ingredient[3].trim() });
      else if(instruction) steps.push(instruction[1].trim());
      else notes.push(line);
    }
    return { title, ingredients, steps, originStory: notes.join('\n'), tips: '' };
  }
  function loadTesseract(){
    if(root.Tesseract) return Promise.resolve(root.Tesseract);
    if(!root.document) return Promise.reject(new Error('OCR requer navegador'));
    return new Promise((resolve, reject) => {
      const prior = root.document.querySelector('script[data-memorias-ocr]');
      if(prior){ prior.addEventListener('load', () => resolve(root.Tesseract)); prior.addEventListener('error', reject); return; }
      const script = root.document.createElement('script');
      script.src = CDN; script.async = true; script.dataset.memoriasOcr = 'true';
      script.onload = () => root.Tesseract ? resolve(root.Tesseract) : reject(new Error('OCR indisponível'));
      script.onerror = () => reject(new Error('Falha ao carregar OCR'));
      root.document.head.appendChild(script);
    });
  }
  function runOCR(files, options){
    options = options || {};
    let worker, cancelled = false;
    const terminateWorker=()=>{const current=worker;worker=null;return current&&current.terminate()};
    const cancel = () => { cancelled = true; void terminateWorker(); };
    const promise = (async() => {
      try {
        const Tesseract = await loadTesseract();
        if(cancelled) throw new Error('OCR cancelado');
        worker = await Tesseract.createWorker('por', 1, { logger: message => options.onProgress && options.onProgress(message) });
        const pages = [];
        for(let index = 0; index < files.length; index++) {
          if(cancelled) throw new Error('OCR cancelado');
          const result = await worker.recognize(files[index]);
          if(cancelled) throw new Error('OCR cancelado');
          pages.push(normalizeDraft({ text: result.data.text, confidence: result.data.confidence / 100 }));
        }
        return pages;
      } finally { if(worker) await terminateWorker(); }
    })().catch(error => { if(cancelled) error.cancelled = true; throw error; });
    return { promise, cancel };
  }
  return { CDN, normalizeDraft, parseRecipeText, runOCR };
});
