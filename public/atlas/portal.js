// Portal de entrada del Atlas: presenta las cuatro perspectivas del mismo
// catálogo. Se monta antes que el Atlas para que la pantalla de inicio aparezca
// de inmediato; atlas.js se engancha después con `attach()` para navegar sin
// recargar y para publicar el recuento real de la biblioteca.

const EN = document.documentElement.lang === 'en';
const t = (es, en) => (EN ? en : es);
const LIBRARY_PATH = EN ? '/en/models/' : '/modelos/';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Paleta de escuelas de la biblioteca: las cuatro escenas usan los mismos
// colores que la lista, el mapa y la genealogía.
const SCHOOLS = ['#4E79A7', '#d69640', '#E15759', '#76B7B2', '#F1CE63', '#B07AA1', '#FF9DA7', '#5F7F78', '#9575CD', '#8D6E63', '#D9AA3F'];
const GOLD = '#cfb773';
const INK = '#f4f0e5';

const rand = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
};
const mix = (a, b, k) => a + (b - a) * k;
const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ============================ 01 · Lista ============================ */
// El índice: filas de distinta longitud recorridas por una línea de lectura.

function createIndexScene() {
  let rows = [];
  return {
    resize(w, h) {
      const step = Math.max(17, Math.min(26, h / 8.5));
      const count = Math.max(4, Math.floor((h - step * 0.6) / step));
      const random = rand(20260906);
      rows = Array.from({ length: count }, (_, i) => {
        const r = random();
        return {
          y: step * (i + 0.75),
          width: 0.34 + r * 0.52,
          author: 0.16 + random() * 0.3,
          tick: 0.07 + random() * 0.04,
          school: SCHOOLS[Math.floor(random() * SCHOOLS.length)],
          section: i > 0 && random() > 0.78,
        };
      });
    },
    draw(ctx, w, h, time, energy) {
      const left = w * 0.12;
      const span = w * 0.76;
      const scan = ((time / (7.4 - energy * 3.4)) % 1) * (h + 90) - 45;

      const band = ctx.createLinearGradient(0, scan - 34, 0, scan + 34);
      band.addColorStop(0, alpha(GOLD, 0));
      band.addColorStop(0.5, alpha(GOLD, 0.05 + energy * 0.06));
      band.addColorStop(1, alpha(GOLD, 0));
      ctx.fillStyle = band;
      ctx.fillRect(0, scan - 34, w, 68);

      for (const row of rows) {
        const near = Math.max(0, 1 - Math.abs(row.y - scan) / 40);
        const glow = near * near;
        const x = left + glow * 8 * (0.5 + energy);

        if (row.section) {
          ctx.fillStyle = alpha(GOLD, 0.1 + glow * 0.2);
          ctx.fillRect(left - w * 0.075, row.y - 9.5, span + w * 0.11, 1);
        }

        ctx.fillStyle = alpha(row.school, 0.3 + glow * 0.65);
        ctx.beginPath();
        ctx.arc(x - w * 0.045, row.y - 1, 2 + glow * 1.6, 0, 7);
        ctx.fill();

        ctx.fillStyle = glow > 0.12
          ? alpha(row.school, 0.26 + glow * 0.5)
          : alpha(INK, 0.16 + glow * (0.4 + energy * 0.24));
        ctx.fillRect(x, row.y - 3.4, span * row.width, 3.4);

        ctx.fillStyle = alpha(INK, 0.07 + glow * 0.16);
        ctx.fillRect(x, row.y + 3, span * row.author, 2);

        ctx.fillStyle = alpha(GOLD, 0.16 + glow * (0.45 + energy * 0.3));
        ctx.fillRect(left + span * (1 - row.tick), row.y - 3.4, span * row.tick, 3.4);
      }

      ctx.strokeStyle = alpha(GOLD, 0.18 + energy * 0.32);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left - w * 0.08, Math.round(scan) + 0.5);
      ctx.lineTo(left + span + w * 0.04, Math.round(scan) + 0.5);
      ctx.stroke();
    },
  };
}

