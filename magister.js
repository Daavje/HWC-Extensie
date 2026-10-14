// Magister Gateway integration: pure parsing, validation and fetching logic.
// The user supplies the URL and a managed proxy key generated in their gateway.

export const MAGISTER_CONFIG_KEY = 'hwcMagisterConfig';
export const MAGISTER_CACHE_KEY = 'hwcMagisterCache';
export const MAGISTER_ALARM = 'hwc-magister-rooster';
const MAX_ITEMS = 2000;

export function gatewayOrigin(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
        url.search || url.hash || !['', '/'].includes(url.pathname)) return null;
    return url.origin;
  } catch { return null; }
}

export function validProxyKey(value) {
  // No whitespace, CR/LF or control chars may enter an Authorization header.
  return typeof value === 'string' && /^mag_sk_[A-Za-z0-9_-]{8,220}$/.test(value);
}

export function mondayOf(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return start;
}
export function addDays(date, count) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + count);
  return d;
}
export function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function fetchRange(now = new Date()) {
  // Last week + current week + next 2 weeks, refreshed every 15 minutes.
  const monday = mondayOf(now);
  return { from: localDate(addDays(monday, -7)), to: localDate(addDays(monday, 20)) };
}
export function scheduleUrl(gateway, from, to) {
  const origin = gatewayOrigin(gateway);
  if (!origin || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    throw new Error('Ongeldige gateway of datum.');
  const url = new URL('/api/proxy/api/personen/me/afspraken', origin);
  url.searchParams.set('van', from);
  url.searchParams.set('tot', to);
  url.searchParams.set('status', '1');
  return url.href;
}

function plainText(input, max = 260) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}
function names(value) {
  if (typeof value === 'string') return plainText(value, 90);
  if (!Array.isArray(value)) return '';
  return value.slice(0, 8).map(x => plainText(typeof x === 'string' ? x : x?.Naam || x?.naam || x?.Afkorting || x?.afkorting || '', 45))
    .filter(Boolean).join(', ');
}
function timeStamp(input) {
  if (typeof input !== 'string') return null;
  // Magister typically returns an ISO date/time with an offset.
  const t = Date.parse(input);
  return Number.isFinite(t) ? t : null;
}
export function normalizeAppointment(item) {
  if (!item || typeof item !== 'object') return null;
  const start = timeStamp(item.Start ?? item.start ?? item.startTime);
  const end = timeStamp(item.Einde ?? item.einde ?? item.endTime);
  if (start === null || end === null || end < start) return null;
  const title = plainText(item.Omschrijving ?? item.omschrijving ?? item.title ?? '', 110) ||
    names(item.Vakken ?? item.vakken) || 'Afspraak';
  return {
    id: String(item.Id ?? item.id ?? `${start}-${title}`).slice(0, 100),
    start, end, title,
    subject: names(item.Vakken ?? item.vakken),
    location: names(item.Lokalen ?? item.lokalen) || plainText(item.Lokatie ?? item.lokatie ?? item.location ?? '', 90),
    teachers: names(item.Docenten ?? item.docenten),
    homework: plainText(item.Inhoud ?? item.inhoud ?? item.HuiswerkInhoud ?? '', 650),
    cancelled: item.IsUitgevallen === true || item.Uitgevallen === true || item.isCancelled === true || item.Status === 5
  };
}
export function parseAppointments(json) {
  const rows = Array.isArray(json) ? json :
    (Array.isArray(json?.Items) ? json.Items : Array.isArray(json?.items) ? json.items :
     Array.isArray(json?.Afspraken) ? json.Afspraken : Array.isArray(json?.afspraken) ? json.afspraken : null);
  if (!rows) throw new Error('De gateway gaf geen herkenbare roostergegevens terug.');
  if (rows.length > MAX_ITEMS) throw new Error('De roosterdataset is te groot.');
  const seen = new Set();
  return rows.map(normalizeAppointment).filter(item => {
    if (!item) return false;
    const key = `${item.id}:${item.start}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => a.start - b.start || a.end - b.end);
}
export async function downloadRoster(config, now = new Date(), doFetch = fetch) {
  if (!gatewayOrigin(config?.gateway) || !validProxyKey(config?.proxyKey))
    throw new Error('Vul eerst een geldige gateway en proxy key in.');
  const {from, to} = fetchRange(now);
  let response;
  try {
    response = await doFetch(scheduleUrl(config.gateway, from, to), {
      method: 'GET', headers: {Authorization: `Bearer ${config.proxyKey}`, Accept: 'application/json'},
      credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw new Error('De gateway is niet bereikbaar. Controleer het adres en de toestemming.');
  }
  if (response.status === 401 || response.status === 403) throw new Error('Geen toegang. Controleer of je proxy key nog geldig is.');
  if (!response.ok) throw new Error(`Magister ophalen is mislukt (HTTP ${response.status}).`);
  let json;
  try { json = await response.json(); }
  catch { throw new Error('De gateway stuurde geen geldige JSON terug.'); }
  return {items: parseAppointments(json), from, to, updatedAt: Date.now(), error: ''};
}
