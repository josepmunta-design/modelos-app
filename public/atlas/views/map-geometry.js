import { coordinates } from '../data.js';

const normalize = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '');
export function cityKey(model) {
  const city = normalize(String(model.ciudad || '').split(',')[0]);
  return city ? `${city}|${normalize(model.pais)}` : '';
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Match the original city grouping using the complete catalog, so filtering
// schools or years cannot move a city's cluster. Never mutate shared models.
export function cityCoordinates(models) {
  const groups = new Map(), result = new Map();
  for (const model of models) {
    const point = coordinates(model), key = cityKey(model);
    if (!point || !key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  }
  for (const [key, points] of groups) result.set(key, [median(points.map(p => p[0])), median(points.map(p => p[1]))]);
  return result;
}

export function nodeSize(model) {
  const raw = Number(model.importance);
  return Math.round(9 + (Number.isFinite(raw) ? Math.max(0, Math.min(4, raw)) : 2) * 3);
}

export function clusterAppearance(colors) {
  const count = colors.length, totals = new Map();
  for (const color of colors) totals.set(color, (totals.get(color) || 0) + 1);
  let acc = 0;
  const gradient = [...totals].sort((a, b) => b[1] - a[1]).map(([color, n]) => {
    const from = acc / count * 360; acc += n;
    return `${color} ${from.toFixed(1)}deg ${(acc / count * 360).toFixed(1)}deg`;
  }).join(', ');
  return { size: count >= 40 ? 58 : count >= 10 ? 48 : 40, gradient };
}