/* ===================== 02 · Red de afinidades ===================== */
// Grafo vivo: los nodos se atraen al centro, se repelen de cerca y trazan
// enlaces cuando la distancia baja del umbral de afinidad.

function createNetworkScene() {
  let nodes = [];
  let box = { w: 0, h: 0 };
  return {
    resize(w, h) {
      box = { w, h };
      const random = rand(910273);
      const count = w * h > 78000 ? 44 : 30;
      nodes = Array.from({ length: count }, () => ({
        x: random() * w,
        y: random() * h,
        vx: (random() - 0.5) * 14,
        vy: (random() - 0.5) * 14,
        r: 1.3 + random() * 2.4,
        color: SCHOOLS[Math.floor(random() * SCHOOLS.length)],
      }));
    },
    draw(ctx, w, h, time, energy, dt) {
      if (box.w !== w || box.h !== h) this.resize(w, h);
      const step = Math.min(dt, 0.05);
      const cx = w / 2;
      const cy = h / 2;
      const link = Math.min(w, h) * (0.36 + energy * 0.12);
      const speed = 0.55 + energy * 0.85;

      for (const node of nodes) {
        node.vx += (cx - node.x) * 0.35 * step;
        node.vy += (cy - node.y) * 0.35 * step;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          const min = link * 0.42;
          if (d2 > min * min || d2 < 0.01) continue;
          const d = Math.sqrt(d2);
          const push = ((min - d) / min) * 140 * step;
          const nx = (dx / d) * push;
          const ny = (dy / d) * push;
          a.vx -= nx; a.vy -= ny; b.vx += nx; b.vy += ny;
        }
      }
      for (const node of nodes) {
        node.vx *= 0.955; node.vy *= 0.955;
        node.x += node.vx * step * speed * 6;
        node.y += node.vy * step * speed * 6;
        const pad = 8;
        if (node.x < pad || node.x > w - pad) { node.vx *= -0.9; node.x = Math.max(pad, Math.min(w - pad, node.x)); }
        if (node.y < pad || node.y > h - pad) { node.vy *= -0.9; node.y = Math.max(pad, Math.min(h - pad, node.y)); }
      }

      ctx.lineWidth = 0.9;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d > link) continue;
          const k = 1 - d / link;
          ctx.strokeStyle = alpha(energy > 0.4 && k > 0.7 ? GOLD : INK, k * k * (0.14 + energy * 0.3));
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const node of nodes) {
        const pulse = 1 + Math.sin(time * 1.7 + node.x * 0.05) * 0.14 * (0.3 + energy);
        ctx.fillStyle = alpha(node.color, 0.42 + energy * 0.5);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * pulse, 0, 7);
        ctx.fill();
        if (node.r > 3) {
          ctx.fillStyle = alpha(node.color, 0.1 + energy * 0.12);
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r * pulse * 3.2, 0, 7);
          ctx.fill();
        }
      }
    },
  };
}

/* ========================= 03 · Mapamundi ========================= */
// Globo ortográfico: retícula, siluetas continentales (cargadas aparte, sin
// bloquear la entrada) y las ciudades donde nacieron los modelos.

const CITIES = [
  [48.21, 16.37, 0], [47.37, 8.54, 0], [52.52, 13.40, 0], [51.51, -0.13, 5],
  [48.86, 2.35, 5], [45.46, 9.19, 4], [41.90, 12.50, 4], [41.39, 2.17, 6],
  [55.68, 12.57, 3], [59.33, 18.07, 3], [55.75, 37.62, 1], [42.36, -71.06, 2],
  [40.71, -74.01, 2], [39.95, -75.17, 2], [41.88, -87.63, 1], [37.44, -122.14, 4],
  [47.61, -122.33, 3], [34.05, -118.24, 8], [43.65, -79.38, 6], [-34.60, -58.38, 7],
  [-23.55, -46.63, 7], [19.43, -99.13, 10], [35.68, 139.69, 9], [28.61, 77.21, 9],
  [-33.92, 18.42, 10], [-33.87, 151.21, 6], [32.08, 34.78, 8], [50.08, 14.44, 0],
];

