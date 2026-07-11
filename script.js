/* ==========================================================================
   THE LIVING CANVAS — Interactive Engine v2
   More responsive · More alive · More wow
   ========================================================================== */

// Respect the OS-level reduced-motion accessibility setting in every
// JS-driven animation (CSS animations are quieted in style.css).
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

document.addEventListener('DOMContentLoaded', () => {
  // Wait a tiny moment for GSAP deferred scripts to be ready
  requestAnimationFrame(() => {
    initCursor();
    initPreloader();
    initNavScroll();
    initScrollHint();
    initScrollReveal();
    initDonutCharts();
    initCounter();
    initLiveStats();
    initHeatmap();
    initTilt();
    initMagnetic();
    initOrbParallax();
    initTextScramble();
    initParallaxWords();
    initMarquee();
    initQuoteBand();
    initContactForm();
    initSmoothHoverLinks();
    initParticles();
    initCursorSpotlight();
    initClickRipple();
    initScrollProgress();
    initTimelineDraw();
  });
});

/* ==========================================================================
   1. MAGNETIC CURSOR BLOB — faster & more responsive
   ========================================================================== */
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  if (window.matchMedia('(pointer: coarse)').matches) {
    cursor.style.display = 'none';
    return;
  }

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  (function animate() {
    // Faster lerp = more responsive cursor
    pos.x += (mouse.x - pos.x) * 0.22;
    pos.y += (mouse.y - pos.y) * 0.22;
    cursor.style.left = pos.x + 'px';
    cursor.style.top = pos.y + 'px';
    requestAnimationFrame(animate);
  })();

  // Scale on hover
  const hoverTargets = document.querySelectorAll(
    'a, button, .project-card, .platform-card, .detail-card, .skill-pill, .contact-socials a, input, textarea, .hero-badge, .timeline-card, .nav-link'
  );
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

/* ==========================================================================
   2. HERO — SCATTERED LETTERS ASSEMBLY
   ========================================================================== */
function initHeroLetters() {
  const letters = document.querySelectorAll('#hero-name .letter');
  if (!letters.length) return;

  // Reduced motion: letters are already visible via CSS — skip the flight
  if (REDUCED_MOTION) return;

  // If GSAP not loaded, letters are already visible via CSS — do nothing
  if (typeof gsap === 'undefined') return;

  // Temporarily override: hide letters for animation
  letters.forEach((letter, i) => {
    letter.style.webkitTextFillColor = 'unset';
    letter.style.backgroundClip = 'unset';
    letter.style.webkitBackgroundClip = 'unset';
    letter.style.background = 'none';
    letter.style.animation = 'none';

    gsap.set(letter, {
      opacity: 0,
      y: gsap.utils.random(-250, 250),
      x: gsap.utils.random(-400, 400),
      rotation: gsap.utils.random(-120, 120),
      scale: 0,
      color: '#fafaf9',
    });
  });

  // Fly letters into position
  gsap.to(letters, {
    opacity: 1,
    y: 0,
    x: 0,
    rotation: 0,
    scale: 1,
    duration: 1.3,
    stagger: 0.045,
    ease: 'elastic.out(1, 0.55)',
    delay: 0.15,
    onComplete: () => {
      // Restore gradient effect on each letter now that they're in position
      letters.forEach((letter, i) => {
        letter.style.removeProperty('color');
        letter.style.removeProperty('background');
        letter.style.removeProperty('background-clip');
        letter.style.removeProperty('-webkit-background-clip');
        letter.style.removeProperty('-webkit-text-fill-color');
        letter.style.removeProperty('animation');
        // Stagger the gradient animation for a wave effect
        letter.style.animationDelay = (i * 0.15) + 's';
      });

      // Add subtle floating
      letters.forEach(letter => {
        gsap.to(letter, {
          y: gsap.utils.random(-4, 4),
          duration: gsap.utils.random(2, 4),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      });
    },
  });

  // Hover interaction on individual letters
  letters.forEach(letter => {
    letter.addEventListener('mouseenter', () => {
      gsap.to(letter, { scale: 1.3, duration: 0.2, ease: 'power2.out' });
    });
    letter.addEventListener('mouseleave', () => {
      gsap.to(letter, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // Animate hero sub-elements with staggered entrance
  gsap.from('.hero-tagline', { opacity: 0, y: 25, duration: 0.8, delay: 0.9, ease: 'power3.out' });
  gsap.from('.hero-badges .hero-badge', { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, delay: 1.1, ease: 'power3.out' });
  gsap.from('.hero-ctas', { opacity: 0, y: 20, duration: 0.8, delay: 1.4, ease: 'power3.out' });
  gsap.from('.scroll-hint', { opacity: 0, duration: 0.8, delay: 1.8 });
}

/* ==========================================================================
   2b. INTRO PRELOADER — name reveal that lifts to reveal the hero
   ========================================================================== */
function initPreloader() {
  const pre = document.getElementById('preloader');
  if (!pre) { initHeroLetters(); return; }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    initHeroLetters();              // hero animates in as the curtain lifts
    pre.classList.add('done');
    setTimeout(() => { pre.style.display = 'none'; }, 900);
  };

  // Only play the full intro once per session (skip on refresh / back-nav)
  try {
    if (sessionStorage.getItem('tk_intro')) {
      pre.style.display = 'none';
      initHeroLetters();
      return;
    }
    sessionStorage.setItem('tk_intro', '1');
  } catch (e) { /* storage blocked — just play it */ }

  // Split each line into letters for a staggered rise (keep the accent dot)
  const letters = [];
  pre.querySelectorAll('.pl-line').forEach(line => {
    const frag = document.createDocumentFragment();
    [...line.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        node.textContent.split('').forEach(ch => {
          const s = document.createElement('span');
          s.className = 'pl-letter';
          s.textContent = ch;
          frag.appendChild(s);
          letters.push(s);
        });
      } else {
        frag.appendChild(node);
        letters.push(node);
      }
    });
    line.innerHTML = '';
    line.appendChild(frag);
  });

  // Hard safety: never let the preloader linger if something stalls
  setTimeout(finish, 4500);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof gsap === 'undefined') {
    setTimeout(finish, reduced ? 350 : 1300);
    return;
  }

  gsap.set(letters, { yPercent: 115, opacity: 0 });
  gsap.timeline({ onComplete: finish })
    .to(letters, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.035, ease: 'power3.out' }, 0.15)
    .to({}, { duration: 0.25 }); // brief hold before the curtain lifts
}

/* ==========================================================================
   3. NAVIGATION — Scroll + Mobile Menu + Active Link
   ========================================================================== */
function initNavScroll() {
  const nav = document.getElementById('main-nav');
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  // Glassmorphism on scroll
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 50) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }

        // Active link
        let current = '';
        sections.forEach(sec => {
          if (window.scrollY >= sec.offsetTop - 200) {
            current = sec.id;
          }
        });
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });

        ticking = false;
      });
      ticking = true;
    }
  });

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.body.classList.remove('nav-open');
      }
    });
  });

  // Mobile menu: toggle + close interactions
  const navLinksEl = document.getElementById('nav-links');
  const closeMenu = () => document.body.classList.remove('nav-open');

  if (hamburger) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.toggle('nav-open');
    });
  }
  // Tap the dark overlay area (anywhere that isn't a link) to close
  if (navLinksEl) {
    navLinksEl.addEventListener('click', (e) => {
      if (e.target === navLinksEl) closeMenu();
    });
  }
  // Tapping any menu entry (including the Résumé button) closes it too
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', closeMenu));
  // Escape closes
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

