/* Small shared helpers. Kept dependency-free on purpose. */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function jitter(min, max) {
  if (max <= min) return min;
  return Math.floor(min + Math.random() * (max - min));
}

export function nowIso() {
  return new Date().toISOString();
}

export function daysAgoIso(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function daysBetween(aIso, bIso = nowIso()) {
  if (!aIso) return Infinity;
  return (new Date(bIso) - new Date(aIso)) / 86_400_000;
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/* Strip protocol, www and path so "https://www.Acme.io/careers" and
   "acme.io" collapse to the same dedupe key. */
export function normalizeDomain(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  if (!s.includes('.') || s.length < 4) return null;
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  return s;
}

export function domainFromEmail(email) {
  const at = String(email || '').lastIndexOf('@');
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

export function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) ? e : null;
}

/* Slugified company name — a secondary dedupe key for records with no domain. */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    // NFKD splits "ö" into "o" + a combining mark; drop the marks, otherwise
    // the next rule turns them into separators and "föö" becomes "fo-o".
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s, n) {
  const str = String(s || '');
  return str.length <= n ? str : `${str.slice(0, n - 1).trimEnd()}…`;
}

export function titleCase(s) {
  return String(s || '')
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/* fetch() with a hard timeout and a response-size ceiling, so one slow or
   enormous page can never wedge a run. */
export async function fetchWithLimits(url, { timeoutMs = 12_000, maxBytes = 1_500_000, headers = {} } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers });
    if (!res.ok) return { ok: false, status: res.status, body: null, url: res.url };

    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > maxBytes) {
      return { ok: false, status: 413, body: null, url: res.url };
    }

    const reader = res.body?.getReader();
    if (!reader) return { ok: true, status: res.status, body: await res.text(), url: res.url };

    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { ok: true, status: res.status, body: buf.toString('utf8'), url: res.url };
  } catch (err) {
    return { ok: false, status: 0, body: null, error: err.message, url };
  } finally {
    clearTimeout(timer);
  }
}

/* Serialises requests per host with a politeness delay — a crawler that hits
   one site in a tight loop is a bad citizen and gets blocked anyway. */
export function createHostThrottle(delayMs) {
  const lastHit = new Map();
  return async function throttle(host) {
    const prev = lastHit.get(host) || 0;
    const wait = prev + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
  };
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* Repair text that was UTF-8 but got decoded as Latin-1 somewhere upstream —
   the corruption that turns "Éxito" into "Ã‰xito" and "€" into "â‚¬". Several
   job boards serve their feeds already damaged this way; our own decoding is
   correct, so this only ever runs on damage that arrived with the data.

   The signature is a Latin-1 high character (Â-Ã, â) followed
   by another high character — a sequence essentially absent from real text.
   The repair is kept only when the round-trip yields valid UTF-8. */
const MOJIBAKE_SIGNATURE = /[ÂÃâ][-¿]/;

export function repairMojibake(value) {
  if (typeof value !== 'string' || !value || !MOJIBAKE_SIGNATURE.test(value)) return value;
  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8');
    // A failed round-trip leaves U+FFFD replacement characters; keep the original.
    return repaired.includes('�') ? value : repaired;
  } catch {
    return value;
  }
}
