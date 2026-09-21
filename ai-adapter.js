/* Adaptador opcional: local por padrão; proxy sem segredos no navegador. */
(function (root, factory) {
  const assistant = typeof module === 'object' && module.exports ? require('./assistant.js') : root.MemoriasAssistant;
  const api = factory(assistant);
  if (typeof module === 'object' && module.exports) module.exports = { MemoriasAI: api };
  else root.MemoriasAI = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Assistant) {
  'use strict';

  const localNotice = 'Modo local, sem IA generativa.';
  const localSuggestionNotice = 'Modelos locais salvos neste aparelho — não são IA generativa. A busca online amplia as opções.';
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
  function positive(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
  function limited(value, size) { return text(value).slice(0, size); }
  function normalizeSuggestion(source) {
    const raw = source && typeof source === 'object' ? source : {};
    const title = limited(raw.title, 160);
    if (!title) return null;
    const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : []).slice(0, 50).map(item => {
      const ingredient = item && typeof item === 'object' ? item : {};
      const name = limited(ingredient.name, 160);
      return name ? { qty: limited(ingredient.qty, 24), unit: limited(ingredient.unit, 40), name } : null;
    }).filter(Boolean);
    const steps = (Array.isArray(raw.steps) ? raw.steps : []).slice(0, 30).map(step => limited(step, 500)).filter(Boolean);
    return {
      title, category: limited(raw.category, 80) || 'Outras', time: positive(raw.time), servings: positive(raw.servings),
      difficulty: limited(raw.difficulty, 40) || 'Fácil', ingredients, steps,
      tags: (Array.isArray(raw.tags) ? raw.tags : []).map(item => limited(item, 80)).filter(Boolean).slice(0, 20),
      aliases: (Array.isArray(raw.aliases) ? raw.aliases : []).map(item => limited(item, 100)).filter(Boolean).slice(0, 20),
      tips: limited(raw.tips, 1500), originStory: limited(raw.originStory, 2000)
    };
  }
  function normalizeQuery(query) {
    const result = limited(query, 200);
    if (result.length < 3) throw new Error('Digite ao menos 3 caracteres para buscar sugestões.');
    return result;
  }
  function maxResults(value) { return Math.max(1, Math.min(5, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 3)); }
  const legacyLocalModels = [
    { keys: ['arroz mineiro'], title: 'Arroz mineiro tradicional', category: 'Pratos principais', time: 45, servings: 6, difficulty: 'Fácil', ingredients: [{ qty: '2', unit: 'xícaras', name: 'arroz' }, { qty: '150', unit: 'g', name: 'linguiça calabresa' }, { qty: '1', unit: 'xícara', name: 'couve fatiada' }, { qty: '2', unit: 'unidades', name: 'ovos' }], steps: ['Refogue a linguiça e reserve.', 'Cozinhe o arroz e misture a linguiça.', 'Junte a couve rapidamente e finalize com ovos mexidos.'], tips: 'Use arroz do dia anterior para uma versão mais soltinha.', originStory: 'Modelo inspirado em combinações caseiras de Minas Gerais.' },
    { keys: ['arroz mineiro'], title: 'Arroz mineiro com frango', category: 'Pratos principais', time: 55, servings: 6, difficulty: 'Média', ingredients: [{ qty: '2', unit: 'xícaras', name: 'arroz' }, { qty: '300', unit: 'g', name: 'frango cozido desfiado' }, { qty: '1', unit: 'xícara', name: 'couve fatiada' }, { qty: '1', unit: 'unidade', name: 'cenoura ralada' }], steps: ['Refogue o frango com temperos.', 'Misture o arroz cozido e a cenoura.', 'Acrescente a couve no fim para manter a cor.'], tips: 'Aproveite frango assado ou cozido que sobrou.', originStory: 'Modelo local para reaproveitar frango de forma afetiva.' },
    { keys: ['arroz mineiro'], title: 'Arroz mineiro vegetariano', category: 'Pratos principais', time: 40, servings: 5, difficulty: 'Fácil', ingredients: [{ qty: '2', unit: 'xícaras', name: 'arroz' }, { qty: '1', unit: 'xícara', name: 'feijão-fradinho cozido' }, { qty: '1', unit: 'xícara', name: 'couve fatiada' }, { qty: '1', unit: 'unidade', name: 'abobrinha em cubos' }], steps: ['Doure a abobrinha com alho.', 'Misture o arroz e o feijão-fradinho.', 'Finalize com a couve e ajuste o sal.'], tips: 'Um fio de azeite e limão dá frescor ao prato.', originStory: 'Modelo local sem carne, pensado para a refeição do dia a dia.' },
    { keys: ['bolo'], title: 'Bolo simples de casa', category: 'Bolos e doces', time: 50, servings: 10, difficulty: 'Fácil', ingredients: [{ qty: '2', unit: 'xícaras', name: 'farinha de trigo' }, { qty: '1', unit: 'xícara', name: 'açúcar' }, { qty: '3', unit: 'unidades', name: 'ovos' }], steps: ['Misture os ingredientes líquidos.', 'Incorpore os secos sem bater demais.', 'Asse até o palito sair limpo.'], tips: 'Preaqueça o forno antes de começar.', originStory: 'Modelo básico de bolo para adaptar com frutas ou especiarias.' },
    { keys: ['feijao', 'feijão'], title: 'Feijão caseiro', category: 'Pratos principais', time: 50, servings: 6, difficulty: 'Fácil', ingredients: [{ qty: '2', unit: 'xícaras', name: 'feijão cozido' }, { qty: '2', unit: 'dentes', name: 'alho' }, { qty: '1', unit: 'folha', name: 'louro' }], steps: ['Refogue o alho.', 'Junte o feijão e o louro.', 'Cozinhe até engrossar levemente.'], tips: 'Congele porções pequenas para a semana.', originStory: 'Modelo local do feijão do cotidiano.' }
  ];
  function model(keys, title, category, time, ingredients, steps, tags, tips) {
    return { keys, aliases: keys, title, category, time, servings: 4, difficulty: 'Fácil', ingredients, steps, tags: tags || [], tips: tips || 'Ajuste os temperos ao seu gosto.', originStory: 'Receita local para inspirar a cozinha do dia a dia.' };
  }
  const baseIngredients = [{ qty: '1', unit: 'colher de sopa', name: 'azeite' }, { qty: '1', unit: 'dente', name: 'alho' }, { qty: 'a gosto', unit: '', name: 'sal e pimenta' }];
  const quickSteps = ['Prepare e corte os ingredientes.', 'Cozinhe em fogo médio até ficar macio.', 'Ajuste os temperos e sirva.'];
  const localModels = legacyLocalModels.concat([
    model(['almoco rapido', 'almoco'], 'Almoço rápido de frigideira', 'Almoço rápido', 25, baseIngredients.concat([{ qty: '2', unit: 'unidades', name: 'ovos' }, { qty: '1', unit: 'xícara', name: 'arroz cozido' }]), quickSteps, ['rapido', 'economica']),
    model(['jantar economico', 'jantar barato'], 'Jantar econômico de legumes', 'Jantar econômico', 30, baseIngredients.concat([{ qty: '2', unit: 'unidades', name: 'batatas' }, { qty: '1', unit: 'unidade', name: 'cenoura' }]), quickSteps, ['economica', 'vegetariana']),
    model(['vegetariana', 'vegetariano'], 'Vegetariana: arroz cremoso de legumes', 'Vegetariana', 25, baseIngredients.concat([{ qty: '1', unit: 'xícara', name: 'arroz cozido' }, { qty: '1', unit: 'xícara', name: 'legumes em cubos' }]), quickSteps, ['vegetariana', 'rapido']),
    model(['arroz vegano', 'arroz de legumes vegano'], 'Arroz vegano de legumes', 'Pratos principais', 25, [{ qty: '1', unit: 'xícara', name: 'arroz cozido' }, { qty: '1', unit: 'xícara', name: 'legumes em cubos' }, { qty: '1', unit: 'colher de sopa', name: 'azeite' }], quickSteps, ['vegano', 'vegetariana', 'rapido']),
    model(['sobremesa'], 'Sobremesa de banana com canela', 'Sobremesas', 20, [{ qty: '3', unit: 'unidades', name: 'bananas' }, { qty: '1', unit: 'colher de chá', name: 'canela' }, { qty: '1', unit: 'colher de sopa', name: 'açúcar' }], quickSteps, ['sem-lactose', 'rapido'], 'Sem lactose; use açúcar a gosto.'),
    model(['sopa'], 'Sopa de legumes caseira', 'Sopas', 45, baseIngredients.concat([{ qty: '2', unit: 'unidades', name: 'batatas' }, { qty: '1', unit: 'unidade', name: 'cenoura' }, { qty: '1', unit: 'litro', name: 'caldo de legumes' }]), quickSteps, ['vegetariana', 'economica']),
    model(['frango'], 'Frango dourado com legumes', 'Aves', 35, baseIngredients.concat([{ qty: '500', unit: 'g', name: 'peito de frango' }, { qty: '1', unit: 'unidade', name: 'abobrinha' }]), quickSteps, ['alta-proteina']),
    model(['peixe'], 'Peixe assado com limão', 'Peixes e frutos do mar', 30, baseIngredients.concat([{ qty: '500', unit: 'g', name: 'filé de peixe' }, { qty: '1', unit: 'unidade', name: 'limão' }]), quickSteps, ['alta-proteina', 'sem-lactose']),
    model(['carne'], 'Carne de panela simples', 'Carnes', 60, baseIngredients.concat([{ qty: '500', unit: 'g', name: 'carne em cubos' }, { qty: '1', unit: 'unidade', name: 'cebola' }]), quickSteps, ['alta-proteina', 'economica']),
    model(['moqueca'], 'Moqueca de peixe brasileira', 'Peixes e frutos do mar', 50, [{ qty: '500', unit: 'g', name: 'peixe em postas' }, { qty: '200', unit: 'ml', name: 'leite de coco' }, { qty: '1', unit: 'unidade', name: 'pimentão' }], quickSteps, ['sem-lactose']),
    model(['lasanha'], 'Lasanha de legumes', 'Massas', 60, [{ qty: '8', unit: 'folhas', name: 'massa para lasanha' }, { qty: '2', unit: 'xícaras', name: 'legumes refogados' }, { qty: '1', unit: 'xícara', name: 'molho de tomate' }], quickSteps, ['vegetariana']),
    model(['massa italiana', 'italiana'], 'Massa italiana ao pomodoro', 'Massas italianas', 30, baseIngredients.concat([{ qty: '250', unit: 'g', name: 'massa seca' }, { qty: '1', unit: 'xícara', name: 'molho de tomate' }]), quickSteps, ['vegetariana', 'economica']),
    model(['curry', 'cozinha do mundo'], 'Curry de grão-de-bico', 'Cozinha do mundo', 35, [{ qty: '1', unit: 'xícara', name: 'grão-de-bico cozido' }, { qty: '200', unit: 'ml', name: 'leite de coco' }, { qty: '1', unit: 'colher de sopa', name: 'curry em pó' }], quickSteps, ['vegetariana', 'sem-lactose']),
    model(['tacos', 'taco', 'cozinha do mundo'], 'Tacos de feijão temperado', 'Cozinha do mundo', 30, [{ qty: '6', unit: 'unidades', name: 'tortilhas' }, { qty: '1', unit: 'xícara', name: 'feijão cozido' }, { qty: '1', unit: 'unidade', name: 'tomate' }], quickSteps, ['vegetariana', 'economica']),
    model(['pao de queijo'], 'Pão de queijo de frigideira', 'Lanches', 20, [{ qty: '4', unit: 'colheres de sopa', name: 'polvilho doce' }, { qty: '1', unit: 'unidade', name: 'ovo' }, { qty: '2', unit: 'colheres de sopa', name: 'queijo ralado' }], quickSteps, ['rapido']),
    model(['brigadeiro'], 'Brigadeiro de colher', 'Sobremesas', 20, [{ qty: '1', unit: 'lata', name: 'leite condensado' }, { qty: '2', unit: 'colheres de sopa', name: 'cacau em pó' }, { qty: '1', unit: 'colher de sopa', name: 'manteiga' }], quickSteps, []),
    model(['salada'], 'Salada colorida de grão-de-bico', 'Saladas', 20, [{ qty: '1', unit: 'xícara', name: 'grão-de-bico cozido' }, { qty: '1', unit: 'unidade', name: 'tomate' }, { qty: '1', unit: 'unidade', name: 'pepino' }], quickSteps, ['vegetariana', 'sem-lactose', 'alta-proteina']),
    model(['feijao com charque', 'feijao carne seca', 'charque', 'carne seca'], 'Feijão com charque', 'Comida brasileira', 90, [{qty:'2',unit:'xícaras',name:'feijão cozido'}, {qty:'250',unit:'g',name:'charque ou carne seca dessalgada'}, {qty:'1',unit:'unidade',name:'cebola'}, {qty:'2',unit:'dentes',name:'alho'}], ['Deixe o charque de molho, trocando a água, e cozinhe até ficar macio.', 'Refogue cebola e alho, junte o charque em cubinhos e doure.', 'Misture o feijão cozido e um pouco do caldo; cozinhe até pegar sabor.'], ['brasileira','carne seca']),
    model(['baiao de dois', 'baiao'], 'Baião de dois', 'Comida brasileira', 45, [{qty:'1',unit:'xícara',name:'arroz'}, {qty:'1',unit:'xícara',name:'feijão-fradinho cozido'}, {qty:'150',unit:'g',name:'queijo coalho'}, {qty:'1',unit:'xícara',name:'carne seca dessalgada'}], ['Refogue a carne seca e reserve.', 'Cozinhe o arroz e misture o feijão-fradinho.', 'Junte a carne, o queijo coalho e finalize com cheiro-verde.'], ['nordestina']),
    model(['vatapa'], 'Vatapá simples', 'Comida baiana', 60, [{qty:'4',unit:'pães',name:'pão amanhecido'}, {qty:'200',unit:'ml',name:'leite de coco'}, {qty:'2',unit:'colheres de sopa',name:'azeite de dendê'}, {qty:'200',unit:'g',name:'camarão seco'}], ['Umedeça o pão no leite de coco.', 'Bata o pão com os temperos até formar um creme.', 'Cozinhe mexendo com dendê e camarão até engrossar.'], ['baiana']),
    model(['acaraje'], 'Acarajé de feijão-fradinho', 'Comida baiana', 90, [{qty:'2',unit:'xícaras',name:'feijão-fradinho'}, {qty:'1',unit:'unidade',name:'cebola'}, {qty:'1',unit:'litro',name:'azeite de dendê'}], ['Deixe o feijão de molho, retire as cascas e triture com cebola.', 'Bata a massa até ficar leve.', 'Frite pequenas porções no dendê quente e recheie a gosto.'], ['baiana']),
    model(['pato no tucupi', 'tucupi'], 'Pato no tucupi', 'Comida paraense', 120, [{qty:'1',unit:'kg',name:'pato em pedaços'}, {qty:'1',unit:'litro',name:'tucupi'}, {qty:'1',unit:'maço',name:'jambu'}, {qty:'2',unit:'dentes',name:'alho'}], ['Tempere e asse o pato até dourar.', 'Ferva o tucupi com alho para ficar seguro e perfumado.', 'Junte o pato e o jambu no caldo e sirva quente.'], ['paraense']),
    model(['buchada'], 'Buchada de bode', 'Comida nordestina', 150, [{qty:'1',unit:'kg',name:'bucho de bode limpo'}, {qty:'300',unit:'g',name:'miúdos de bode'}, {qty:'1',unit:'unidade',name:'cebola'}, {qty:'1',unit:'maço',name:'cheiro-verde'}], ['Higienize bem e cozinhe os miúdos com temperos.', 'Pique, tempere e recheie as bolsas de bucho.', 'Cozinhe em caldo até ficar macia.'], ['nordestina']),
    model(['galinhada'], 'Galinhada caseira', 'Comida brasileira', 55, [{qty:'500',unit:'g',name:'frango em pedaços'}, {qty:'2',unit:'xícaras',name:'arroz'}, {qty:'1',unit:'unidade',name:'tomate'}, {qty:'1',unit:'unidade',name:'cenoura'}], ['Doure o frango com os temperos.', 'Junte arroz, tomate e água quente.', 'Cozinhe tampado até o arroz ficar macio.'], ['brasileira']),
    model(['rabada'], 'Rabada com agrião', 'Comida brasileira', 150, [{qty:'1',unit:'kg',name:'rabo bovino'}, {qty:'1',unit:'unidade',name:'cebola'}, {qty:'1',unit:'maço',name:'agrião'}], ['Doure a rabada e retire o excesso de gordura.', 'Cozinhe na pressão com temperos até ficar macia.', 'Finalize com agrião pouco antes de servir.'], ['brasileira']),
    model(['escondidinho'], 'Escondidinho de carne seca', 'Pratos principais', 70, [{qty:'500',unit:'g',name:'mandioca cozida'}, {qty:'250',unit:'g',name:'carne seca dessalgada'}, {qty:'100',unit:'g',name:'queijo ralado'}], ['Faça um purê cremoso de mandioca.', 'Refogue a carne seca desfiada.', 'Monte em camadas e leve ao forno para gratinar.'], ['brasileira']),
    model(['ramen'], 'Ramen caseiro', 'Cozinha japonesa', 50, [{qty:'200',unit:'g',name:'macarrão para ramen'}, {qty:'1',unit:'litro',name:'caldo'}, {qty:'2',unit:'unidades',name:'ovos'}, {qty:'1',unit:'xícara',name:'cogumelos'}], ['Prepare um caldo bem temperado.', 'Cozinhe o macarrão separadamente.', 'Monte com caldo, ovo e acompanhamentos.'], ['japonesa']),
    model(['pad thai'], 'Pad thai de legumes', 'Cozinha tailandesa', 35, [{qty:'200',unit:'g',name:'macarrão de arroz'}, {qty:'1',unit:'xícara',name:'tofu'}, {qty:'2',unit:'colheres de sopa',name:'amendoim'}, {qty:'1',unit:'unidade',name:'limão'}], ['Hidrate o macarrão conforme a embalagem.', 'Salteie tofu e legumes.', 'Misture o macarrão, molho e amendoim.'], ['tailandesa','vegetariana']),
    model(['paella'], 'Paella de legumes', 'Cozinha espanhola', 55, [{qty:'2',unit:'xícaras',name:'arroz'}, {qty:'1',unit:'xícara',name:'ervilhas'}, {qty:'1',unit:'unidade',name:'pimentão'}, {qty:'1',unit:'pitada',name:'açafrão'}], ['Refogue os legumes na panela larga.', 'Junte arroz, açafrão e caldo.', 'Cozinhe sem mexer até secar e formar uma casquinha leve.'], ['espanhola','vegetariana']),
    model(['falafel'], 'Falafel assado', 'Cozinha árabe', 45, [{qty:'2',unit:'xícaras',name:'grão-de-bico hidratado'}, {qty:'1',unit:'unidade',name:'cebola'}, {qty:'1',unit:'maço',name:'salsinha'}], ['Triture o grão-de-bico com cebola e ervas.', 'Modele bolinhos e pincele azeite.', 'Asse até dourar, virando na metade do tempo.'], ['arabe','vegano','sem gluten']),
    model(['kimchi'], 'Kimchi simples', 'Cozinha coreana', 30, [{qty:'1',unit:'unidade',name:'acelga chinesa'}, {qty:'1',unit:'unidade',name:'nabo'}, {qty:'2',unit:'colheres de sopa',name:'pimenta coreana'}], ['Salgue a acelga e deixe murchar.', 'Misture com nabo e temperos.', 'Guarde em pote limpo e deixe fermentar na geladeira.'], ['coreana','vegano']),
    model(['abobora'], 'Abóbora refogada', 'Acompanhamentos', 30, [{qty:'500',unit:'g',name:'abóbora em cubos'}, {qty:'1',unit:'dente',name:'alho'}, {qty:'1',unit:'pitada',name:'sal'}], quickSteps, ['vegano','sem gluten']),
    model(['bacalhau'], 'Bacalhau com batatas', 'Peixes', 60, [{qty:'500',unit:'g',name:'bacalhau dessalgado'}, {qty:'3',unit:'unidades',name:'batatas'}, {qty:'1',unit:'unidade',name:'cebola'}], quickSteps, ['sem gluten']),
    model(['lentilha'], 'Lentilha temperada', 'Pratos principais', 45, [{qty:'1',unit:'xícara',name:'lentilha'}, {qty:'1',unit:'unidade',name:'cenoura'}, {qty:'1',unit:'unidade',name:'cebola'}], quickSteps, ['vegano','sem gluten','barato']),
    model(['quinoa'], 'Quinoa com legumes', 'Pratos principais', 30, [{qty:'1',unit:'xícara',name:'quinoa'}, {qty:'1',unit:'unidade',name:'abobrinha'}, {qty:'1',unit:'unidade',name:'cenoura'}], quickSteps, ['vegano','sem gluten']),
    model(['sem gluten'], 'Bolo de banana sem glúten', 'Bolos e doces', 45, [{qty:'3',unit:'unidades',name:'banana'}, {qty:'2',unit:'xícaras',name:'aveia sem glúten'}, {qty:'2',unit:'unidades',name:'ovos'}], ['Amasse as bananas e misture os ingredientes.', 'Coloque em forma untada.', 'Asse até firmar.'], ['sem gluten']),
    model(['vegano'], 'Ensopado vegano de grão-de-bico', 'Pratos principais', 35, [{qty:'2',unit:'xícaras',name:'grão-de-bico'}, {qty:'1',unit:'unidade',name:'tomate'}, {qty:'200',unit:'ml',name:'leite de coco'}], quickSteps, ['vegano','sem gluten']),
    model(['sem acucar'], 'Bolo de banana sem açúcar', 'Bolos e doces', 45, [{qty:'4',unit:'unidades',name:'bananas maduras'}, {qty:'2',unit:'xícaras',name:'aveia'}, {qty:'2',unit:'unidades',name:'ovos'}], ['Amasse as bananas e misture tudo.', 'Coloque em forma untada.', 'Asse até dourar.'], ['sem acucar']),
    model(['sem forno'], 'Tapioca recheada sem forno', 'Lanches', 15, [{qty:'1',unit:'xícara',name:'goma de tapioca'}, {qty:'100',unit:'g',name:'queijo'}, {qty:'1',unit:'unidade',name:'tomate'}], ['Aqueça uma frigideira antiaderente.', 'Espalhe a goma e espere unir.', 'Recheie, dobre e sirva.'], ['sem forno','rapido']),
    model(['para crianca', 'crianca'], 'Bolinho de cenoura para criança', 'Lanches', 30, [{qty:'1',unit:'unidade',name:'cenoura ralada'}, {qty:'1',unit:'unidade',name:'ovo'}, {qty:'4',unit:'colheres de sopa',name:'aveia'}], ['Misture os ingredientes até formar massa.', 'Modele bolinhos pequenos.', 'Asse ou cozinhe na frigideira em fogo baixo.'], ['crianca']),
    model(['cafe da manha'], 'Cuscuz de café da manhã', 'Café da manhã', 20, [{qty:'1',unit:'xícara',name:'flocão de milho'}, {qty:'1',unit:'pitada',name:'sal'}, {qty:'1',unit:'xícara',name:'água'}], ['Umedeça o flocão com água e sal.', 'Deixe descansar alguns minutos.', 'Cozinhe na cuscuzeira e sirva.'], ['barato','sem gluten']),
    model(['barato'], 'Macarrão barato de panela', 'Jantar econômico', 25, [{qty:'250',unit:'g',name:'macarrão'}, {qty:'1',unit:'xícara',name:'molho de tomate'}, {qty:'1',unit:'unidade',name:'cebola'}], quickSteps, ['barato','rapido']),
    model(['jantar rapido'], 'Jantar rápido de omelete', 'Jantar rápido', 20, [{qty:'3',unit:'unidades',name:'ovos'}, {qty:'1',unit:'unidade',name:'tomate'}, {qty:'50',unit:'g',name:'queijo'}], quickSteps, ['rapido'])
  ]);
  let surpriseRotation = 0;
  const ignoredSearchWords = new Set(['a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por', 'receita', 'uma', 'um', 'fazer', 'quero', 'tenho', 'preciso', 'hoje', 'sem', 'estilo', 'ate', 'min', 'minuto', 'minutos']);
  const meatWords = /\b(carne|frango|peixe|bacalhau|charque|linguica|calabresa|camar[aã]o|pato|bode|bovina|bovino|porco|presunto|rabo|miudos?)\b/;
  function queryWords(value) { return folded(value).split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !ignoredSearchWords.has(word)); }
  function localMatchScore(recipe, searched) {
    const keyText = folded((recipe.keys || []).join(' '));
    const haystack = keyText + ' ' + folded([recipe.title, ...(recipe.tags || []), ...(recipe.aliases || []), ...(recipe.ingredients || []).map(item => item && item.name || '')].join(' '));
    const words = queryWords(searched);
    if (!words.length || /^(?:com|de|do|da|para|por)\b/.test(folded(searched))) return 0;
    const matches = words.filter(word => new RegExp('(^|[^a-z0-9])' + word + '(?=$|[^a-z0-9])').test(haystack));
    // Consultas compostas exigem todos os termos relevantes: "frango tikka masala"
    // não pode cair na receita genérica de frango.
    if (matches.length !== words.length) return 0;
    return (keyText.includes(folded(searched)) ? 100 : 0) + matches.length * 10;
  }
  function matchesLocalModel(recipe, searched) { return localMatchScore(recipe, searched) > 0; }
  function searchPreferences(query) {
    const searched = folded(query);
    const timeMatch = searched.match(/(?:ate|em ate)\s*(\d{1,3})\s*(?:min|minuto|minutos)?\b/);
    const time = timeMatch ? Number(timeMatch[1]) : /\b(rapida|rapido|rapidas|rapidos|fast)\b/.test(searched) ? 30 : null;
    const style = /sem lactose/.test(searched) ? 'sem-lactose' : /alta proteina/.test(searched) ? 'alta-proteina' : /economica|economico/.test(searched) ? 'economica' : /vegana|vegano/.test(searched) ? 'vegano' : /vegetarian|sem carne/.test(searched) ? 'vegetariana' : null;
    return { searched, time, style, noMeat: /vegana|vegano|vegetarian|sem carne/.test(searched) };
  }

  class LocalFallback {
    async suggestRecipes(query, options) {
      const normalizedQuery = normalizeQuery(query), limit = maxResults(options && options.maxResults), preferences = searchPreferences(normalizedQuery);
      const surprise = /surpreenda/.test(preferences.searched);
      const exactModels = localModels.filter(model => (model.keys || []).some(key => folded(key) === preferences.searched));
      const searchPool = exactModels.length ? exactModels : localModels;
      const matches = searchPool.filter(model => (surprise || matchesLocalModel(model, preferences.searched)) && (!preferences.time || model.time <= preferences.time) && (!preferences.style || model.tags.includes(preferences.style)) && (!preferences.noMeat || !meatWords.test(folded((model.ingredients || []).map(item => item && item.name || '').join(' '))))).sort((a, b) => localMatchScore(b, preferences.searched) - localMatchScore(a, preferences.searched)).map(normalizeSuggestion).filter(Boolean);
      const offset = surprise && matches.length ? surpriseRotation % matches.length : 0;
      if (surprise && matches.length) surpriseRotation = (offset + 1) % matches.length;
      const suggestions = offset ? matches.slice(offset).concat(matches.slice(0, offset)) : matches;
      if (!suggestions.length) return { mode: 'offline', notice: 'Não encontrei uma receita segura para esta busca. A busca online precisa ser configurada para procurar novas receitas.', suggestions: [], empty: true, emptyReason: 'sem-correspondencia-local' };
      return { mode: 'local', notice: localSuggestionNotice, suggestions: suggestions.slice(0, limit), empty: false };
    }
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
      this.fetch = config.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
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
    async suggestRecipes(query, options) {
      const normalizedQuery = normalizeQuery(query), limit = maxResults(options && options.maxResults);
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      let timer;
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { if (controller) controller.abort(); reject(new Error('O proxy excedeu o tempo limite de resposta.')); }, this.timeout); });
      try {
        const request = this.fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: normalizedQuery, maxResults: limit }), signal: controller && controller.signal });
        const response = await Promise.race([request, timeout]);
        if (!response || !response.ok) throw new Error(`Proxy respondeu com HTTP ${response && response.status || 'erro'}.`);
        const data = await response.json();
        if (!data || !Array.isArray(data.suggestions)) throw new Error('Proxy respondeu sem sugestões válidas.');
        const suggestions = data.suggestions.map(normalizeSuggestion).filter(Boolean).slice(0, limit);
        if (!suggestions.length) throw new Error('Proxy respondeu sem sugestões aproveitáveis.');
        return { mode: 'proxy', notice: 'Sugestões recebidas da busca online.', suggestions, empty: false };
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
  async function suggestRecipes(query, options) {
    const config = options || {};
    if (config.endpoint) {
      try { return await new ProxyAdapter(config).suggestRecipes(query, config); }
      catch (_) {
        const result = await new LocalFallback().suggestRecipes(query, config);
        return { ...result, notice: result.empty ? 'A busca online não respondeu e não há receita local para esta busca. Configure a busca online para procurar novas receitas.' : 'A busca online não respondeu; mostramos receitas que já estão no aplicativo.' };
      }
    }
    return new LocalFallback().suggestRecipes(query, config);
  }
  return { LocalFallback, ProxyAdapter, ask, suggestRecipes, isAllowedEndpoint, minimumContext, normalizeSuggestion };
}));
