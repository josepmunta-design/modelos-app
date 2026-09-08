/* Antesala de la biblioteca.
   Lee las escuelas y sus modelos del proxy publico (/api/data), empareja cada
   modelo con el retrato de su autor y rota esos retratos dentro de la tarjeta.
   Todas las rutas usadas aqui son publicas: no hay sesion ni token de por medio. */

const DATA = '/api/data?path=';
const url = path => DATA + encodeURIComponent(path);

/* Orden editorial de las escuelas troncales: el mismo que usa la biblioteca en
   buildSchoolOptions(). Las colecciones y los cajones tematicos quedan fuera. */
const SCHOOLS = [
  { id: 'psicoanalisis',   desc: 'El inconsciente, el conflicto y la relación que lo revive.' },
  { id: 'conductismo',     desc: 'La conducta como aprendizaje: lo que se adquiere puede reaprenderse.' },
  { id: 'humanista',       desc: 'La persona entera, su experiencia y su tendencia a crecer.' },
  { id: 'cognitivo',       desc: 'El significado que damos a las cosas y cómo llega a sostener el malestar.' },
  { id: 'sistemico',       desc: 'El síntoma dentro de la trama de relaciones que lo mantiene.' },
  { id: 'constructivista', desc: 'La realidad como construcción: narrar de otro modo es vivir de otro modo.' },
  { id: 'integrativo',     desc: 'Lo que funciona, venga de donde venga, con criterio para combinarlo.' },
];

const ROTATE_MS = 6200;
const MAX_PHOTOS = 7;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const grid = document.getElementById('schoolsGrid');
const state = document.getElementById('schoolsState');
const totals = document.getElementById('schoolsTotals');

async function readJson(path) {
  const response = await fetch(url(path), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

/* "Aaron T. Beck, Albert Ellis" o "Anthony Back & Robert Bosnak" -> primer autor. */
function firstAuthor(authors) {
  const raw = String(authors || '').trim();
  if (!raw) return '';
  const first = raw.split(/[,&;]| y (?=[A-ZÁÉÍÓÚÑ])/)[0].trim();
  return first.replace(/\s*\(.*?\)\s*$/, '').trim();
}

/* Retratos de una escuela: los modelos mas destacados que tienen foto.
   Un mismo autor firma varios modelos (Beck, Maslow), asi que se queda solo con
   su ficha mas destacada: la rotacion nunca debe repetir cara. */
function portraits(models, photoByModel) {
  const seen = new Set();
  return models
    .filter(model => model && model.id && photoByModel.has(String(model.id).trim()))
    .sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0)
      || (Number(a.year) || 9999) - (Number(b.year) || 9999))
    .map(model => ({
      src: url(`Core/fotos/${photoByModel.get(String(model.id).trim())}`),
      author: firstAuthor(model.autores),
      model: String(model.label || '').trim(),
    }))
    .filter(entry => {
      const key = entry.author.toLowerCase();
      if (!entry.author || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_PHOTOS);
}

function listUrl(label) {
  const params = new URLSearchParams({ view: 'list', group: 'school', target: label });
  return `/modelos/?${params}`;
}

function card(school, index) {
  const node = document.createElement('a');
  node.className = 'school';
  node.href = listUrl(school.label);
  node.setAttribute('aria-label', `${school.label} · ver sus ${school.count} modelos en la biblioteca`);
  node.innerHTML = `
    <div class="school-stage" aria-hidden="true"></div>
    <div class="school-shade" aria-hidden="true"></div>
    <div class="school-light" aria-hidden="true"></div>
    <div class="school-top">
      <span class="school-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="school-count">${school.count} modelos</span>
    </div>
    <p class="school-caption" aria-hidden="true"></p>
    <div class="school-content">
      <h3 class="school-name"></h3>
      <p class="school-desc"></p>
      <span class="school-action">Ver la escuela <span class="arrow-circle" aria-hidden="true">↗</span></span>
    </div>
    <span class="school-edge" aria-hidden="true"></span>`;
  node.querySelector('.school-name').textContent = school.label;
  node.querySelector('.school-desc').textContent = school.desc;
  return node;
}

/* Dos capas de imagen que se relevan por opacidad. La siguiente foto se precarga
   antes del relevo, de modo que el cruce nunca muestra un hueco. */
function animate(node, photos) {
  const stage = node.querySelector('.school-stage');
  const caption = node.querySelector('.school-caption');
  const layers = [document.createElement('img'), document.createElement('img')];
  for (const layer of layers) {
    layer.className = 'school-photo';
    layer.alt = '';
    layer.decoding = 'async';
    layer.loading = 'lazy';
    stage.append(layer);
  }

  let cursor = 0;
  let front = 0;
  let timer = null;

  const paint = entry => {
    caption.innerHTML = '<b></b>';
    caption.querySelector('b').textContent = entry.model;
    caption.append(entry.author);
    caption.classList.add('is-on');
  };

  const show = async (entry, immediate) => {
    const back = layers[1 - front];
    try {
      const preload = new Image();
      preload.src = entry.src;
      if (preload.decode) await preload.decode();
    } catch { /* Una foto que no carga no debe detener la rotacion. */ }
    back.src = entry.src;
    if (!immediate) caption.classList.remove('is-on');
    window.setTimeout(() => {
      back.classList.add('is-on');
      layers[front].classList.remove('is-on');
      front = 1 - front;
      paint(entry);
    }, immediate ? 0 : 420);
  };

  show(photos[cursor], true);
  if (photos.length < 2 || reduceMotion) return;

  const tick = () => {
    cursor = (cursor + 1) % photos.length;
    show(photos[cursor], false);
  };
  const start = () => { if (!timer) timer = window.setInterval(tick, ROTATE_MS); };
  const stop = () => { window.clearInterval(timer); timer = null; };

  // Solo rota lo que esta a la vista, y nunca con la pestana en segundo plano.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting && !document.hidden ? start() : stop();
  }, { rootMargin: '120px' });
  observer.observe(node);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (node.getBoundingClientRect().top < innerHeight) start();
  });

  // El relevo se desincroniza por tarjeta: la rejilla no debe parpadear a la vez.
  window.setTimeout(tick, 900 + Math.random() * ROTATE_MS);
}