/* ==========================================================================
   4. SCROLL HINT FADE
   ========================================================================== */
function initScrollHint() {
  const hint = document.getElementById('scroll-hint');
  if (!hint) return;
  let hidden = false;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 150 && !hidden) {
      hidden = true;
      hint.style.transition = 'opacity 0.5s, transform 0.5s';
      hint.style.opacity = '0';
      hint.style.transform = 'translateY(10px)';
    }
  });
}

/* ==========================================================================
   5. SCROLL REVEAL — GSAP ScrollTrigger (with safety fallback)
   ========================================================================== */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-up');
  if (!elements.length) return;

  // Reduced motion: content appears in place, no slide/fade choreography
  if (REDUCED_MOTION) {
    elements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  // Safety fallback: if GSAP doesn't work, force everything visible after 3s
  const safetyTimer = setTimeout(() => {
    elements.forEach(el => {
      if (getComputedStyle(el).opacity === '0' || el.style.opacity === '0') {
        el.style.transition = 'opacity 0.5s, transform 0.5s';
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }, 3000);

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // No GSAP at all — just show everything now
    elements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    clearTimeout(safetyTimer);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  elements.forEach(el => {
    // Set initial hidden state via GSAP (not CSS)
    gsap.set(el, { y: 40, opacity: 0 });

    // Animate to visible when scrolled into view
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.to(el, {
          y: 0,
          opacity: 1,
          duration: 0.75,
          ease: 'power3.out',
        });
      },
    });
  });

  // Clear safety timer since GSAP is working
  // (Keep it as extra insurance — it checks computed style anyway)
}

/* ==========================================================================
   6. DONUT CHARTS — Animate on Scroll
   ========================================================================== */
function initDonutCharts() {
  const donuts = document.querySelectorAll('.donut-fill');
  const circumference = 2 * Math.PI * 50; // r=50 → ~314.16

  donuts.forEach(circle => {
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference; // fully hidden initially

    // Read data-value/data-max at reveal time, not at page load — live data
    // may already have updated them, and animating to a value captured
    // earlier would revert the ring to the stale number.
    const reveal = () => {
      circle.dataset.revealed = '1';
      const value = parseFloat(circle.getAttribute('data-value')) || 0;
      const max = parseFloat(circle.getAttribute('data-max')) || 1;
      const targetOffset = circumference * (1 - Math.min(value / max, 1));
      if (typeof gsap !== 'undefined' && !REDUCED_MOTION) {
        gsap.to(circle, { strokeDashoffset: targetOffset, duration: 1.8, ease: 'power3.out', delay: 0.15 });
      } else {
        circle.style.strokeDashoffset = targetOffset;
      }
    };

    // Animate when scrolling into view
    const card = circle.closest('.platform-card');
    if (card && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({ trigger: card, start: 'top 85%', once: true, onEnter: reveal });
    } else {
      setTimeout(reveal, 800);
    }
  });
}

function updateDonut(circleId, textId, value, max) {
  const circle = document.getElementById(circleId);
  const text = document.getElementById(textId);
  if (!circle) return;

  circle.setAttribute('data-value', value);
  circle.setAttribute('data-max', max);
  if (text) text.textContent = value;

  // Before the scroll-in reveal only record the numbers — the reveal
  // animation reads them and fills the ring itself.
  if (circle.dataset.revealed !== '1') return;

  const circumference = 2 * Math.PI * 50;
  const targetOffset = circumference * (1 - Math.min(value / max, 1));

  if (typeof gsap !== 'undefined' && !REDUCED_MOTION) {
    gsap.to(circle, { strokeDashoffset: targetOffset, duration: 1.5, ease: 'power3.out' });
  } else {
    circle.style.strokeDashoffset = targetOffset;
  }
}

/* ==========================================================================
   7. LIVE STATS DATA — handles, last-real-value cache, total counter
   ========================================================================== */
const HANDLES = { lc: 'Tanmay_Kanani', cf: 'tanmay.k', cc: 'tanmay_kanani' };

// Last-resort seeds, shown only until real data (live, or cached from a
// previous visit) takes over. A live value ALWAYS wins once its API answers.
const statsData = {
  lcSolved: 497,
  cfSolved: 516,
  ccSolved: 131,
  lcRating: 1653,
  lcPercentile: 'Top 18%',
  cfRating: 1164,
  cfRank: 'Newbie',
  ccRating: 1424,
  ccStars: '2★',
  activeDays: 0,
  totalSolvesYear: 0
};

// The last REAL numbers each platform returned, kept in localStorage. When an
// API is down we show these instead of the baked-in seeds — never invented data.
const STATS_CACHE_KEY = 'tk_live_stats_v2';

