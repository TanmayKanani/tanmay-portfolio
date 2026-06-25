/* ==========================================================================
   THE LIVING CANVAS — Interactive Engine v2
   More responsive · More alive · More wow
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Wait a tiny moment for GSAP deferred scripts to be ready
  requestAnimationFrame(() => {
    initCursor();
    initHeroLetters();
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
    initSmoothHoverLinks();
    initParticles();
    initCursorSpotlight();
    initClickRipple();
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

  // Hamburger toggle
  if (hamburger) {
    hamburger.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  }
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
    const value = parseFloat(circle.getAttribute('data-value')) || 0;
    const max = parseFloat(circle.getAttribute('data-max')) || 1;
    const targetOffset = circumference * (1 - value / max);

    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference; // fully hidden initially

    // Animate when scrolling into view
    const card = circle.closest('.platform-card');
    if (card && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          if (typeof gsap !== 'undefined') {
            gsap.to(circle, { strokeDashoffset: targetOffset, duration: 1.8, ease: 'power3.out', delay: 0.15 });
          } else {
            circle.style.strokeDashoffset = targetOffset;
          }
        },
      });
    } else {
      setTimeout(() => { circle.style.strokeDashoffset = targetOffset; }, 800);
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

  const circumference = 2 * Math.PI * 50;
  const targetOffset = circumference * (1 - value / max);

  if (typeof gsap !== 'undefined') {
    gsap.to(circle, { strokeDashoffset: targetOffset, duration: 1.5, ease: 'power3.out' });
  } else {
    circle.style.strokeDashoffset = targetOffset;
  }
}

/* ==========================================================================
   7. COUNTER — Total Solved
   ========================================================================== */
const statsData = {
  lcSolved: 470,
  cfSolved: 494,
  ccSolved: 121,
  lcRating: 1653,
  lcPercentile: 'Top 18%',
  cfRating: 1352,
  cfRank: 'Pupil',
  activeDays: 0,
  totalSolvesYear: 0
};

let totalSolvedCounterTriggered = false;

function initCounter() {
  const el = document.getElementById('total-solved');
  if (!el) return;

  function countUp() {
    if (totalSolvedCounterTriggered) return;
    totalSolvedCounterTriggered = true;
    const target = statsData.lcSolved + statsData.cfSolved + statsData.ccSolved;
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

function updateCFAndLCStats() {
  const total = statsData.lcSolved + statsData.cfSolved + statsData.ccSolved;

  // Update total solved counter
  const totalSolvedEl = document.getElementById('total-solved');
  if (totalSolvedEl) {
    if (!totalSolvedCounterTriggered) {
      // scrolltrigger will trigger it later
    } else {
      if (typeof gsap !== 'undefined') {
        gsap.to(totalSolvedEl, {
          innerText: total,
          duration: 1.2,
          snap: { innerText: 1 },
          ease: 'power2.out'
        });
      } else {
        totalSolvedEl.textContent = total;
      }
    }
  }
}

/* ==========================================================================
   8. REAL-TIME STATS: LEETCODE & CODEFORCES APIs
   ========================================================================== */
function initLiveStats() {
  const handleLC = 'Tanmay_Kanani';
  const handleCF = 'tanmay.k';

  // Immediately render fallbacks/initial states in UI
  updateDonut('lc-donut-fill', 'lc-solved-donut', statsData.lcSolved, 700);
  updateDonut('cf-donut-fill', 'cf-solved-donut', statsData.cfSolved, 800);
  updateDonut('cc-donut-fill', 'cc-solved-donut', statsData.ccSolved, 300);

  const cfRatingEl = document.getElementById('cf-rating');
  const cfRankEl = document.getElementById('cf-rank');
  if (cfRatingEl) cfRatingEl.textContent = statsData.cfRating;
  if (cfRankEl) {
    cfRankEl.textContent = statsData.cfRank;
    cfRankEl.style.color = cfColor(statsData.cfRating);
  }

  // 1. Fetch LeetCode Solved Stats
  fetch(`https://alfa-leetcode-api.onrender.com/${handleLC}/solved`)
    .then(r => r.json())
    .then(data => {
      if (data && data.solvedProblem) {
        statsData.lcSolved = data.solvedProblem;
        updateDonut('lc-donut-fill', 'lc-solved-donut', statsData.lcSolved, 700);
        updateCFAndLCStats();
      }
    })
    .catch(err => console.log('LeetCode Solved API Error, using fallback:', err));

  // 2. Fetch LeetCode Contest Rating
  fetch(`https://alfa-leetcode-api.onrender.com/${handleLC}/contest`)
    .then(r => r.json())
    .then(data => {
      if (data && data.contestRating) {
        statsData.lcRating = Math.round(data.contestRating);
        const ratEl = document.getElementById('lc-rating');
        if (ratEl) ratEl.textContent = statsData.lcRating;
      }
      if (data && data.contestTopPercentage) {
        statsData.lcPercentile = `Top ${data.contestTopPercentage}%`;
        const pctEl = document.getElementById('lc-percentile');
        if (pctEl) pctEl.textContent = statsData.lcPercentile;
      }
    })
    .catch(err => console.log('LeetCode Contest API Error, using fallback:', err));

  // 3. Fetch Codeforces Info
  fetch(`https://codeforces.com/api/user.info?handles=${handleCF}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'OK' && data.result.length) {
        const u = data.result[0];
        statsData.cfRating = u.rating || 1352;
        const ratEl = document.getElementById('cf-rating');
        if (ratEl) ratEl.textContent = statsData.cfRating;

        const rankEl = document.getElementById('cf-rank');
        if (rankEl) {
          const rank = u.rank || 'pupil';
          rankEl.textContent = rank.charAt(0).toUpperCase() + rank.slice(1);
          rankEl.style.color = cfColor(statsData.cfRating);
        }
      }
    })
    .catch(err => console.log('Codeforces Info API Error, using fallback:', err));

  // 4. Fetch Codeforces Solved count from submissions
  fetch(`https://codeforces.com/api/user.status?handle=${handleCF}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'OK' && data.result.length) {
        const solved = new Set();
        data.result.forEach(sub => {
          if (sub.verdict === 'OK') {
            const problemId = sub.problem.contestId + '-' + sub.problem.index;
            solved.add(problemId);
          }
        });
        statsData.cfSolved = solved.size;
        updateDonut('cf-donut-fill', 'cf-solved-donut', statsData.cfSolved, 800);
        updateCFAndLCStats();
      }
    })
    .catch(err => console.log('Codeforces Solved API Error, using fallback:', err));
}