async function render() {
  const [index, photoIndex] = await Promise.all([
    readJson('Core/escuelas/index.json'),
    readJson('Core/fotos/foto.json'),
  ]);

  const labelById = new Map((Array.isArray(index) ? index : [])
    .filter(entry => entry && entry.id && entry.tipo !== 'coleccion')
    .map(entry => [String(entry.id).trim(), String(entry.label || entry.id).trim()]));

  const photoByModel = new Map(Object.entries(photoIndex?.models || {})
    .filter(([, file]) => typeof file === 'string' && file.trim())
    .map(([id, file]) => [id.trim(), file.trim()]));

  const schools = (await Promise.all(SCHOOLS
    .filter(school => labelById.has(school.id))
    .map(async school => {
      const data = await readJson(`Core/escuelas/${school.id}.json`);
      const models = Array.isArray(data?.modelos) ? data.modelos : [];
      return {
        ...school,
        label: labelById.get(school.id),
        count: models.length,
        photos: portraits(models, photoByModel),
      };
    }))).filter(school => school.count > 0);

  if (!schools.length) throw new Error('El indice de escuelas ha llegado vacio');

  grid.replaceChildren(...schools.map((school, position) => {
    const node = card(school, position);
    if (school.photos.length) animate(node, school.photos);
    return node;
  }));

  state.hidden = true;
  grid.hidden = false;
  const models = schools.reduce((sum, school) => sum + school.count, 0);
  totals.textContent = `${schools.length} escuelas · ${models} modelos`;
}

render().catch(error => {
  console.error('[escuelas]', error);
  grid.hidden = true;
  state.hidden = false;
  state.innerHTML = 'No hemos podido cargar las escuelas. '
    + '<a href="/modelos/?view=list">Entra directamente a la biblioteca</a>.';
});