let landPromise = null;
function loadLand() {
  if (landPromise) return landPromise;
  landPromise = (async () => {
    for (let i = 0; i < 40 && !window.topojson; i++) await new Promise(r => setTimeout(r, 150));
    if (!window.topojson) throw new Error('topojson unavailable');
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json');
    if (!response.ok) throw new Error('land unavailable');
    const topology = await response.json();
    const rings = [];
    const collect = (coords, depth) => {
      if (typeof coords[0] === 'number') return;
      if (typeof coords[0][0] === 'number') return rings.push(coords);
      coords.forEach(part => collect(part, depth + 1));
    };
    for (const feature of window.topojson.feature(topology, topology.objects.land).features) collect(feature.geometry.coordinates, 0);
    // Simplificado en grados: el globo se dibuja pequeño y cada trazo cuesta.
    return rings.map(ring => {
      const kept = [];
      let last = null;
      for (const point of ring) {
        if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > 1.1) { kept.push(point); last = point; }
      }
      return kept;
    }).filter(ring => ring.length > 4);
  })().catch(() => []);
  return landPromise;
}

function createGlobeScene() {
  const TILT = 0.36;
  let land = null;
  let requested = false;
  const sin0 = Math.sin(TILT);
  const cos0 = Math.cos(TILT);

  return {
    resize() {},
    draw(ctx, w, h, time, energy) {
      if (!requested) {
        requested = true;
        // Se pide en reposo: la retícula ya es legible sin los continentes.
        (window.requestIdleCallback || setTimeout)(() => loadLand().then(rings => { land = rings; }), { timeout: 4000 });
      }
      const cx = w / 2;
      const cy = h * 0.52;
      const R = Math.min(w, h * 1.18) * 0.37;
      const rot = time * (0.1 + energy * 0.12);

      const project = (lat, lon) => {
        const phi = lat * Math.PI / 180;
        const lam = lon * Math.PI / 180 + rot;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const cl = Math.cos(lam);
        return {
          x: cx + cp * Math.sin(lam) * R,
          y: cy - (cos0 * sp - sin0 * cp * cl) * R,
          z: sin0 * sp + cos0 * cp * cl,
        };
      };

      const halo = ctx.createRadialGradient(cx, cy, R * 0.62, cx, cy, R * 1.45);
      halo.addColorStop(0, alpha(GOLD, 0.05 + energy * 0.05));
      halo.addColorStop(1, alpha(GOLD, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, 'rgba(34,44,42,.95)');
      body.addColorStop(1, 'rgba(11,15,14,.95)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 7);
      ctx.fill();

      const stroke = (points, style, width) => {
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.beginPath();
        let drawing = false;
        for (const point of points) {
          if (point.z <= 0) { drawing = false; continue; }
          if (drawing) ctx.lineTo(point.x, point.y);
          else { ctx.moveTo(point.x, point.y); drawing = true; }
        }
        ctx.stroke();
      };

      const grid = alpha(INK, 0.07 + energy * 0.05);
      for (let lat = -60; lat <= 60; lat += 30) {
        const ring = [];
        for (let lon = -180; lon <= 180; lon += 6) ring.push(project(lat, lon));
        stroke(ring, lat === 0 ? alpha(GOLD, 0.12 + energy * 0.1) : grid, lat === 0 ? 0.9 : 0.7);
      }
      for (let lon = -180; lon < 180; lon += 30) {
        const meridian = [];
        for (let lat = -88; lat <= 88; lat += 5) meridian.push(project(lat, lon));
        stroke(meridian, grid, 0.7);
      }

      if (land) {
        const coast = alpha(INK, 0.2 + energy * 0.22);
        for (const ring of land) {
          ctx.beginPath();
          let drawing = false;
          for (const point of ring) {
            const p = project(point[1], point[0]);
            if (p.z <= 0.02) { drawing = false; continue; }
            if (drawing) ctx.lineTo(p.x, p.y);
            else { ctx.moveTo(p.x, p.y); drawing = true; }
          }
          ctx.fillStyle = alpha('#7f8f86', 0.055 + energy * 0.05);
          ctx.fill();
          ctx.strokeStyle = coast;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      CITIES.forEach((city, index) => {
        const p = project(city[0], city[1]);
        if (p.z <= 0.02) return;
        const depth = Math.min(1, p.z * 1.5);
        const color = SCHOOLS[city[2] % SCHOOLS.length];
        const phase = (time * (0.22 + energy * 0.16) + index * 0.137) % 1;
        if (phase < 0.42) {
          const k = phase / 0.42;
          ctx.strokeStyle = alpha(color, (1 - k) * 0.5 * depth * (0.4 + energy * 0.6));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 + k * 13, 0, 7);
          ctx.stroke();
        }
        ctx.fillStyle = alpha(color, 0.35 + depth * 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + depth * 1.3, 0, 7);
        ctx.fill();
      });

      const limb = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.02);
      limb.addColorStop(0, alpha(GOLD, 0));
      limb.addColorStop(1, alpha(GOLD, 0.22 + energy * 0.2));
      ctx.fillStyle = limb;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.02, 0, 7);
      ctx.fill();

      ctx.strokeStyle = alpha(GOLD, 0.28 + energy * 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 7);
      ctx.stroke();
    },
  };
}

/* ========================= 04 · Genealogía ========================= */
// Un linaje que crece hacia abajo sobre el eje temporal, con la cascada de
// conexiones del árbol real.

function createTreeScene() {
  let nodes = [];
  let edges = [];
  const CYCLE = 13;

  const build = (seed) => {
    const random = rand(seed);
    nodes = [{ x: 0.5, y: 0.05, depth: 0, color: SCHOOLS[0], span: 0.82 }];
    edges = [];
    for (let depth = 0; depth < 4; depth++) {
      const level = nodes.filter(node => node.depth === depth);
      for (const parent of level) {
        const children = depth === 0 ? 3 : (random() > 0.3 ? 2 : 1);
        for (let c = 0; c < children; c++) {
          if (nodes.length > 34) break;
          const spread = parent.span / Math.max(1, children);
          const x = parent.x + (c - (children - 1) / 2) * spread + (random() - 0.5) * spread * 0.3;
          const node = {
            x: Math.max(0.07, Math.min(0.93, x)),
            y: parent.y + 0.215 + random() * 0.045,
            depth: depth + 1,
            color: random() > 0.72 ? SCHOOLS[Math.floor(random() * SCHOOLS.length)] : parent.color,
            span: spread * 0.94,
          };
          nodes.push(node);
          edges.push({ from: parent, to: node, at: node.y });
        }
      }
    }
  };
  build(4471);

  return {
    resize() {},
    draw(ctx, w, h, time, energy) {
      const cycle = CYCLE - energy * 5;
      const phase = (time % cycle) / cycle;
      const grow = Math.min(1, phase / 0.72);
      const fade = phase > 0.92 ? 1 - (phase - 0.92) / 0.08 : 1;
      const px = (n) => n.x * w;
      const py = (n) => 12 + n.y * (h - 30);

      for (let i = 1; i <= 4; i++) {
        const y = Math.round(12 + (i / 4.6) * (h - 30)) + 0.5;
        ctx.strokeStyle = alpha(INK, 0.07);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.lineWidth = 1;
      for (const edge of edges) {
        const reveal = Math.max(0, Math.min(1, (grow - edge.from.y * 0.85) / 0.26));
        if (reveal <= 0) continue;
        const x0 = px(edge.from);
        const y0 = py(edge.from);
        const x1 = px(edge.to);
        const y1 = py(edge.to);
        const my = (y0 + y1) / 2;
        const steps = 16;
        ctx.strokeStyle = alpha(edge.to.color, (0.3 + energy * 0.34) * fade);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let s = 1; s <= steps * reveal; s++) {
          const k = s / steps;
          const u = 1 - k;
          ctx.lineTo(
            u * u * u * x0 + 3 * u * u * k * x0 + 3 * u * k * k * x1 + k * k * k * x1,
            u * u * u * y0 + 3 * u * u * k * my + 3 * u * k * k * my + k * k * k * y1,
          );
        }
        ctx.stroke();
      }

      for (const node of nodes) {
        const reveal = Math.max(0, Math.min(1, (grow - node.y * 0.85) / 0.2));
        if (reveal <= 0) continue;
        const x = px(node);
        const y = py(node);
        const r = (1.7 + (4 - node.depth) * 0.55) * reveal;
        ctx.fillStyle = alpha(node.color, (0.12 + energy * 0.14) * reveal * fade);
        ctx.beginPath();
        ctx.arc(x, y, r * 3.4, 0, 7);
        ctx.fill();
        ctx.fillStyle = alpha(node.color, (0.55 + energy * 0.4) * reveal * fade);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 7);
        ctx.fill();
        if (node.depth < 2) {
          ctx.fillStyle = alpha(INK, 0.1 * reveal * fade * (0.4 + energy));
          ctx.fillRect(x + r + 4, y - 1, mix(9, 20, node.x), 2);
        }
      }

      if (phase > 0.985) build(Math.floor(time * 1000) % 90000 + 7);
    },
  };
}