function loadStatsCache() {
  try {
    const c = JSON.parse(localStorage.getItem(STATS_CACHE_KEY) || '{}');
    return c && typeof c === 'object' ? c : {};
  } catch (e) { return {}; }
}

function saveStatsCache(platform, patch) {
  try {
    if (patch.days) patch = Object.assign({}, patch, { days: trimDayMap(patch.days) });
    const c = loadStatsCache();
    c[platform] = Object.assign({}, c[platform], patch, { ts: Date.now() });
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(c));
  } catch (e) { /* storage blocked — live-only mode */ }
}

// Keep cached activity maps to roughly the heatmap window so the cache stays small.
function trimDayMap(days) {
  const out = {};
  const cutoff = Date.now() - 380 * 86400000;
  Object.keys(days).forEach(d => {
    const t = Date.parse(d + 'T00:00:00Z');
    if (isFinite(t) && t >= cutoff) out[d] = days[d];
  });
  return out;
}

let totalSolvedCounterTriggered = false;

function initCounter() {
  const el = document.getElementById('total-solved');
  if (!el) return;

  function countUp() {
    if (totalSolvedCounterTriggered) return;
    totalSolvedCounterTriggered = true;
    const target = statsData.lcSolved + statsData.cfSolved + statsData.ccSolved;
    if (REDUCED_MOTION) { el.textContent = target; return; }
    const duration = 2200;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({ trigger: '.stats-hero', start: 'top 80%', once: true, onEnter: countUp });
  } else {
    setTimeout(countUp, 1200);
  }
}

function updateTotalSolved() {
  const el = document.getElementById('total-solved');
  if (!el || !totalSolvedCounterTriggered) return; // the scroll trigger paints it later
  const total = statsData.lcSolved + statsData.cfSolved + statsData.ccSolved;
  if (typeof gsap !== 'undefined' && !REDUCED_MOTION) {
    gsap.to(el, { innerText: total, duration: 1.2, snap: { innerText: 1 }, ease: 'power2.out' });
  } else {
    el.textContent = total;
  }
}

