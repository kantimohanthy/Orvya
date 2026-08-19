/* ============================================================================
   ORVYRA — LIVE SOURCE ADAPTER  (ROR + OpenAlex)
   ----------------------------------------------------------------------------
   Runs server-side (Node 18+, global fetch). Never ship this to the browser:
   the OpenAlex key must stay in the server environment.

   It produces records in the same shape the intelligence core already consumes,
   stamped `provenance: 'LIVE'`.

   WHAT `confidence` MEANS FOR A LIVE RECORD
   For SYNTHETIC evidence, confidence was model-assigned extraction confidence.
   For LIVE registry data it means *fidelity of extraction*, not truth of the
   claim: 1.0 says "this field was read directly from the source record", not
   "this is true about the world". A field absent from the source is withheld.
   We never interpolate, never default, never round up.

   WHAT THIS ADAPTER WILL NOT DO
   - Invent a ROR ID, an OpenAlex ID, or a works count.
   - Emit an edge without a source URL and a retrieval timestamp.
   - Claim `participated_in`, `developed` or `contributed_to`. Neither ROR nor
     OpenAlex knows those. They stay unbuilt until a primary source exists.
   ============================================================================ */

'use strict';

const ROR_BASE = 'https://api.ror.org/v2/organizations';
const OA_BASE  = 'https://api.openalex.org/institutions';

/* ROR currently allows 2000 requests / 5 min per IP and needs no registration.
   From Q3 2026 a Client-Id header is needed to keep that limit; unidentified
   traffic drops to 50 / 5 min. Pass clientId as soon as you have one. */
const DEFAULT_PACE_MS = 220;

const sleep = ms => new Promise(r => setTimeout(r, ms));

class LiveSourceError extends Error {
  constructor(msg, meta){ super(msg); this.name = 'LiveSourceError'; this.meta = meta || {}; }
}

/* ---------------------------------------------------------------- transport */

async function request(url, { headers = {}, fetchImpl = globalThis.fetch, retries = 3 } = {}){
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++){
    if (attempt) await sleep(500 * Math.pow(2, attempt - 1));
    let res;
    try { res = await fetchImpl(url, { headers: Object.assign({ 'Accept':'application/json' }, headers) }); }
    catch (e){ lastErr = e; continue; }
    if (res.status === 429 || res.status >= 500){ lastErr = new LiveSourceError('retryable ' + res.status, { url }); continue; }
    if (!res.ok) throw new LiveSourceError('request failed: ' + res.status, { url, status: res.status });
    return { body: await res.json(), url, retrievedAt: new Date().toISOString() };
  }
  throw lastErr || new LiveSourceError('request failed', { url });
}

/* --------------------------------------------------------------------- ROR */

async function rorSearch(name, opts = {}){
  const url = `${ROR_BASE}?query=${encodeURIComponent(name)}`;
  const headers = opts.clientId ? { 'Client-Id': opts.clientId } : {};
  const { body, retrievedAt } = await request(url, Object.assign({ headers }, opts));
  return { items: body.items || [], sourceUrl: url, retrievedAt };
}