function cfColor(r) { return r < 1200 ? '#808080' : r < 1400 ? '#00c853' : r < 1600 ? '#03a9f4' : r < 1900 ? '#aa00ff' : '#ff8f00'; }

/* ==========================================================================
   9. HEATMAP — GitHub-style grid from REAL LeetCode + Codeforces activity
   ========================================================================== */
const HEATMAP_HANDLES = { codeforces: 'tanmay.k', leetcode: 'Tanmay_Kanani' };

// UTC YYYY-MM-DD for a unix-seconds timestamp (matches both API date keys)
function isoDayUTC(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function fetchWithTimeout(url, opts, ms) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Pull real daily submission counts. Codeforces is CORS-friendly; LeetCode's
// calendar comes via the same proxy the donuts already use. Returns a
// { 'YYYY-MM-DD': count } map plus whether any source actually answered.
async function fetchRealActivity() {
  const days = {};
  let live = false;

  const cf = (async () => {
    try {
      const r = await fetchWithTimeout(
        `https://codeforces.com/api/user.status?handle=${HEATMAP_HANDLES.codeforces}&from=1&count=100000`,
        undefined, 9000);
      const j = await r.json();
      if (j.status === 'OK' && Array.isArray(j.result)) {
        j.result.forEach(sub => {
          const d = isoDayUTC(sub.creationTimeSeconds);
          days[d] = (days[d] || 0) + 1;
        });
        live = true;
      }
    } catch (e) { console.log('Heatmap: Codeforces activity unavailable —', e.message); }
  })();

  const lc = (async () => {
    try {
      const r = await fetchWithTimeout(
        `https://alfa-leetcode-api.onrender.com/${HEATMAP_HANDLES.leetcode}/calendar`,
        undefined, 13000);
      const j = await r.json();
      let cal = (j && (j.submissionCalendar
        || (j.data && j.data.submissionCalendar)
        || (j.data && j.data.matchedUser && j.data.matchedUser.userCalendar && j.data.matchedUser.userCalendar.submissionCalendar)));
      if (typeof cal === 'string') cal = JSON.parse(cal);
      if (cal && typeof cal === 'object') {
        Object.entries(cal).forEach(([ts, count]) => {
          const d = isoDayUTC(Number(ts));
          days[d] = (days[d] || 0) + Number(count);
        });
        live = true;
      }
    } catch (e) { console.log('Heatmap: LeetCode activity unavailable —', e.message); }
  })();

  await Promise.allSettled([cf, lc]);
  return { days, live };
}

// Deterministic fallback activity (so the grid is never empty if every API is
// down). Keyed by UTC date, with a recent ~100-day streak.
function fallbackActivity() {
  const MS_DAY = 86400000;
  const t = new Date();
  const endUTC = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const rand = (s) => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const STREAK = 100;
  const map = {};
  for (let i = 0; i < 372; i++) {
    const d = new Date(endUTC - i * MS_DAY);
    const dow = d.getUTCDay();
    const r = rand(i + 1);
    let n;
    if (i < STREAK) {
      const weekend = dow === 0 || dow === 6;
      n = (weekend ? 1 : 2) + Math.floor(rand(i * 1.3 + 7) * (weekend ? 4 : 6));
    } else {
      if (r > 0.5) n = 0;
      else if (r > 0.32) n = 1 + Math.floor(rand(i * 2.1) * 2);
      else if (r > 0.16) n = 3 + Math.floor(rand(i * 3.7) * 2);
      else if (r > 0.05) n = 5 + Math.floor(rand(i * 4.3) * 2);
      else n = 7 + Math.floor(rand(i * 5.9) * 5);
    }
    if (n > 0) map[d.toISOString().slice(0, 10)] = n;
  }
  return map;
}

// Render the grid + stats from a { 'YYYY-MM-DD': count } map.
function renderHeatmap(daysMap) {
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
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0 && days[i].count > 0; i--) currentStreak++;

  countTo('heatmap-total-solves', total);
  countTo('heatmap-max-streak', maxStreak);
  countTo('heatmap-current-streak', currentStreak);
  countTo('heatmap-active-days', active);
  statsData.activeDays = active;
  statsData.totalSolvesYear = total;

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
        el.title = (cell.count === 0 ? 'No activity' : `${cell.count} ${cell.count === 1 ? 'submission' : 'submissions'} · LC & CF`) + ' — ' + ds;
      }
      grid.appendChild(el);
    });
  });
}