/* ==========================================================================
   8. REAL-TIME STATS — LEETCODE, CODEFORCES & CODECHEF
   Fetched fresh on every visit (cache: no-store) and re-fetched while the
   page stays open, so a rating or solved-count change on any platform shows
   up right away. A platform that fails to answer falls back to its own last
   real cached values — a live answer always replaces what's on screen.
   ========================================================================== */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fetchFresh(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { signal: ctl.signal, cache: 'no-store' })
    .finally(() => clearTimeout(timer));
}
async function fetchJSON(url, ms) {
  const r = await fetchFresh(url, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function fetchText(url, ms) {
  const r = await fetchFresh(url, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

// A stat is only accepted as a positive finite number — a glitchy API
// response can never paint a bogus zero or NaN.
function posInt(v) {
  const n = Number(v);
  return isFinite(n) && n > 0 ? Math.round(n) : null;
}

// UTC YYYY-MM-DD for a unix-seconds timestamp (matches the platforms' keys)
function isoDayUTC(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

// Activity maps ({ 'YYYY-MM-DD': submissions }) fetched live this session.
const liveDays = { lc: null, cf: null, cc: null };
// Per-platform activity fetch state, driving the heatmap sources line.
const sourceState = { lc: 'pending', cf: 'pending', cc: 'pending' };

async function refreshLeetCode() {
  const base = 'https://alfa-leetcode-api.onrender.com/' + HANDLES.lc;
  let solvedOK = false, calendarOK = false;

  const applySolved = (n) => {
    solvedOK = true;
    statsData.lcSolved = n;
    updateDonut('lc-donut-fill', 'lc-solved-donut', n, 700);
    updateTotalSolved();
    saveStatsCache('lc', { solved: n });
  };
  // LeetCode's submission calendar is { unixSeconds: count }, sometimes
  // JSON-encoded as a string; normalize it into a per-day map.
  const applyCalendar = (cal) => {
    if (typeof cal === 'string') { try { cal = JSON.parse(cal); } catch (e) { return; } }
    if (!cal || typeof cal !== 'object') return;
    const map = {};
    Object.keys(cal).forEach(ts => {
      const n = Number(cal[ts]);
      const sec = Number(ts);
      if (n > 0 && isFinite(sec)) {
        const d = isoDayUTC(sec);
        map[d] = (map[d] || 0) + n;
      }
    });
    if (!Object.keys(map).length) return;
    calendarOK = true;
    liveDays.lc = map;
    saveStatsCache('lc', { days: map });
  };

  const results = await Promise.allSettled([
    fetchJSON(base + '/solved', 20000).then(d => {
      const n = posInt(d && (d.solvedProblem !== undefined ? d.solvedProblem : d.totalSolved));
      if (n) applySolved(n);
    }),
    fetchJSON(base + '/contest', 20000).then(d => {
      const rating = posInt(d && d.contestRating);
      if (rating) {
        statsData.lcRating = rating;
        setText('lc-rating', rating);
        saveStatsCache('lc', { rating: rating });
      }
      const pct = Number(d && d.contestTopPercentage);
      if (isFinite(pct) && pct > 0) {
        statsData.lcPercentile = 'Top ' + (Math.round(pct * 10) / 10) + '%';
        setText('lc-percentile', statsData.lcPercentile);
        saveStatsCache('lc', { pct: statsData.lcPercentile });
      }
    }),
    fetchJSON(base + '/calendar', 20000).then(d => {
      applyCalendar(d && (d.submissionCalendar
        || (d.data && d.data.submissionCalendar)
        || (d.data && d.data.matchedUser && d.data.matchedUser.userCalendar && d.data.matchedUser.userCalendar.submissionCalendar)));
    }),
  ]);
  results.forEach(r => { if (r.status === 'rejected') console.log('LeetCode API:', r.reason && r.reason.message); });

  // Backup mirror — one call covers solved + calendar if the primary is down.
  if (!solvedOK || !calendarOK) {
    try {
      const d = await fetchJSON('https://leetcode-api-faisalshohag.vercel.app/' + HANDLES.lc, 15000);
      if (!solvedOK) { const n = posInt(d && d.totalSolved); if (n) applySolved(n); }
      if (!calendarOK && d) applyCalendar(d.submissionCalendar);
    } catch (e) { console.log('LeetCode backup API:', e.message); }
  }

  sourceState.lc = calendarOK ? 'live' : 'failed';
  scheduleHeatmapRender();
}

async function refreshCodeforces() {
  try {
    const info = await fetchJSON('https://codeforces.com/api/user.info?handles=' + HANDLES.cf, 12000);
    if (info.status === 'OK' && Array.isArray(info.result) && info.result[0]) {
      const u = info.result[0];
      const rating = posInt(u.rating);
      if (rating) {
        statsData.cfRating = rating;
        setText('cf-rating', rating);
        saveStatsCache('cf', { rating: rating });
      }
      if (typeof u.rank === 'string' && u.rank) {
        statsData.cfRank = u.rank.charAt(0).toUpperCase() + u.rank.slice(1);
        saveStatsCache('cf', { rank: statsData.cfRank });
      }
      const rankEl = document.getElementById('cf-rank');
      if (rankEl) {
        rankEl.textContent = statsData.cfRank;
        rankEl.style.color = cfColor(statsData.cfRating);
      }
    }
  } catch (e) { console.log('Codeforces info API:', e.message); }

  // ONE submissions call feeds both the solved donut and the heatmap —
  // the previous two parallel identical calls could trip Codeforces'
  // rate limiter and randomly lose one of the two.
  try {
    const st = await fetchJSON('https://codeforces.com/api/user.status?handle=' + HANDLES.cf, 20000);
    if (st.status !== 'OK' || !Array.isArray(st.result)) throw new Error('bad response');
    const solvedSet = new Set();
    const map = {};
    st.result.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem) {
        solvedSet.add(sub.problem.contestId + '-' + sub.problem.index);
      }
      const d = isoDayUTC(sub.creationTimeSeconds);
      map[d] = (map[d] || 0) + 1;
    });
    if (solvedSet.size > 0) {
      statsData.cfSolved = solvedSet.size;
      updateDonut('cf-donut-fill', 'cf-solved-donut', statsData.cfSolved, 800);
      updateTotalSolved();
      saveStatsCache('cf', { solved: statsData.cfSolved });
    }
    liveDays.cf = map;
    saveStatsCache('cf', { days: map });
    sourceState.cf = 'live';
  } catch (e) {
    sourceState.cf = 'failed';
    console.log('Codeforces submissions API:', e.message);
  }
  scheduleHeatmapRender();
}

async function refreshCodeChef() {
  const got = { rating: false, stars: false, solved: false, heat: false };

  // Apply whichever fields a source managed to provide; earlier (more
  // reliable) sources win per field, later ones only fill gaps.
  const applyCC = (src) => {
    if (!src) return;
    const rating = posInt(src.rating !== undefined ? src.rating : src.currentRating);
    if (!got.rating && rating) {
      got.rating = true;
      statsData.ccRating = rating;
      setText('cc-rating', rating);
      saveStatsCache('cc', { rating: rating });
    }
    const stars = (typeof src.stars === 'string' && src.stars.trim()) ? src.stars.trim() : null;
    if (!got.stars && stars) {
      got.stars = true;
      statsData.ccStars = stars;
      setText('cc-rank', stars);
      saveStatsCache('cc', { stars: stars });
    }
    const solved = posInt(src.solved);
    if (!got.solved && solved) {
      got.solved = true;
      statsData.ccSolved = solved;
      updateDonut('cc-donut-fill', 'cc-solved-donut', solved, 300);
      updateTotalSolved();
      saveStatsCache('cc', { solved: solved });
    }
    if (!got.heat && Array.isArray(src.heatMap)) {
      const map = {};
      src.heatMap.forEach(pt => {
        if (!pt || typeof pt.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(pt.date)) return;
        const n = Number(pt.value !== undefined ? pt.value : pt.count);
        if (n > 0) {
          const day = pt.date.slice(0, 10);
          map[day] = (map[day] || 0) + n;
        }
      });
      if (Object.keys(map).length) {
        got.heat = true;
        liveDays.cc = map;
        saveStatsCache('cc', { days: map });
      }
    }
  };

  // Source 1: this site's own serverless mirror (api/codechef.js, deployed by
  // Vercel alongside the page) — same origin, no third parties involved.
  try {
    applyCC(await fetchJSON('/api/codechef?handle=' + HANDLES.cc, 15000));
  } catch (e) { console.log('CodeChef own API:', e.message); }

  // Source 2: community CodeChef API — rating, stars and activity heatmap.
  if (!got.rating || !got.stars || !got.heat) {
    try {
      const d = await fetchJSON('https://codechef-api.vercel.app/handle/' + HANDLES.cc, 20000);
      if (d && d.success !== false) applyCC(d);
    } catch (e) { console.log('CodeChef community API:', e.message); }
  }

  // Source 3: the public profile page through CORS-friendly mirrors.
  if (!got.solved || !got.rating) {
    const target = 'https://www.codechef.com/users/' + HANDLES.cc;
    const mirrors = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(target),
      'https://r.jina.ai/' + target,
    ];
    for (let i = 0; i < mirrors.length && (!got.solved || !got.rating); i++) {
      try {
        const html = await fetchText(mirrors[i], 20000);
        if (!/Total\s+Problems\s+Solved|rating-number/i.test(html)) continue; // mirror junk
        const solvedM = html.match(/Total\s+Problems\s+Solved\s*:?\s*([\d,]+)/i);
        const ratingM = html.match(/class="rating-number"[^>]*>\s*([\d,]+)/);
        const starsM = html.match(/class="rating"[^>]*>\s*(\d)\s*★/);
        applyCC({
          solved: solvedM ? solvedM[1].replace(/,/g, '') : undefined,
          rating: ratingM ? ratingM[1].replace(/,/g, '') : undefined,
          stars: starsM ? starsM[1] + '★' : undefined,
        });
      } catch (e) { console.log('CodeChef mirror:', e.message); }
    }
  }

  sourceState.cc = got.heat ? 'live' : 'failed';
  scheduleHeatmapRender();
}

let statsRefreshing = false;
let lastStatsRefresh = 0;

async function refreshAllStats() {
  if (statsRefreshing) return;
  statsRefreshing = true;
  try {
    await Promise.allSettled([refreshLeetCode(), refreshCodeforces(), refreshCodeChef()]);
  } finally {
    statsRefreshing = false;
    lastStatsRefresh = Date.now();
    scheduleHeatmapRender();
  }
}

function initLiveStats() {
  // Seed the UI with the last real values from a previous visit (the baked-in
  // seeds only apply when there's no cache yet)…
  const c = loadStatsCache();
  const lc = c.lc || {}, cf = c.cf || {}, cc = c.cc || {};
  if (lc.solved) statsData.lcSolved = lc.solved;
  if (lc.rating) statsData.lcRating = lc.rating;
  if (lc.pct) statsData.lcPercentile = lc.pct;
  if (cf.solved) statsData.cfSolved = cf.solved;
  if (cf.rating) statsData.cfRating = cf.rating;
  if (cf.rank) statsData.cfRank = cf.rank;
  if (cc.solved) statsData.ccSolved = cc.solved;
  if (cc.rating) statsData.ccRating = cc.rating;
  if (cc.stars) statsData.ccStars = cc.stars;

  updateDonut('lc-donut-fill', 'lc-solved-donut', statsData.lcSolved, 700);
  updateDonut('cf-donut-fill', 'cf-solved-donut', statsData.cfSolved, 800);
  updateDonut('cc-donut-fill', 'cc-solved-donut', statsData.ccSolved, 300);
  setText('lc-rating', statsData.lcRating);
  setText('lc-percentile', statsData.lcPercentile);
  setText('cf-rating', statsData.cfRating);
  setText('cc-rating', statsData.ccRating);
  setText('cc-rank', statsData.ccStars);
  const cfRankEl = document.getElementById('cf-rank');
  if (cfRankEl) {
    cfRankEl.textContent = statsData.cfRank;
    cfRankEl.style.color = cfColor(statsData.cfRating);
  }

  // …then fetch live values now, and keep them fresh while the page is open.
  refreshAllStats();
  setInterval(refreshAllStats, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastStatsRefresh > 5 * 60 * 1000) refreshAllStats();
  });
}

