import { SCHOOLS } from '../public/assets/escuelas/catalog.js';
import { loadEscuelasContenido, modelosDeEscuela } from './build-escuela-pages.mjs';

export const escuelas = await loadEscuelasContenido();
export const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const normalizeGroup = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
export function schoolFor(model) {
  return escuelas.find(school => [school.grupo, ...(school.alias || [])].some(group => normalizeGroup(group) === normalizeGroup(model.__canonicalGroup || model.grupo)));
}

export function renderDirectory(models, locale = 'es') {
  const en = locale === 'en';
  const links = list => list.map(m => `<a href="/${en ? 'en/models' : 'modelos'}/${encodeURIComponent(m.id)}" class="mi-item" data-id="${encodeURIComponent(m.id)}"><div class="mi-shell"><div class="mi-avatar"><div class="mi-avatarFallback" aria-hidden="true">${escapeHtml(String(m.autores || '').split(/\s+/).slice(0, 2).map(part => part[0]).join(''))}</div></div><div class="mi-body"><div class="mi-top"><div class="mi-titleWrap"><span class="mi-accentDot" aria-hidden="true"></span><div class="mi-title">${escapeHtml(m.label)}</div></div><div class="mi-meta"><div class="mi-year">${escapeHtml(m.year ?? '-')}</div></div></div><div class="mi-sub">${escapeHtml(m.autores || '-')}</div></div></div></a>`).join('\n');
  if (en) return links(models);
  const groups = escuelas.map(school => ({ school, models: modelosDeEscuela(school, models) })).filter(group => group.models.length);
  const body = groups.map(({school, models: group}) => `<section class="mi-section"><div class="mi-sectionHeader"><span class="mi-sectionLine"></span><span class="mi-sectionLabel"><a href="/escuelas/${school.id}/">${escapeHtml(school.grupo)}</a></span><span class="mi-sectionLine"></span></div>${links(group)}</section>`).join('\n');
  const ungrouped = models.filter(m => !schoolFor(m));
  return body + links(ungrouped);
}

export function replaceDirectory(html, directory = '') {
  return html.replace(/<!-- ATLAS DIRECTORY START -->[\s\S]*?<!-- ATLAS DIRECTORY END -->/, `<!-- ATLAS DIRECTORY START -->\n${directory}\n<!-- ATLAS DIRECTORY END -->`);
}

export function replaceModelContent(html, content) {
  if (html.includes('<!-- MODEL CONTENT START -->')) return html.replace(/<!-- MODEL CONTENT START -->[\s\S]*?<!-- MODEL CONTENT END -->/, `<!-- MODEL CONTENT START -->\n${content}\n<!-- MODEL CONTENT END -->`);
  return html.replace('<div id="modelInfo" class="modelPanel">', `<div id="modelInfo" class="modelPanel">${content}`);
}

export async function buildSchoolsIndex(models, template) {
  const groups = SCHOOLS.map(card => ({card, school: escuelas.find(school => school.id === card.id)})).map(({card, school}) => ({card, school, models: modelosDeEscuela(school, models)})).filter(group => group.models.length);
  const cards = groups.map(({card, school, models: group}, index) => `<a class="school" data-school-id="${school.id}" href="/escuelas/${school.id}/">
    <div class="school-stage" aria-hidden="true"></div><div class="school-shade" aria-hidden="true"></div><div class="school-light" aria-hidden="true"></div>
    <div class="school-top"><span class="school-index">${String(index + 1).padStart(2, '0')}</span><span class="school-count">${group.length} modelos</span></div>
    <p class="school-caption" aria-hidden="true"></p><div class="school-content"><h3 class="school-name">${escapeHtml(school.grupo)}</h3><p class="school-desc">${escapeHtml(card.desc)}</p><span class="school-action">Ver la escuela <span class="arrow-circle" aria-hidden="true">↗</span></span></div><span class="school-edge" aria-hidden="true"></span></a>`).join('\n');
  return template.replace(/<div class="schools" id="schoolsGrid"[^>]*>[\s\S]*?<\/div>\s*<!-- SCHOOLS GRID END -->/, `<div class="schools" id="schoolsGrid" aria-labelledby="schools-hint">${cards}</div>\n<!-- SCHOOLS GRID END -->`)
    .replace(/(<span class="section-hint" id="schoolsTotals">)[\s\S]*?(<\/span>)/, `$1${groups.length} escuelas · ${groups.reduce((total, group) => total + group.models.length, 0)} modelos$2`);
}