function initHeatmap() {
  if (!document.getElementById('heatmap-grid')) return;
  // 1) Paint immediately with fallback data so the grid is never empty.
  renderHeatmap(fallbackActivity());
  // 2) Upgrade in place to real submission data once the APIs answer.
  fetchRealActivity()
    .then(({ days, live }) => {
      if (live && Object.keys(days).length) renderHeatmap(days);
    })
    .catch(() => { /* keep fallback */ });
}

// Smooth count-up for the stat numbers; animates from the current value so the
// fallback -> live upgrade transitions cleanly. A token cancels stale loops.
function countTo(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const token = (parseInt(el.dataset.ctToken || '0', 10) + 1);
  el.dataset.ctToken = String(token);
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
  if (!orbs.length) return;

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

  function scramble(el, delay = 0) {
    const original = el.dataset.scrambleText || el.textContent;
    el.dataset.scrambleText = original;
    const len = original.length;
    setTimeout(() => {
      let iteration = 0;
      const interval = setInterval(() => {
        el.textContent = original.split('').map((char, idx) => {
          if (char === ' ' || char === '—' || char === '/') return char;
          if (idx < iteration) return original[idx];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        iteration += 1;
        if (iteration > len) {
          el.textContent = original;
          clearInterval(interval);
        }
      }, 30);
    }, delay);
  }

  // Give skill names a per-group stagger index so they decode in a cascade
  document.querySelectorAll('.skill-group').forEach(group => {
    group.querySelectorAll('[data-scramble]').forEach((el, i) => { el.dataset.sidx = i; });
  });

  const targets = document.querySelectorAll('.section-label, [data-scramble]');
  if (typeof IntersectionObserver !== 'undefined') {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.hasAttribute('data-scramble') ? (parseInt(el.dataset.sidx || '0', 10) * 55) : 0;
          scramble(el, delay);
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
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on mobile

  const ctx = canvas.getContext('2d');
  let w, h;
  const mouse = { x: -500, y: -500 };
  const particles = [];
  const count = 70;
  const connectDist = 120;
  const mouseDist = 150;

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
   17. CLICK RIPPLE — Gold ring expands from any click point
   ========================================================================== */
function initClickRipple() {
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = (e.clientX - 100) + 'px';
    ripple.style.top = (e.clientY - 100) + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 750);
  });
}
