// Portfolio behaviour: intro, pointer effects, test-runner toy, dock nav, data-driven lists.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const store = {
  get: (k) => { try { return sessionStorage.getItem(k) ?? localStorage.getItem(k); } catch { return null; } },
  set: (k, v, local) => { try { (local ? localStorage : sessionStorage).setItem(k, v); } catch {} },
};

$('#year').textContent = new Date().getFullYear();

/* ---------- Intro: once per session ---------- */
(function intro() {
  const el = $('#intro');
  const skipIntro = reduceMotion || store.get('introSeen') || new URLSearchParams(location.search).has('nointro');
  if (skipIntro) { document.documentElement.classList.add('no-intro'); store.set('introSeen', '1'); return; }
  const text = 'trust the process.';
  const out = $('#introText');
  let i = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    store.set('introSeen', '1');
    el.classList.add('is-done');
    setTimeout(() => document.documentElement.classList.add('no-intro'), 900);
  };
  const type = () => {
    if (done) return;
    out.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(type, i === 6 ? 220 : 55 + Math.random() * 45);
    else setTimeout(finish, 650);
  };
  setTimeout(type, 250);
  el.addEventListener('click', finish);
  window.addEventListener('keydown', finish, { once: true });
})();

/* ---------- Pointer: page spotlight + card edge glow ---------- */
if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
  let raf = 0, x = 0, y = 0;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--mx', x + 'px');
      document.documentElement.style.setProperty('--my', y + 'px');
      raf = 0;
    });
  }, { passive: true });
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.glow');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--gx', e.clientX - r.left + 'px');
    card.style.setProperty('--gy', e.clientY - r.top + 'px');
  }, { passive: true });
}

/* ---------- Test runner toy ---------- */
(function runner() {
  const items = $$('#runList li');
  const sum = $('#runSum');
  let running = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  async function runOne(li) {
    li.dataset.state = 'run';
    await sleep(380 + Math.random() * 380);
    li.dataset.state = 'pass';
  }
  async function runAll() {
    if (running) return; running = true;
    items.forEach((li) => (li.dataset.state = 'idle'));
    sum.textContent = 'running 5 specs…';
    const t0 = performance.now();
    for (const li of items) await runOne(li);
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    sum.innerHTML = `<b>5 passed</b> (${secs}s) · 4+ years in production`;
    running = false;
  }
  $('#runBtn').addEventListener('click', runAll);
  items.forEach((li) => li.addEventListener('click', async () => {
    if (running) return;
    // A little QA joke: re-running a single spec shows a flaky blip before it passes.
    li.dataset.state = 'flaky';
    await sleep(260);
    await runOne(li);
  }));
  // Auto-run once when the runner scrolls into view.
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { setTimeout(runAll, store.get('introSeen') ? 300 : 2600); obs.disconnect(); }
  }, { threshold: 0.5 }).observe($('#runner'));
})();

/* ---------- Accent cycler (click the RS badge) ---------- */
(function accents() {
  const base = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const palette = [base, '#3b5bdb', '#9c36b5', '#e8590c', '#2b8a3e'];
  let i = Math.max(0, palette.indexOf(store.get('accent') || base));
  const apply = () => document.documentElement.style.setProperty('--accent', palette[i]);
  if (store.get('accent')) apply();
  $('#brand').addEventListener('click', () => {
    i = (i + 1) % palette.length; apply();
    store.set('accent', palette[i], true);
  });
})();

/* ---------- Dock: hide on scroll down, show on scroll up / near bottom; active section ---------- */
(function dock() {
  const dock = $('#dock');
  let lastY = scrollY;
  window.addEventListener('scroll', () => {
    const y = scrollY;
    const nearEnd = innerHeight + y > document.body.scrollHeight - 80;
    dock.classList.toggle('is-hidden', y > lastY && y > 300 && !nearEnd);
    lastY = y;
  }, { passive: true });
  window.addEventListener('pointermove', (e) => { if (innerHeight - e.clientY < 90) dock.classList.remove('is-hidden'); }, { passive: true });
  const links = $$('.dock a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach((s) => sectionObserver.observe(s));
})();

/* ---------- Data-driven lists ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS = { live: 'Live', building: 'Building', planned: 'Planned', archive: '2023' };

function bindFilter(groupAttr, apply) {
  const chips = $$(`[data-${groupAttr}]`);
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-selected', x === c); });
    apply(c.dataset[groupAttr]);
  }));
}

async function loadJson(path) {
  try { const r = await fetch(path, { cache: 'no-cache' }); return r.ok ? r.json() : []; } catch { return []; }
}

(async function projects() {
  const list = $('#projects');
  const data = await loadJson('data/projects.json');
  list.innerHTML = data.map((p) => `
    <a class="project glow reveal" href="${esc(p.url)}" target="_blank" rel="noopener" data-group="${p.status === 'archive' ? 'archive' : 'building'}">
      <div class="project__top"><h3>${esc(p.name)}</h3><span class="status" data-s="${esc(p.status)}">${STATUS[p.status] || esc(p.status)}</span></div>
      <p>${esc(p.summary)}</p>
      ${p.proves ? `<p><strong>Shows:</strong> ${esc(p.proves)}</p>` : ''}
      <div class="tags">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
    </a>`).join('') || '<p class="empty">Projects coming soon.</p>';
  bindFilter('filter', (f) => $$('.project', list).forEach((el) => { el.hidden = f !== 'all' && el.dataset.group !== f; }));
  observeReveals();
})();

(async function notebook() {
  const list = $('#notes');
  const data = (await loadJson('data/notes.json')).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const render = (f) => {
    const rows = data.filter((n) => f === 'all' || n.type === f);
    list.innerHTML = rows.map((n) => `
      <a class="note glow" href="${esc(n.url)}" target="_blank" rel="noopener">
        <span class="note__type">${n.type === 'read' ? 'Reading' : 'Writing'}</span>
        <div><h3>${esc(n.title)}</h3><p>${esc(n.why)}</p></div>
        <span class="note__date">${esc(n.date || '')}</span>
      </a>`).join('') || `<p class="empty">${f === 'note' ? 'First note is on its way. I write about what I learn as I build.' : 'Nothing here yet.'}</p>`;
  };
  render('all');
  bindFilter('note', render);
})();

/* ---------- Reveal on scroll ---------- */
const revealObserver = reduceMotion ? null : new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); revealObserver.unobserve(en.target); } });
}, { threshold: 0.12 });
function observeReveals() {
  $$('.principle, .case, .timeline li, .block__head').forEach((el) => el.classList.add('reveal'));
  $$('.reveal:not(.is-in)').forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add('is-in')));
}
observeReveals();