/* ====================== Polvo del fondo ====================== */

function createDustScene() {
  let motes = [];
  let box = { w: 0, h: 0 };
  return {
    resize(w, h) {
      box = { w, h };
      const random = rand(51199);
      const count = Math.round(Math.min(120, (w * h) / 16000));
      motes = Array.from({ length: count }, () => ({
        x: random() * w,
        y: random() * h,
        r: 0.4 + random() * 1.5,
        speed: 4 + random() * 13,
        drift: random() * 6.283,
        a: 0.06 + random() * 0.2,
        gold: random() > 0.72,
      }));
    },
    draw(ctx, w, h, time) {
      if (box.w !== w || box.h !== h) this.resize(w, h);
      for (const mote of motes) {
        const y = h - ((time * mote.speed + mote.y) % (h + 60)) + 30;
        const x = mote.x + Math.sin(time * 0.24 + mote.drift) * 26;
        ctx.fillStyle = alpha(mote.gold ? GOLD : INK, mote.a * (0.5 + 0.5 * Math.sin(time * 0.8 + mote.drift)));
        ctx.beginPath();
        ctx.arc(x, y, mote.r, 0, 7);
        ctx.fill();
      }
    },
  };
}

/* ============================ Portal ============================ */

const CARDS = [
  {
    view: 'list',
    title: t('Lista', 'List'),
    desc: t('El índice completo, ordenado por año y agrupado por escuela, colección, tag o epistemología.',
      'The complete index, ordered by year and grouped by school, collection, tag or epistemology.'),
    meta: t('El índice', 'The index'),
    scene: createIndexScene,
  },
  {
    view: 'network',
    title: t('Red de afinidades', 'Affinity network'),
    desc: t('Qué modelos se parecen y por qué: proximidad conceptual entre enfoques que nacieron separados.',
      'Which models resemble each other and why: conceptual proximity between approaches born apart.'),
    meta: t('Afinidad conceptual', 'Conceptual affinity'),
    scene: createNetworkScene,
  },
  {
    view: 'map',
    title: t('Mapamundi', 'World map'),
    desc: t('Dónde nacieron las ideas: ciudades, países y el recorrido temporal de su difusión.',
      'Where the ideas were born: cities, countries and the temporal path of their spread.'),
    meta: t('Origen geográfico', 'Geographical origin'),
    scene: createGlobeScene,
  },
  {
    view: 'genealogy',
    title: t('Genealogía', 'Genealogy'),
    desc: t('Quién influyó a quién desde 1890: linajes, rupturas y herencias entre escuelas.',
      'Who influenced whom since 1890: lineages, ruptures and inheritances between schools.'),
    meta: t('Desde 1890', 'Since 1890'),
    scene: createTreeScene,
  },
];

