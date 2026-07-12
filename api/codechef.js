/* Serverless mirror for CodeChef profile stats — deployed by Vercel as
   /api/codechef. Browsers can't read codechef.com directly (no CORS) and the
   public CORS mirrors are flaky, so the portfolio asks this endpoint first:
   it fetches the profile server-side and returns clean JSON. */

const HANDLE_RE = /^[A-Za-z0-9_.]{1,32}$/;

function starsFromRating(r) {
  return r < 1400 ? '1★' : r < 1600 ? '2★' : r < 1800 ? '3★'
    : r < 2000 ? '4★' : r < 2200 ? '5★' : r < 2500 ? '6★' : '7★';
}

// Every field is optional — whatever the page still exposes gets parsed, and
// the client merges fields across its sources.
function parseProfile(html) {
  const num = (m) => {
    if (!m) return null;
    const n = Number(String(m[1]).replace(/,/g, ''));
    return isFinite(n) && n > 0 ? Math.round(n) : null;
  };

  const rating = num(html.match(/class="rating-number"[^>]*>\s*([\d,]+)/));
  const highestRating = num(html.match(/Highest\s+Rating[^\d]{0,40}([\d,]+)/i));
  const solved = num(html.match(/Total\s+Problems\s+Solved\s*:?\s*([\d,]+)/i));

  const starsM = html.match(/class="rating"[^>]*>\s*(\d)\s*★/);
  const stars = starsM ? starsM[1] + '★' : (rating ? starsFromRating(rating) : null);

  // Daily submission counts power CodeChef's own profile heatmap; the page
  // embeds them as a JS array. Try the variable, then a shape-based fallback
  // that survives a variable rename.
  let heatMap = null;
  const heatM = html.match(/userDailySubmissionsStats\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (heatM) {
    try {
      const arr = JSON.parse(heatM[1]);
      if (Array.isArray(arr) && arr.length) heatMap = arr;
    } catch (e) { /* fall through to the shape scan */ }
  }
  if (!heatMap) {
    const pts = [...html.matchAll(/"date"\s*:\s*"(\d{4}-\d{2}-\d{2})"\s*,\s*"value"\s*:\s*(\d+)/g)]
      .map((m) => ({ date: m[1], value: Number(m[2]) }));
    if (pts.length) heatMap = pts;
  }

  return { rating, highestRating, stars, solved, heatMap };
}

async function fetchPage(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

// Fallback activity source: CodeChef's recent-submissions feed. Reconstructs
// daily submission counts from the last few pages when the profile page no
// longer embeds heatmap data. Returns [{ date, value }] or null.
async function recentDayMap(handle) {
  const pages = [0, 1, 2, 3, 4, 5];
  const results = await Promise.allSettled(pages.map((p) =>
    fetchPage('https://www.codechef.com/recent/user?user_handle=' + handle + '&page=' + p, 6000)
  ));

  const map = {};
  let any = false;
  const todayISO = new Date().toISOString().slice(0, 10);

  results.forEach((r) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    let content = r.value;
    try {
      const j = JSON.parse(content);
      content = j && j.content ? String(j.content) : '';
    } catch (e) { /* some deployments return raw HTML */ }
    if (!content) return;

    // Absolute timestamps: "hh:mm AM dd/mm/yy"
    for (const m of content.matchAll(/\d{1,2}:\d{2}\s*[AP]M\s+(\d{2})\/(\d{2})\/(\d{2})/g)) {
      const day = Number(m[1]), month = Number(m[2]);
      if (day < 1 || day > 31 || month < 1 || month > 12) continue;
      const d = '20' + m[3] + '-' + m[2] + '-' + m[1];
      map[d] = (map[d] || 0) + 1;
      any = true;
    }
    // Relative timestamps ("34 min ago") are today's submissions
    const rel = content.match(/\b\d+\s*(?:sec|min|hour)s?\s+ago\b/gi);
    if (rel) {
      map[todayISO] = (map[todayISO] || 0) + rel.length;
      any = true;
    }
  });

  if (!any) return null;
  return Object.keys(map).sort().map((d) => ({ date: d, value: map[d] }));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const handle = String((req.query && req.query.handle) || 'tanmay_kanani').trim();
  if (!HANDLE_RE.test(handle)) {
    res.status(400).json({ ok: false, error: 'invalid handle' });
    return;
  }

  let data = { rating: null, highestRating: null, stars: null, solved: null, heatMap: null };

  // Kick off the recent-submissions scan in parallel — it's the activity
  // fallback if the profile page doesn't embed heatmap data anymore.
  const recentPromise = recentDayMap(handle).catch(() => null);

  try {
    const html = await fetchPage('https://www.codechef.com/users/' + handle, 4500);
    data = parseProfile(html);
  } catch (e) { /* blocked or down — try the text mirror below */ }

  // If the direct fetch was blocked (e.g. a bot challenge), a text rendering
  // of the page still carries "Total Problems Solved: N" and the ratings.
  if (data.solved == null && data.rating == null) {
    try {
      const text = await fetchPage('https://r.jina.ai/https://www.codechef.com/users/' + handle, 3500);
      const alt = parseProfile(text);
      data = {
        rating: data.rating != null ? data.rating : alt.rating,
        highestRating: data.highestRating != null ? data.highestRating : alt.highestRating,
        stars: data.stars || alt.stars,
        solved: data.solved != null ? data.solved : alt.solved,
        heatMap: data.heatMap || alt.heatMap,
      };
    } catch (e) { /* nothing else to try */ }
  }

  if (!data.heatMap || !data.heatMap.length) {
    data.heatMap = await recentPromise;
  }

  if (data.rating == null && data.solved == null && !data.heatMap) {
    res.status(502).json({ ok: false, error: 'codechef unreachable' });
    return;
  }

  // Short edge cache: fresh enough to reflect a new solve/rating quickly,
  // while keeping CodeChef traffic minimal.
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=1200');
  res.status(200).json(Object.assign({ ok: true, handle: handle, fetchedAt: Date.now() }, data));
};

module.exports.parseProfile = parseProfile;
module.exports.recentDayMap = recentDayMap;