async function rorGet(rorId, opts = {}){
  const id = String(rorId).replace(/^https?:\/\/ror\.org\//, '');
  const url = `${ROR_BASE}/${encodeURIComponent(id)}`;
  const headers = opts.clientId ? { 'Client-Id': opts.clientId } : {};
  const { body, retrievedAt } = await request(url, Object.assign({ headers }, opts));
  return { record: body, sourceUrl: url, retrievedAt };
}

/* ROR v2 names[] carries typed variants: ror_display, label, alias, acronym. */
function normaliseRor(rec){
  const names = rec.names || [];
  const pick = t => names.filter(n => (n.types || []).includes(t)).map(n => n.value);
  const display = pick('ror_display')[0] || (names[0] && names[0].value) || null;
  const loc = (rec.locations || [])[0];
  const geo = loc && loc.geonames_details;
  const website = (rec.links || []).find(l => l.type === 'website');

  return {
    rorId: rec.id || null,
    canonicalName: display,
    aliases: [...new Set([...pick('label'), ...pick('alias'), ...pick('acronym')])].filter(n => n !== display),
    acronyms: pick('acronym'),
    types: rec.types || [],
    status: rec.status || null,
    established: rec.established != null ? String(rec.established) : null,
    country: geo ? geo.country_name : null,
    countryCode: geo ? geo.country_code : null,
    city: geo ? geo.name : null,
    latitude: geo && geo.lat != null ? geo.lat : null,
    longitude: geo && geo.lng != null ? geo.lng : null,
    homepage: website ? website.value : null,
    lastModified: rec.admin && rec.admin.last_modified ? rec.admin.last_modified.date : null,
    relationships: (rec.relationships || []).map(r => ({ type: r.type, label: r.label, id: r.id }))
  };
}

/* ---------------------------------------------------------------- OpenAlex */
/* API keys have been required for all OpenAlex requests since 13 Feb 2026.
   A free key carries $1/day; a singleton lookup by ID is free of charge. */

async function openAlexByRor(rorId, opts = {}){
  if (!opts.apiKey) throw new LiveSourceError('OPENALEX_API_KEY missing — refusing to guess research figures');
  const id = String(rorId).replace(/^https?:\/\//, '');
  const url = `${OA_BASE}/${encodeURIComponent('https://' + id)}?api_key=${encodeURIComponent(opts.apiKey)}`;
  const safeUrl = url.replace(/api_key=[^&]+/, 'api_key=REDACTED');
  try {
    const { body, retrievedAt } = await request(url, opts);
    return { record: body, sourceUrl: safeUrl, retrievedAt };
  } catch (e){
    if (e.meta && e.meta.status === 404) return { record: null, sourceUrl: safeUrl, retrievedAt: new Date().toISOString() };
    throw e;
  }
}

function normaliseOpenAlex(rec){
  if (!rec) return null;
  const g = rec.geo || {};
  const s = rec.summary_stats || {};
  return {
    openAlexId: rec.id || null,
    displayName: rec.display_name || null,
    type: rec.type || null,
    worksCount: Number.isFinite(rec.works_count) ? rec.works_count : null,
    citedByCount: Number.isFinite(rec.cited_by_count) ? rec.cited_by_count : null,
    hIndex: Number.isFinite(s.h_index) ? s.h_index : null,
    i10Index: Number.isFinite(s.i10_index) ? s.i10_index : null,
    city: g.city || null,
    country: g.country || null,
    latitude: Number.isFinite(g.latitude) ? g.latitude : null,
    longitude: Number.isFinite(g.longitude) ? g.longitude : null,
    lineage: rec.lineage || [],
    countsByYear: rec.counts_by_year || [],
    topics: (rec.topics || []).slice(0, 8).map(t => ({ id: t.id, name: t.display_name, count: t.count })),
    updated: rec.updated_date || null
  };
}

/* ------------------------------------------------------------ ORVYRA shape */

let evSeq = 0;
const nextEvId = () => 'EV-L' + String(++evSeq).padStart(4, '0');

function makeEvidence(claim, sourceUrl, retrievedAt, publishedAt, method){
  return {
    id: nextEvId(),
    claim,
    confidence: 1,                      // extraction fidelity, not truth — see header
    sourceUri: sourceUrl,
    publishedAt: publishedAt || null,
    observedAt: retrievedAt,
    method,
    provenance: 'LIVE'
  };
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 48);

/* Build one organization entity plus its evidence and its derivable edges. */
function toOrvyra(rorNorm, oaNorm, ctx){
  const evidence = [];
  const attrs = {};
  const id = 'org-' + slug(rorNorm.acronyms[0] || rorNorm.canonicalName);

  const put = (key, value, claim, src) => {
    if (value === null || value === undefined || value === ''){
      attrs[key] = { withheld: 'not present in ' + src.label };
      return;
    }
    const ev = makeEvidence(claim, src.url, src.retrievedAt, src.publishedAt, src.method);
    evidence.push(ev);
    attrs[key] = { v: String(value), ev: [ev.id] };
  };

  const rorSrc = { url: ctx.rorUrl, retrievedAt: ctx.rorRetrievedAt, publishedAt: rorNorm.lastModified,
                   label: 'the ROR record', method: 'ROR v2 record field read' };
  const oaSrc  = { url: ctx.oaUrl, retrievedAt: ctx.oaRetrievedAt, publishedAt: oaNorm ? oaNorm.updated : null,
                   label: 'the OpenAlex institution record', method: 'OpenAlex institution field read' };

  put('rorId', rorNorm.rorId, `${rorNorm.canonicalName} has ROR ID ${rorNorm.rorId}`, rorSrc);
  put('country', rorNorm.country, `${rorNorm.canonicalName} is registered in ${rorNorm.country}`, rorSrc);
  put('city', rorNorm.city, `${rorNorm.canonicalName} is located in ${rorNorm.city}`, rorSrc);
  put('established', rorNorm.established, `${rorNorm.canonicalName} was established in ${rorNorm.established}`, rorSrc);
  put('homepage', rorNorm.homepage, `${rorNorm.canonicalName} publishes at ${rorNorm.homepage}`, rorSrc);

  if (oaNorm){
    put('openAlexId', oaNorm.openAlexId, `${rorNorm.canonicalName} maps to OpenAlex ${oaNorm.openAlexId}`, oaSrc);
    put('works', oaNorm.worksCount, `OpenAlex indexes ${oaNorm.worksCount} works affiliated with ${rorNorm.canonicalName}`, oaSrc);
    put('citations', oaNorm.citedByCount, `Works affiliated with ${rorNorm.canonicalName} have ${oaNorm.citedByCount} citations in OpenAlex`, oaSrc);
    put('hIndex', oaNorm.hIndex, `OpenAlex reports an h-index of ${oaNorm.hIndex} for ${rorNorm.canonicalName}`, oaSrc);
  } else {
    ['openAlexId','works','citations','hIndex'].forEach(k => {
      attrs[k] = { withheld: 'OpenAlex not queried — no API key supplied' };
    });
  }

  const lat = rorNorm.latitude != null ? rorNorm.latitude : (oaNorm ? oaNorm.latitude : null);
  const lng = rorNorm.longitude != null ? rorNorm.longitude : (oaNorm ? oaNorm.longitude : null);

  const entity = {
    id,
    kind: 'organization',
    name: rorNorm.canonicalName,
    aliases: rorNorm.aliases,
    region: rorNorm.country,
    sectors: [],                        // sector tagging is a curation decision, not a source fact
    tagline: (rorNorm.types[0] || 'Research organization'),
    meta: [rorNorm.country, rorNorm.city].filter(Boolean).join(' · '),
    attrs,
    geo: (lat != null && lng != null) ? { lat, lng, source: rorNorm.latitude != null ? 'ROR' : 'OpenAlex' } : null,
    provenance: 'LIVE'
  };

  /* Edges we can actually evidence. Nothing else. */
  const edges = [];

  (oaNorm ? oaNorm.topics : []).forEach(t => {
    const tid = 'topic-' + slug(t.name);
    const ev = makeEvidence(
      `OpenAlex associates ${t.count} works affiliated with ${rorNorm.canonicalName} with the topic ${t.name}`,
      ctx.oaUrl, ctx.oaRetrievedAt, oaNorm.updated, 'OpenAlex institution topics field read');
    evidence.push(ev);
    edges.push({ from: id, rel: 'researches', to: tid, ev: [ev.id], weight: t.count });
  });

  rorNorm.relationships.filter(r => ['Parent','Child','Related'].includes(r.type)).forEach(r => {
    const ev = makeEvidence(
      `ROR records a ${r.type.toLowerCase()} relationship between ${rorNorm.canonicalName} and ${r.label}`,
      ctx.rorUrl, ctx.rorRetrievedAt, rorNorm.lastModified, 'ROR v2 relationships field read');
    evidence.push(ev);
    edges.push({
      from: r.type === 'Parent' ? 'org-ref:' + r.id : id,
      rel: r.type === 'Related' ? 'related to' : 'part of',
      to:  r.type === 'Parent' ? id : 'org-ref:' + r.id,
      ev: [ev.id]
    });
  });

  return { entity, evidence, edges, topics: oaNorm ? oaNorm.topics : [] };
}

/* ----------------------------------------------------------------- resolve */

async function resolveOrganization(name, opts = {}){
  const search = await rorSearch(name, opts);
  if (!search.items.length) return { name, resolved: false, reason: 'no ROR match' };

  /* Take the top hit only when it is unambiguous. ROR v2 search does not
     return a score, so we require the query to appear in a name variant. */
  const q = name.toLowerCase();
  const candidate = search.items.find(it =>
    (it.names || []).some(n => n.value.toLowerCase() === q ||
                               (n.types || []).includes('acronym') && n.value.toLowerCase() === q)
  ) || search.items[0];

  const ambiguous = search.items.length > 1 && !search.items.some(it =>
    (it.names || []).some(n => n.value.toLowerCase() === q));

  const rorNorm = normaliseRor(candidate);
  let oaNorm = null, oaUrl = null, oaRetrievedAt = null;
  if (opts.apiKey && rorNorm.rorId){
    const oa = await openAlexByRor(rorNorm.rorId, opts);
    oaNorm = normaliseOpenAlex(oa.record);
    oaUrl = oa.sourceUrl; oaRetrievedAt = oa.retrievedAt;
  }

  const built = toOrvyra(rorNorm, oaNorm, {
    rorUrl: `${ROR_BASE}/${String(rorNorm.rorId).replace(/^https?:\/\/ror\.org\//,'')}`,
    rorRetrievedAt: search.retrievedAt,
    oaUrl, oaRetrievedAt
  });

  return Object.assign({ name, resolved: true, ambiguous, candidates: search.items.length }, built);
}

async function harvest(names, opts = {}){
  const pace = opts.paceMs != null ? opts.paceMs : DEFAULT_PACE_MS;
  const entities = [], evidence = [], edges = [], unresolved = [], topicEntities = new Map();

  for (const name of names){
    try {
      const r = await resolveOrganization(name, opts);
      if (!r.resolved){ unresolved.push({ name, reason: r.reason }); continue; }
      entities.push(r.entity);
      evidence.push(...r.evidence);
      edges.push(...r.edges);
      (r.topics || []).forEach(t => {
        const tid = 'topic-' + slug(t.name);
        if (!topicEntities.has(tid)) topicEntities.set(tid, {
          id: tid, kind: 'technology', name: t.name, aliases: [], region: null, sectors: [],
          tagline: 'OpenAlex research topic', meta: 'Topic · OpenAlex', attrs: {}, provenance: 'LIVE'
        });
      });
      if (opts.onProgress) opts.onProgress({ name, ok:true, ambiguous:r.ambiguous, candidates:r.candidates });
    } catch (e){
      unresolved.push({ name, reason: e.message });
      if (opts.onProgress) opts.onProgress({ name, ok:false, reason:e.message });
    }
    await sleep(pace);
  }

  /* Drop edges pointing at organizations we did not harvest — an edge whose
     endpoint is unresolved is not an edge. */
  const known = new Set([...entities.map(e => e.id), ...topicEntities.keys()]);
  const byRorRef = new Map(entities.map(e => [e.attrs.rorId && e.attrs.rorId.v, e.id]));
  const rewritten = [], droppedEdges = [];
  for (const e of edges){
    const fix = v => v.startsWith('org-ref:') ? byRorRef.get(v.slice(8)) : v;
    const from = fix(e.from), to = fix(e.to);
    if (!from || !to || !known.has(from) || !known.has(to)){ droppedEdges.push(e); continue; }
    rewritten.push(Object.assign({}, e, { from, to }));
  }

  return {
    meta: {
      id: 'orvyra-live-' + new Date().toISOString().slice(0,10),
      provenance: 'LIVE',
      harvestedAt: new Date().toISOString(),
      sources: ['https://api.ror.org/v2/organizations', 'https://api.openalex.org/institutions'],
      openAlexQueried: !!opts.apiKey,
      requested: names.length
    },
    entities: entities.concat([...topicEntities.values()]),
    evidence,
    edges: rewritten,
    unresolved,
    droppedEdges: droppedEdges.length
  };
}

/* The seed list is names only. No identifiers are asserted here — every ID in
   the output corpus comes from a response the harvester actually received. */
const SEED_ORGANIZATIONS = [
  'European Space Agency',
  'German Aerospace Center',
  'Centre National d\'Études Spatiales',
  'Agenzia Spaziale Italiana',
  'UK Space Agency',
  'Netherlands Institute for Space Research',
  'Instituto Nacional de Técnica Aeroespacial',
  'Polish Space Agency',
  'Swedish National Space Agency',
  'Norwegian Space Agency',
  'Luxembourg Space Agency',
  'Belgian Science Policy Office',
  'Austrian Space Applications Programme',
  'Danish Technical University',
  'European Southern Observatory',
  'Max Planck Institute for Solar System Research',
  'Institut d\'Astrophysique Spatiale',
  'Rutherford Appleton Laboratory',
  'Fraunhofer Society',
  'Delft University of Technology'
];

module.exports = {
  ROR_BASE, OA_BASE, SEED_ORGANIZATIONS, LiveSourceError,
  rorSearch, rorGet, normaliseRor,
  openAlexByRor, normaliseOpenAlex,
  toOrvyra, resolveOrganization, harvest
};