function cfColor(r) { return r < 1200 ? '#808080' : r < 1400 ? '#00c853' : r < 1600 ? '#03a9f4' : r < 1900 ? '#aa00ff' : '#ff8f00'; }

/* ==========================================================================
   9. HEATMAP — GitHub-style grid of REAL LeetCode + Codeforces + CodeChef
   activity. Each platform shows live data, or its own last real cached data
   if its API is down. Fabricated filler is never used — if nothing has
   loaded yet the grid stays empty and says so.
   ========================================================================== */
// Best available activity map per platform: live this session, else cached.
function heatmapSourceMaps() {
  const cache = loadStatsCache();
  const pick = (k) => liveDays[k] || (cache[k] || {}).days || null;
  return { lc: pick('lc'), cf: pick('cf'), cc: pick('cc') };
}

function mergeDayMaps(maps) {
  const merged = {};
  let any = false;
  Object.keys(maps).forEach(k => {
    if (!maps[k]) return;
    any = true;
    Object.keys(maps[k]).forEach(d => { merged[d] = (merged[d] || 0) + maps[k][d]; });
  });
  return any ? merged : null;
}

function heatmapSourcesLabel(maps) {
  const names = { lc: 'LeetCode', cf: 'Codeforces', cc: 'CodeChef' };
  return ['lc', 'cf', 'cc'].map(k => {
    if (sourceState[k] === 'live') return names[k] + ': live';
    if (sourceState[k] === 'pending') return names[k] + ': syncing…';
    return names[k] + ': ' + (maps[k] ? 'cached' : 'unavailable');
  }).join(' · ');
}

let heatmapRenderTimer = null;
function scheduleHeatmapRender() {
  clearTimeout(heatmapRenderTimer);
  heatmapRenderTimer = setTimeout(renderHeatmapFromSources, 250);
}

function renderHeatmapFromSources() {
  if (!document.getElementById('heatmap-grid')) return;
  const maps = heatmapSourceMaps();
  const merged = mergeDayMaps(maps);
  setText('heatmap-sources', heatmapSourcesLabel(maps));
  renderHeatmap(merged || {}, !!merged);
}

