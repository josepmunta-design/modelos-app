export function coordinates(model) {
  const rawLat = model?.lat ?? model?.latitude;
  const rawLon = model?.lon ?? model?.lng ?? model?.longitude;
  if (rawLat == null || rawLon == null || String(rawLat).trim() === '' || String(rawLon).trim() === '') return null;
  const lat = Number(rawLat), lon = Number(rawLon);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)
    ? [lat, lon] : null;
}

export function modelYear(model) {
  const year = Number.parseInt(model?.year, 10);
  return Number.isFinite(year) && year >= 1000 && year <= 2100 ? year : null;
}

export function normalizeInfluences(records) {
  if (!Array.isArray(records)) throw new Error('Invalid influence catalog');
  const idOf = value => String(typeof value === 'object' && value !== null
    ? value.id || value.modeloId || value.modelo_id || value.slug || '' : value ?? '').trim();
  const read = (entry, keys) => {
    const values = keys.map(key => entry[key]).find(Array.isArray) || [];
    return values.map(idOf).filter(Boolean);
  };
  const edges = new Map();
  const add = (from, to) => { if (from && to && from !== to) edges.set(`${from}\0${to}`, { from, to }); };
  for (const record of records) {
    const id = idOf(record);
    read(record, ['influenciasAscendentes', 'influencias_ascendentes', 'ascendentes', 'influidoPor', 'antecedentes']).forEach(from => add(from, id));
    read(record, ['influenciasDescendentes', 'influencias_descendentes', 'descendentes', 'influyeEn', 'posteriores']).forEach(to => add(id, to));
  }
  return [...edges.values()];
}

export function createAtlasData(library) {
  // Reuse the library's authenticated request path, public/full model caches
  // and in-flight school loads. Views never create sessions or fetch fichas.
  const extraCoordinates = new Map();
  let geoPromise, influencePromise;
  const influenceRecords = () => {
    if (!influencePromise) influencePromise = library.readJson('Core/Influencias/modelos_influencias.json')
      .then(records => { if (!Array.isArray(records)) throw new Error('Invalid influence catalog'); return records; })
      .catch(error => { influencePromise = null; throw error; });
    return influencePromise;
  };
  return {
    models: () => library.models().map(model => extraCoordinates.has(model.id)
      ? { ...model, ...extraCoordinates.get(model.id) } : model),
    filtered: () => library.filteredModels().map(model => extraCoordinates.has(model.id)
      ? { ...model, ...extraCoordinates.get(model.id) } : model),
    async ready() { await library.loadCatalog(); },
    async locate() {
      if (geoPromise) return geoPromise;
      geoPromise = (async () => {
        await library.loadCatalog();
        const missing = library.models().filter(model => !coordinates(model) && model.file);
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(4, missing.length) }, async () => {
          while (cursor < missing.length) {
            const model = missing[cursor++];
            try {
              const full = await library.publicModel(model);
              if (coordinates(full)) extraCoordinates.set(model.id, {
                lat: coordinates(full)[0], lon: coordinates(full)[1],
                ciudad: full.ciudad || model.ciudad, pais: full.pais || model.pais,
              });
            } catch { /* Missing location is represented explicitly in the UI. */ }
          }
        }));
      })().catch(error => { geoPromise = null; throw error; });
      return geoPromise;
    },
    influences() {
      return influenceRecords().then(normalizeInfluences);
    },
    influenceNames() {
      return influenceRecords().then(records => new Map(records.filter(record => record.nombre)
        .map(record => [String(record.id || record.modeloId || record.modelo_id || record.slug || ''), record.nombre])));
    },
  };
}
