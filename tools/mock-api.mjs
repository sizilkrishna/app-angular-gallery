#!/usr/bin/env node
/**
 * Tiny stand-in for api-symfony-php (see docs/openapi.yaml in that repo) so the front end can be
 * developed and tested without PHP or PostgreSQL:   npm run mock-api   (listens on :8080)
 * Same routes, lowercase keys, pagination envelope, RFC 9457 errors and CORS rules.
 * Images are generated SVGs served from /img/:id.svg.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8080);
const ORIGIN = `http://localhost:${PORT}`;

const authors = [
  ['Rembrandt Harmensz. van Rijn', '1606-1669', 2], ['Claude Monet', '1840-1926', 3], ['Leonardo da Vinci', '1452-1519', 1],
  ['Johannes Vermeer', '1632-1675', 2], ['Albrecht Dürer', '1471-1528', 4], ['Caravaggio', '1571-1610', 1], ['Vincent van Gogh', '1853-1890', 2],
].map(([author, born_died, school_id], i) => ({ id: i + 1, author, born_died, school_id }));
const schools = ['Italian', 'Dutch', 'French', 'German'].map((school, i) => ({ id: i + 1, school }));
const forms = ['painting', 'sculpture', 'graphics', 'architecture'].map((form, i) => ({ id: i + 1, form }));
const types = ['portrait', 'landscape', 'religious', 'still-life', 'genre'].map((type, i) => ({ id: i + 1, type }));
const frames = ['1451-1500', '1501-1550', '1551-1600', '1601-1650', '1851-1900', '1651-1700', '1801-1850'].map((timeframe, i) => ({ id: i + 1, timeframe }));
const locations = ['Rijksmuseum, Amsterdam', 'Musée d\'Orsay, Paris', 'Louvre, Paris', 'Mauritshuis, The Hague'].map((location, i) => ({ id: i + 1, location }));

const words = ['Portrait of a Man', 'Landscape with River', 'Madonna and Child', 'Self-Portrait', 'Still Life with Fruit', 'The Last Judgment', 'Winter Landscape', 'Cathedral at Dawn', 'Girl with a Pearl', 'Study of Hands'];
const art = Array.from({ length: 240 }, (_, i) => {
  const id = i + 1, a = authors[i % authors.length];
  const t = words[i % words.length] + (i >= words.length ? ` ${Math.floor(i / words.length) + 1}` : '');
  return {
    id, title: t, date: String(1450 + ((i * 7) % 420)), technique: i % 3 ? 'Oil on canvas' : 'oil on panel', url: `${ORIGIN}/img/${id}.svg`,
    author_id: a.id, form_id: (i % 2) + 1, location_id: (i % locations.length) + 1, school_id: a.school_id, timeframe_id: (i % frames.length) + 1, type_id: (i % types.length) + 1,
  };
});
const row = (a) => ({
  ...a, author: authors[a.author_id - 1].author, born_died: authors[a.author_id - 1].born_died,
  form: forms[a.form_id - 1].form, location: locations[a.location_id - 1].location, school: schools[a.school_id - 1].school,
  timeframe: frames[a.timeframe_id - 1].timeframe, type: types[a.type_id - 1].type,
});
const dims = { author: ['author_id', authors], form: ['form_id', forms], location: ['location_id', locations], school: ['school_id', schools], timeframe: ['timeframe_id', frames], type: ['type_id', types] };
const params = { au: 'author', fo: 'form', lo: 'location', sc: 'school', ti: 'timeframe', ty: 'type' };

const problem = (res, status, title, detail) => send(res, status, { type: 'about:blank', title, status, success: false, ...(detail && { detail }) }, 'application/problem+json');
function send(res, status, body, type = 'application/json', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
}
const int = (v, d, min, max) => { if (v == null || v === '') return d; if (!/^-?\d{1,9}$/.test(v)) throw new Error('int'); return Math.max(min, Math.min(max, +v)); };
function page(items, q) {
  const limit = int(q.get('limit'), 10, 1, 100), p = int(q.get('page'), 1, 1, 10000);
  return { success: true, records: items.slice((p - 1) * limit, p * limit), pagination: { total: items.length, page: p, limit, pages: Math.ceil(items.length / limit) } };
}
function matches(q) {
  let list = art;
  for (const [k, dim] of Object.entries(params)) if (+q.get(k) > 0) list = list.filter((a) => a[dims[dim][0]] === +q.get(k));
  const term = (q.get('q') ?? '').toLowerCase().replace(/"/g, '');
  const words = term.split(/\s+/).filter((w) => w && w !== 'or');
  if (words.length) list = list.filter((a) => { const r = row(a); const hay = `${r.title} ${r.technique} ${r.author}`.toLowerCase(); return words.every((w) => (w.startsWith('-') ? !hay.includes(w.slice(1)) : hay.includes(w))); });
  return list.map(row);
}
function taxonomy(dim, letter) {
  const [fk, rows] = dims[dim];
  return rows.filter((r) => art.some((a) => a[fk] === r.id) && (!letter || r.author?.toLowerCase().startsWith(letter.toLowerCase()))).map((r) => taxRow(dim, r));
}
function taxRow(dim, r) {
  const [fk] = dims[dim], mine = art.filter((a) => a[fk] === r.id);
  if (dim === 'author') { const s = schools[r.school_id - 1]; return { id: r.id, author: r.author, born_died: r.born_died, school_id: s.id, school: s.school, count: mine.length }; }
  return { id: r.id, [dim]: r[dim], fimage: mine[0]?.url ?? null, count: mine.length };
}

createServer((req, res) => {
  const url = new URL(req.url, ORIGIN), q = url.searchParams, path = url.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  try {
    let m;
    if ((m = path.match(/^\/img\/(\d+)\.svg$/))) {
      const id = +m[1], hue = (id * 47) % 360, tall = id % 3 === 0, w = tall ? 600 : 900, h = tall ? 800 : 640;
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' });
      return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 50% 28%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.65}" cy="${h * 0.35}" r="${h * 0.12}" fill="hsl(${hue} 70% 85% / .8)"/><text x="50%" y="92%" text-anchor="middle" font-family="Georgia" font-size="${h * 0.06}" fill="#fff" opacity=".85">Mock artwork #${id}</text></svg>`);
    }
    if (path === '/api/health') return send(res, 200, { success: true, status: 'ok' });
    if (path === '/api/random') return send(res, 200, { success: true, records: Array.from({ length: int(q.get('limit'), 1, 1, 50) }, () => row(art[Math.floor(Math.random() * art.length)])) });
    if (path === '/api/art/all') return send(res, 200, page(art.map(row), q));
    if ((m = path.match(/^\/api\/art\/all\/(\d+)$/))) { const a = art.find((x) => x.id === +m[1]); return a ? send(res, 200, { success: true, record: row(a) }) : problem(res, 404, 'Not Found', 'Artwork not found.'); }
    if ((m = path.match(/^\/api\/art\/(author|form|location|school|timeframe|type)\/(\d+)$/))) return send(res, 200, page(art.filter((a) => a[dims[m[1]][0]] === +m[2]).map(row), q));
    if ((m = path.match(/^\/api\/info\/author\/([a-zA-Z])$/))) return send(res, 200, page(taxonomy('author', m[1]), q));
    if ((m = path.match(/^\/api\/info\/(author|form|location|school|timeframe|type)$/))) return send(res, 200, page(taxonomy(m[1]).sort((a, b) => String(a[m[1]]).localeCompare(String(b[m[1]]))), q));
    if ((m = path.match(/^\/api\/info\/(author|form|location|school|timeframe|type)\/(\d+)$/))) { const r = dims[m[1]][1].find((x) => x.id === +m[2]); return r ? send(res, 200, { success: true, record: taxRow(m[1], r) }) : problem(res, 404, 'Not Found', `${m[1][0].toUpperCase() + m[1].slice(1)} not found.`); }
    if (path === '/api/search') { if (!(q.get('q') ?? '').trim()) return problem(res, 400, 'Bad Request', 'Query parameter "q" is required.'); return send(res, 200, page(matches(q), q)); }
    if (path === '/api/filter') { if (!Object.keys(params).some((k) => +q.get(k) > 0)) return problem(res, 400, 'Bad Request', 'At least one filter parameter (au, fo, lo, sc, ti, ty) is required.'); return send(res, 200, page(matches(q), q)); }
    if (path === '/api/logger' && req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); return req.on('end', () => { console.log('[logger]', b); send(res, 201, { success: true, message: 'Query logged' }); }); }
    return problem(res, 404, 'Not Found', 'No route.');
  } catch { return problem(res, 400, 'Bad Request', 'Invalid query parameter.'); }
}).listen(PORT, () => console.log(`Mock art API on ${ORIGIN}/api`));