// Render the grid + stats from a { 'YYYY-MM-DD': count } map.
function renderHeatmap(daysMap, hasData) {
  const grid = document.getElementById('heatmap-grid');
  const monthsRow = document.getElementById('heatmap-months');
  if (!grid || !monthsRow) return;

  const MS_DAY = 86400000;
  const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Range: ~52 weeks ending today (UTC), columns aligned to a Sunday start.
  const t = new Date();
  const endUTC = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const back = endUTC - 7 * 51 * MS_DAY;
  const startUTC = back - new Date(back).getUTCDay() * MS_DAY;

  const days = [];
  for (let ms = startUTC; ms <= endUTC; ms += MS_DAY) {
    const date = new Date(ms);
    const count = daysMap[date.toISOString().slice(0, 10)] || 0;
    days.push({ date, count });
  }

  // Stats
  let total = 0, active = 0, maxStreak = 0, run = 0, maxCount = 0;
  days.forEach(d => {
    total += d.count;
    if (d.count > maxCount) maxCount = d.count;
    if (d.count > 0) { active++; run++; if (run > maxStreak) maxStreak = run; }
    else run = 0;
  });
  // Current streak counts back from today — or from yesterday when today has
  // no submissions yet, because a day that isn't over can't break the streak.
  let currentStreak = 0;
  let idx = days.length - 1;
  if (idx >= 0 && days[idx].count === 0) idx--;
  for (; idx >= 0 && days[idx].count > 0; idx--) currentStreak++;

  if (hasData) {
    countTo('heatmap-total-solves', total);
    countTo('heatmap-max-streak', maxStreak);
    countTo('heatmap-current-streak', currentStreak);
    countTo('heatmap-active-days', active);
    statsData.activeDays = active;
    statsData.totalSolvesYear = total;
  } else {
    // Nothing real to show yet — say so instead of inventing numbers.
    ['heatmap-total-solves', 'heatmap-max-streak', 'heatmap-current-streak', 'heatmap-active-days']
      .forEach(id => setText(id, '—'));
  }

  // Level buckets scaled to the user's own busiest day (GitHub-style)
  const level = (c) => {
    if (c <= 0) return 0;
    if (maxCount <= 0) return 1;
    const r = c / maxCount;
    return r > 0.66 ? 4 : r > 0.33 ? 3 : r > 0.12 ? 2 : 1;
  };

  // Group into week columns (Sun -> Sat); pad the current partial week.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const wk = days.slice(i, i + 7);
    while (wk.length < 7) wk.push(null);
    weeks.push(wk);
  }

  // Month labels: one slot per week, set when a new month first appears.
  monthsRow.innerHTML = '';
  let lastMonth = -1;
  weeks.forEach(wk => {
    const span = document.createElement('span');
    const first = wk.find(Boolean);
    if (first) {
      const m = first.date.getUTCMonth();
      if (m !== lastMonth && first.date.getUTCDate() <= 7) {
        span.textContent = mNames[m];
        lastMonth = m;
      }
    }
    monthsRow.appendChild(span);
  });

  // Cells column-major so each grid column is one week.
  grid.innerHTML = '';
  weeks.forEach(wk => {
    wk.forEach(cell => {
      const el = document.createElement('span');
      if (!cell) {
        el.dataset.level = '-1';
        el.className = 'empty';
      } else {
        el.dataset.level = level(cell.count);
        const ds = cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        el.title = hasData
          ? (cell.count === 0 ? 'No submissions' : cell.count + (cell.count === 1 ? ' submission' : ' submissions')) + ' — ' + ds
          : ds;
      }
      grid.appendChild(el);
    });
  });
}

function initHeatmap() {
  // Instant paint from the last real data (repeat visits render immediately);
  // the live fetches kicked off by initLiveStats() upgrade it as they answer.
  renderHeatmapFromSources();
}

// Smooth count-up for the stat numbers; animates from the current value so the
// fallback -> live upgrade transitions cleanly. A token cancels stale loops.
function countTo(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const token = (parseInt(el.dataset.ctToken || '0', 10) + 1);
  el.dataset.ctToken = String(token);
  if (REDUCED_MOTION) { el.textContent = target.toLocaleString(); return; }
  const startVal = parseInt((el.textContent || '0').replace(/[^0-9-]/g, ''), 10) || 0;
  const dur = 1400, t0 = performance.now();
  (function step(now) {
    if (el.dataset.ctToken !== String(token)) return; // superseded
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(startVal + (target - startVal) * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  })(t0);
}

/* ==========================================================================
   10. 3D TILT EFFECT on [data-tilt]
   ========================================================================== */
function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = -((e.clientY - cy) / (rect.height / 2)) * 5;
      const ry = ((e.clientX - cx) / (rect.width / 2)) * 5;
      el.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
      setTimeout(() => { el.style.transition = ''; }, 500);
    });
  });
}

/* ==========================================================================
   11. MAGNETIC SKILL PILLS [data-magnetic]
   ========================================================================== */
function initMagnetic() {
  if (typeof gsap === 'undefined') return;

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      gsap.to(el, { x: dx * 0.4, y: dy * 0.4, duration: 0.25, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ==========================================================================
   12. ORB PARALLAX — Orbs drift away from cursor
   ========================================================================== */
function initOrbParallax() {
  const orbs = document.querySelectorAll('.orb');
  if (!orbs.length || REDUCED_MOTION) return;

  const mults = [{ x: -18, y: -12 }, { x: 14, y: 18 }, { x: -10, y: 14 }];

  window.addEventListener('mousemove', e => {
    const px = (e.clientX / window.innerWidth - 0.5) * 2;
    const py = (e.clientY / window.innerHeight - 0.5) * 2;

    orbs.forEach((orb, i) => {
      const m = mults[i] || { x: 10, y: 10 };
      if (typeof gsap !== 'undefined') {
        gsap.to(orb, { x: px * m.x, y: py * m.y, duration: 1.0, ease: 'power2.out' });
      } else {
        orb.style.transform = 'translate(' + (px * m.x) + 'px,' + (py * m.y) + 'px)';
      }
    });
  });
}

/* ==========================================================================
   13. TEXT SCRAMBLE — Section labels scramble on scroll into view
   ========================================================================== */
function initTextScramble() {
  // Reduced motion: leave every label as plain, stable text
  if (REDUCED_MOTION) return;

  // Glitchy, code-like glyphs (lots of underscores so it reads like decoding)
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  function scramble(el, delay = 0, speed = 1) {
    const original = el.dataset.scrambleText || el.textContent;
    el.dataset.scrambleText = original;
    const len = original.length;
    if (el._scrambleTimer) clearInterval(el._scrambleTimer);
    if (el._scrambleDelay) clearTimeout(el._scrambleDelay);
    el._scrambleDelay = setTimeout(() => {
      let iteration = 0;
      el._scrambleTimer = setInterval(() => {
        el.textContent = original.split('').map((char, idx) => {
          if (char === ' ' || char === '—' || char === '/') return char;
          if (idx < iteration) return original[idx];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        iteration += speed;
        if (iteration >= len) {
          el.textContent = original;
          clearInterval(el._scrambleTimer);
          el._scrambleTimer = null;
        }
      }, 35);
    }, delay);
  }

  // Give skill names a per-group stagger index so they decode in a cascade
  document.querySelectorAll('.skill-group').forEach(group => {
    group.querySelectorAll('[data-scramble]').forEach((el, i) => { el.dataset.sidx = i; });
  });

  // Re-scramble a skill name whenever its row is hovered (the v2 effect)
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const hoverTarget = el.closest('.skill-item') || el;
    hoverTarget.addEventListener('mouseenter', () => scramble(el, 0, 0.5));
  });

  // Decode once when scrolled into view
  const targets = document.querySelectorAll('.section-label, [data-scramble]');
  if (typeof IntersectionObserver !== 'undefined') {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.hasAttribute('data-scramble') ? (parseInt(el.dataset.sidx || '0', 10) * 55) : 0;
          scramble(el, delay, 1);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    targets.forEach(t => obs.observe(t));
  }
}

/* ==========================================================================
   13b. PARALLAX WORDS — big lines slide horizontally as you scroll
   ========================================================================== */
function initParallaxWords() {
  const section = document.querySelector('.parallax-words');
  if (!section) return;
  const lines = section.querySelectorAll('.pw-line');
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  lines.forEach(line => {
    const from = parseFloat(line.dataset.pwFrom) || 0;
    const to = parseFloat(line.dataset.pwTo) || 0;
    gsap.fromTo(line,
      { xPercent: from },
      {
        xPercent: to,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });
}

/* ==========================================================================
   13c. MARQUEE — infinite running ticker that reacts to scroll velocity
   ========================================================================== */
function initMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;

  const items = ['Software Engineer', 'Competitive Programmer', 'Full-stack Builder', 'Problem Solver', 'Open to work'];
  // duplicate the list so a -50% loop is seamless
  const content = [...items, ...items];
  track.innerHTML = content.map((item, i) =>
    `<span class="marquee-item${i % 2 ? ' alt' : ''}">${item}<span class="marquee-star">✦</span></span>`
  ).join('');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // If GSAP is available, drive the loop with it so we can speed up on scroll.
  if (typeof gsap !== 'undefined') {
    track.closest('.marquee').classList.add('gsap-driven'); // disable the CSS fallback animation
    const tween = gsap.to(track, { xPercent: -50, duration: 24, ease: 'none', repeat: -1 });

    let timeout;
    window.addEventListener('scroll', () => {
      gsap.to(tween, { timeScale: 4, duration: 0.3, overwrite: true });
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true });
      }, 120);
    }, { passive: true });
  }
  // Otherwise the CSS `marquee-scroll` keyframes keep it moving.
}