function shouldOpen() {
  const params = new URLSearchParams(location.search);
  if (['1', 'true', 'yes'].includes(String(params.get('embed') || '').toLowerCase())) return false;
  if (!/^\/(modelos|en\/models)\/?$/.test(location.pathname)) return false;
  return !params.has('view') && !params.get('open');
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function build() {
  const root = element('section', 'tmps-portal');
  root.id = 'atlasPortal';
  root.hidden = true;
  root.setAttribute('aria-label', t('Inicio del Atlas de la psicoterapia', 'Atlas of psychotherapy home'));
  root.tabIndex = -1;

  const dust = element('canvas', 'pt-dust');
  dust.setAttribute('aria-hidden', 'true');
  root.append(element('div', 'pt-aurora'), dust, element('div', 'pt-grain'));
  root.querySelector('.pt-aurora').setAttribute('aria-hidden', 'true');
  root.querySelector('.pt-grain').setAttribute('aria-hidden', 'true');

  const shell = element('div', 'pt-shell');

  const top = element('div', 'pt-top');
  const brand = element('a', 'pt-brand');
  brand.href = 'https://apps.tumentorpsicologia.com/';
  brand.append(element('span', 'pt-brand-mark', 'Tu Mentor'), element('span', 'pt-brand-sep'), element('span', 'pt-brand-sub', t('Psicología clínica', 'Clinical psychology')));
  const locale = element('nav', 'pt-locale');
  locale.setAttribute('aria-label', t('Idioma', 'Language'));
  for (const [code, path, label] of [['es', '/modelos/', 'ES'], ['en', '/en/models/', 'EN']]) {
    const link = element('a', null, label);
    link.href = path;
    link.lang = code;
    link.setAttribute('aria-label', code === 'es' ? t('Español', 'Spanish') : t('Inglés', 'English'));
    if ((code === 'en') === EN) link.setAttribute('aria-current', 'true');
    locale.append(link);
  }
  top.append(brand, locale);

  const main = element('div', 'pt-main');
  const hero = element('div', 'pt-hero');
  hero.append(element('p', 'pt-kicker', t('Biblioteca clínica · Edición 2026', 'Clinical library · 2026 edition')));
  const title = element('h1', 'pt-title');
  title.append(document.createTextNode(t('Atlas de la ', 'Atlas of ')), element('em', null, t('psicoterapia', 'psychotherapy')));
  hero.append(title);
  hero.append(element('p', 'pt-lead', t(
    'Cuatro perspectivas sobre el mismo territorio. El catálogo, la ficha y los filtros son siempre los mismos: solo cambia desde dónde lo miras.',
    'Four perspectives on the same territory. The catalogue, the profile and the filters never change: only the vantage point does.',
  )));

  const stats = element('dl', 'pt-stats');
  for (const [key, label] of [['models', t('Modelos', 'Models')], ['schools', t('Escuelas', 'Schools')], ['span', t('Recorrido histórico', 'Historical span')]]) {
    const item = element('div', 'pt-stat');
    item.append(element('dt', null, label));
    const value = element('dd', null, '—');
    value.dataset.stat = key;
    item.append(value);
    stats.append(item);
  }
  const colophon = element('div', 'pt-colophon');
  colophon.append(stats, element('p', 'pt-colophon-note', t(
    'Una misma ficha para las cuatro vistas. Los filtros y la selección viajan contigo al cambiar de perspectiva.',
    'One profile across all four views. Filters and selection travel with you when the perspective changes.',
  )));
  hero.append(colophon);

  const choose = element('div', 'pt-choose');
  choose.append(element('span', 'pt-rule'), element('span', null, t('Elige por dónde empezar', 'Choose where to begin')), element('span', 'pt-rule'));

  const cards = element('div', 'pt-cards');
  const scenes = [];
  CARDS.forEach((card, index) => {
    const button = element('button', 'pt-card');
    button.type = 'button';
    button.dataset.view = card.view;
    button.style.setProperty('--i', String(index));

    const visual = element('span', 'pt-card-visual');
    const canvas = element('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    visual.append(canvas, element('span', 'pt-card-num', String(index + 1).padStart(2, '0')));

    const body = element('span', 'pt-card-body');
    const go = element('span', 'pt-card-go');
    go.append(element('span', 'pt-card-meta', card.meta), element('span', 'pt-card-arrow', t('Entrar →', 'Enter →')));
    body.append(element('span', 'pt-card-rule'), element('span', 'pt-card-title', card.title), element('span', 'pt-card-desc', card.desc), go);

    button.append(visual, body);
    cards.append(button);
    scenes.push({ button, canvas, scene: card.scene(), energy: 0, target: 0 });
  });

  main.append(hero, choose, cards);

  const foot = element('div', 'pt-foot');
  const links = element('div', 'pt-foot-links');
  const meta = element('a', null, t('Metamodelos', 'Metamodels'));
  meta.href = '/metamodelos/';
  const skip = element('a', null, t('Ir directamente a la lista', 'Go straight to the list'));
  skip.href = `${LIBRARY_PATH}?view=list`;
  skip.dataset.view = 'list';
  links.append(meta, skip);
  foot.append(links, element('p', null, t('© 2026 Tu Mentor Psicología', '© 2026 Tu Mentor Psicología')));

  shell.append(top, main, foot);
  root.append(shell);
  return { root, dust, scenes, stats };
}

const { root, dust, scenes, stats } = build();
const dustScene = createDustScene();
document.body.append(root);

let open = false;
let pending = '';
let choose = null;
let frame = 0;
let last = 0;
let clock = 0;

const context = (canvas) => {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.__w = 0;
  }
  if (canvas.__w !== w || canvas.__h !== h) {
    canvas.__w = w; canvas.__h = h;
    canvas.__fresh = true;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
};

function paint(time, dt) {
  const { ctx: dustCtx, w: dw, h: dh } = context(dust);
  dustScene.draw(dustCtx, dw, dh, time);
  for (const item of scenes) {
    const { ctx, w, h } = context(item.canvas);
    if (item.canvas.__fresh) { item.canvas.__fresh = false; item.scene.resize(w, h); }
    ctx.save();
    item.scene.draw(ctx, w, h, time, item.energy, dt);
    ctx.restore();
  }
}

function render(now) {
  frame = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  clock += dt;
  for (const item of scenes) {
    item.energy += (item.target - item.energy) * Math.min(1, dt * 5);
    item.button.style.setProperty('--e', item.energy.toFixed(3));
  }
  paint(clock, dt);
  if (open && !document.hidden) frame = requestAnimationFrame(render);
}

// Con movimiento reducido se entrega un solo fotograma, pero adelantado: el
// grafo necesita asentarse y el linaje necesita haber crecido para decir algo.
const STILL_AT = 9.2;
function still() {
  const dt = 1 / 60;
  for (const item of scenes) {
    const { ctx, w, h } = context(item.canvas);
    if (item.canvas.__fresh) { item.canvas.__fresh = false; item.scene.resize(w, h); }
    for (let step = 0; step < 150; step++) item.scene.draw(ctx, w, h, STILL_AT, 0, dt);
  }
  paint(STILL_AT, dt);
}

function play() {
  if (!open || frame || document.hidden) return;
  if (REDUCED) { still(); setTimeout(() => { if (open) still(); }, 3200); return; }
  last = 0;
  frame = requestAnimationFrame(render);
}
function pause() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

for (const item of scenes) {
  const on = () => { item.target = 1; };
  const off = () => { item.target = 0; };
  item.button.addEventListener('pointerenter', on);
  item.button.addEventListener('pointerleave', off);
  item.button.addEventListener('focus', on);
  item.button.addEventListener('blur', off);
  item.button.addEventListener('pointermove', event => {
    const rect = item.button.getBoundingClientRect();
    item.button.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    item.button.style.setProperty('--my', `${event.clientY - rect.top}px`);
  });
  item.button.addEventListener('click', () => request(item.button.dataset.view, item.button));
}

root.querySelector('.pt-foot [data-view]').addEventListener('click', event => {
  event.preventDefault();
  request('list', event.currentTarget);
});

root.addEventListener('keydown', event => {
  const buttons = scenes.map(item => item.button);
  const index = buttons.indexOf(document.activeElement);
  if (index < 0 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
  buttons[(index + step + buttons.length) % buttons.length].focus();
});

// Antes de que el Atlas termine de montarse la elección queda pendiente. Si el
// montaje nunca llega, se navega por URL para no dejar al usuario encerrado.
let rescue = 0;
function request(view, source) {
  if (choose) return choose(view);
  pending = view;
  source?.setAttribute('data-busy', 'true');
  clearTimeout(rescue);
  rescue = setTimeout(() => { if (pending) location.href = `${LIBRARY_PATH}?view=${pending}`; }, 12000);
}

function setInert(state) {
  for (const selector of ['.app', '#atlasHeader', '.authUserMenu', '.nav-speed', '#landingOverlay']) {
    const node = document.querySelector(selector);
    if (!node) continue;
    node.toggleAttribute('inert', state);
    if (state) node.setAttribute('aria-hidden', 'true');
    else node.removeAttribute('aria-hidden');
  }
}

function show() {
  if (open) return;
  open = true;
  root.hidden = false;
  root.classList.remove('is-leaving');
  document.body.classList.add('atlas-portal-open');
  setInert(true);
  play();
  requestAnimationFrame(() => root.focus({ preventScroll: true }));
}

function hide() {
  if (!open) return;
  open = false;
  const finish = () => { root.hidden = true; root.classList.remove('is-leaving'); pause(); };
  document.body.classList.remove('atlas-portal-open');
  setInert(false);
  if (REDUCED) return finish();
  root.classList.add('is-leaving');
  setTimeout(finish, 340);
}

document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));

const format = new Intl.NumberFormat(EN ? 'en-GB' : 'es-ES');
const portal = {
  isOpen: () => open,
  open: show,
  close: hide,
  sync() { if (shouldOpen()) show(); else hide(); },
  takePending() {
    const view = pending;
    pending = '';
    clearTimeout(rescue);
    scenes.forEach(item => item.button.removeAttribute('data-busy'));
    return view;
  },
  attach(handler) {
    choose = handler;
    if (pending) { const view = portal.takePending(); hide(); handler(view); }
  },
  setStats({ models = 0, schools = 0, from = 0, to = 0 } = {}) {
    const write = (key, value) => {
      const node = stats.querySelector(`[data-stat="${key}"]`);
      if (node && value) node.textContent = value;
    };
    write('models', models ? format.format(models) : '');
    write('schools', schools ? format.format(schools) : '');
    write('span', from && to ? `${from} — ${to}` : '');
  },
};

window.TMPS_ATLAS_PORTAL = portal;
if (shouldOpen()) show();