/* ==========================================================================
   13d. QUOTE BAND — rotating motivational quotes with a decode effect
   ========================================================================== */
function initQuoteBand() {
  const textEl = document.getElementById('quote-text');
  const attrEl = document.getElementById('quote-attr');
  const dotsEl = document.getElementById('quote-dots');
  const band = document.getElementById('quote-band');
  if (!textEl || !attrEl || !band) return;

  const QUOTES = [
    { text: 'Pressure is a privilege.', by: 'Billie Jean King' },
    { text: 'Keep learning until the “L” goes silent.', by: null },
    { text: 'The real competition is with yourself.', by: null },
    { text: 'Motivation gets you started. Habit keeps you going.', by: null },
  ];

  const CHARS = '!<>-_\\/[]{}—=+*^?#________';
  let idx = 0, rotateTimer = null, decodeTimer = null, inView = false;

  function show(i, decode) {
    idx = ((i % QUOTES.length) + QUOTES.length) % QUOTES.length;
    const q = QUOTES[idx];
    attrEl.textContent = q.by ? '— ' + q.by : '';
    if (dotsEl) {
      [].forEach.call(dotsEl.children, (d, j) => {
        d.classList.toggle('active', j === idx);
        if (j === idx) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    if (decodeTimer) { clearInterval(decodeTimer); decodeTimer = null; }
    if (!decode || REDUCED_MOTION) { textEl.textContent = q.text; return; }

    // Decode in ~1s regardless of quote length
    const target = q.text;
    const step = Math.max(1, Math.round(target.length / 28));
    let it = 0;
    decodeTimer = setInterval(() => {
      textEl.textContent = target.split('').map((ch, k) => {
        if (ch === ' ') return ' ';
        if (k < it) return target[k];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      it += step;
      if (it >= target.length) {
        textEl.textContent = target;
        clearInterval(decodeTimer);
        decodeTimer = null;
      }
    }, 35);
  }

  function schedule() {
    clearInterval(rotateTimer);
    rotateTimer = setInterval(() => { if (inView) show(idx + 1, true); }, 7000);
  }

  if (dotsEl) {
    QUOTES.forEach((q, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show quote ' + (j + 1) + ' of ' + QUOTES.length);
      b.addEventListener('click', () => { show(j, true); schedule(); });
      dotsEl.appendChild(b);
    });
  }

  // Rotate only while the band is on screen
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0.25 }).observe(band);
  } else {
    inView = true;
  }

  show(0, false);
  schedule();
}

/* ==========================================================================
   13e. CONTACT FORM — real submission (Formspree if configured, else email)
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const btn = form.querySelector('button[type="submit"]');
  const setStatus = (msg, kind) => {
    if (!status) return;
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  };

  const EMAIL = 'tanmaykanani8@gmail.com';
  const looksUnset = (v) => !v || /^(your|paste|xxxx|key|endpoint)/i.test(v);

  // No backend configured: copy the address and show it — no jarring
  // "choose an app" mailto popup. The visitor can email directly.
  function emailFallback() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(EMAIL).catch(() => {});
    }
    setStatus(`Email me directly at ${EMAIL} — address copied to your clipboard.`, 'ok');
  }

  async function postTo(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body });
    let json = {};
    try { json = await r.json(); } catch (_) { /* ignore */ }
    return r.ok && (json.success === undefined || json.success === true);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const accessKey = (form.dataset.accessKey || '').trim();
    const endpoint = (form.dataset.endpoint || '').trim();
    const useWeb3 = !looksUnset(accessKey);
    const useFormspree = /^https:\/\/formspree\.io\/f\/\w+$/.test(endpoint);

    if (!useWeb3 && !useFormspree) { emailFallback(); return; }

    if (btn) btn.disabled = true;
    setStatus('Sending…');
    try {
      let ok;
      if (useWeb3) {
        const fd = new FormData(form);
        fd.append('access_key', accessKey);
        fd.append('subject', `New portfolio message from ${document.getElementById('form-name').value.trim()}`);
        ok = await postTo('https://api.web3forms.com/submit', fd);
      } else {
        ok = await postTo(endpoint, new FormData(form));
      }
      if (ok) {
        form.reset();
        setStatus("Thanks — your message just landed in my inbox. I'll reply soon. ✦", 'ok');
      } else {
        setStatus(`Couldn’t send right now — please email me at ${EMAIL}.`, 'err');
      }
    } catch (_) {
      setStatus(`Network issue — please email me at ${EMAIL}.`, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

/* ==========================================================================
   14. SMOOTH HOVER EFFECTS — Links & interactive elements
   ========================================================================== */
function initSmoothHoverLinks() {
  // Platform link arrow animation
  document.querySelectorAll('.platform-link').forEach(link => {
    link.addEventListener('mouseenter', () => {
      const icon = link.querySelector('i');
      if (icon && typeof gsap !== 'undefined') {
        gsap.to(icon, { x: 4, duration: 0.25, ease: 'power2.out' });
      }
    });
    link.addEventListener('mouseleave', () => {
      const icon = link.querySelector('i');
      if (icon && typeof gsap !== 'undefined') {
        gsap.to(icon, { x: 0, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  // Project links arrow animation
  document.querySelectorAll('.project-links a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      const icon = link.querySelector('i');
      if (icon && typeof gsap !== 'undefined') {
        gsap.to(icon, { x: 3, y: -2, duration: 0.2, ease: 'power2.out' });
      }
    });
    link.addEventListener('mouseleave', () => {
      const icon = link.querySelector('i');
      if (icon && typeof gsap !== 'undefined') {
        gsap.to(icon, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  // Contact social icon bounce
  document.querySelectorAll('.contact-socials a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(link.querySelector('i'), { rotation: 0 }, { rotation: 360, duration: 0.5, ease: 'power2.out' });
      }
    });
  });

  // Button ripple effect
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);transform:scale(0);animation:btnRipple 0.6s ease-out forwards;pointer-events:none;';
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  // Inject ripple keyframes
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = '@keyframes btnRipple{to{transform:scale(1);opacity:0;}}';
    document.head.appendChild(style);
  }
}

/* ==========================================================================
   15. INTERACTIVE PARTICLE CANVAS — Fills empty space with life
   Particles float, connect with lines, and react to cursor.
   ========================================================================== */
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  if (REDUCED_MOTION) { canvas.style.display = 'none'; return; }

  const ctx = canvas.getContext('2d');
  // Runs on mobile too (lighter): particles drift on their own and react to
  // a finger drag, so the background still feels alive without a cursor.
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  let w, h;
  const mouse = { x: -500, y: -500 };
  const particles = [];
  const count = isCoarse ? 55 : 70;
  const connectDist = isCoarse ? 115 : 120;
  const mouseDist = 150;
  let touching = false;
  let roam = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -500;
    mouse.y = -500;
  });
  // Touch takes over the pointer while a finger is down
  window.addEventListener('touchstart', e => {
    touching = true;
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });
  window.addEventListener('touchend', () => { touching = false; });

  // On touch devices a virtual point gently wanders the screen so the field
  // stays as alive as the desktop cursor; a finger drag overrides it.
  function updateRoam() {
    if (!isCoarse || touching) return;
    roam += 0.01;
    mouse.x = w * (0.5 + 0.4 * Math.sin(roam) * Math.cos(roam * 0.5));
    mouse.y = h * (0.5 + 0.4 * Math.sin(roam * 0.7));
  }

  // Create particles
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      baseAlpha: Math.random() * 0.3 + 0.1,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    updateRoam();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouseDist && dist > 0) {
        const force = (mouseDist - dist) / mouseDist;
        p.vx += (dx / dist) * force * 0.8;
        p.vy += (dy / dist) * force * 0.8;
      }

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      // Glow near cursor
      let alpha = p.baseAlpha;
      if (dist < mouseDist * 2) {
        alpha += (1 - dist / (mouseDist * 2)) * 0.5;
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232, 197, 71, ' + alpha + ')';
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const ddx = p.x - p2.x;
        const ddy = p.y - p2.y;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < connectDist) {
          const lineAlpha = (1 - d / connectDist) * 0.08;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(232, 197, 71, ' + lineAlpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   16. CURSOR SPOTLIGHT — Large ambient glow following mouse
   ========================================================================== */
function initCursorSpotlight() {
  const spot = document.getElementById('cursor-spotlight');
  if (!spot) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  (function move() {
    pos.x += (mouse.x - pos.x) * 0.08;
    pos.y += (mouse.y - pos.y) * 0.08;
    spot.style.left = pos.x + 'px';
    spot.style.top = pos.y + 'px';
    requestAnimationFrame(move);
  })();
}

/* ==========================================================================
   17. SCROLL PROGRESS BAR — thin gold line tracking page position
   ========================================================================== */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ==========================================================================
   18. TIMELINE DRAW-IN — the milestones line draws itself as you scroll,
   lighting up each dot as it passes.
   ========================================================================== */
function initTimelineDraw() {
  const tl = document.querySelector('.timeline');
  if (!tl) return;
  const items = tl.querySelectorAll('.timeline-item');
  let ticking = false;

  const update = () => {
    const rect = tl.getBoundingClientRect();
    const marker = window.innerHeight * 0.72; // activation point down the viewport
    const p = Math.min(1, Math.max(0, (marker - rect.top) / rect.height));
    tl.style.setProperty('--tl-progress', (p * 100) + '%');
    items.forEach(item => {
      // each dot sits ~10px below its item's top edge
      item.classList.toggle('tl-active', item.getBoundingClientRect().top + 10 < marker);
    });
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ==========================================================================
   19. CLICK RIPPLE — Gold ring expands from any click point
   ========================================================================== */
function initClickRipple() {
  if (REDUCED_MOTION) return;
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = (e.clientX - 100) + 'px';
    ripple.style.top = (e.clientY - 100) + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 750);
  });
}
