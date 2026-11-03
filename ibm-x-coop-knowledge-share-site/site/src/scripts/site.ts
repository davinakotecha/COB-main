// Page behaviour shared by every page: theme toggle, toast, search, scroll reveals, and the two
// replayable illustrations (hero pipeline, chat). Everything plays once; reduced motion shows the
// final state straight away. The DOM already holds the real text, so this only toggles classes.

const doc = document.documentElement;
const RM = doc.classList.contains('rm');
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

// ---------- theme ----------
const themeBtn = $('#theme');
function syncTheme() {
  themeBtn?.setAttribute('aria-pressed', String(doc.getAttribute('data-theme') === 'dark'));
}
syncTheme();
themeBtn?.addEventListener('click', () => {
  const next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  doc.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch {
    /* storage blocked: the choice just lasts for this page */
  }
  syncTheme();
});

// ---------- toast ----------
let toastTimer: number | undefined;
window.addEventListener('site:toast', (e) => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = String((e as CustomEvent).detail ?? '');
  el.classList.add('on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('on'), 2200);
});

// ---------- search (Pagefind modal) ----------
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const kbd = $('#kbd');
if (kbd) kbd.textContent = isMac ? '⌘ K' : 'Ctrl K';
async function openSearch() {
  await customElements.whenDefined('pagefind-modal');
  ($('pagefind-modal') as (HTMLElement & { open?: () => void }) | null)?.open?.();
}
$('#search')?.addEventListener('click', openSearch);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
});

// ---------- hero pipeline: one job becomes a shared skill ----------
const pl = $('#pl');
let plTimers: number[] = [];
function playPipeline() {
  if (!pl) return;
  plTimers.forEach(clearTimeout);
  plTimers = [];
  pl.classList.remove('p1', 'p2', 'p3');
  if (RM) {
    pl.classList.add('p1', 'p2', 'p3');
    return;
  }
  void pl.offsetWidth; // restart the transitions
  ([[150, 'p1'], [1500, 'p2'], [3000, 'p3']] as const).forEach(([ms, cls]) => {
    plTimers.push(window.setTimeout(() => pl.classList.add(cls), ms));
  });
}
$('#replay')?.addEventListener('click', playPipeline);
if (pl) playPipeline();

// ---------- how it works: chat illustration ----------
const chat = $('#chat');
let chatTimers: number[] = [];
function playChat() {
  if (!chat) return;
  chatTimers.forEach(clearTimeout);
  chatTimers = [];
  chat.classList.remove('c1', 'c2', 'c3');
  if (RM) {
    chat.classList.add('c1', 'c3');
    return;
  }
  void chat.offsetWidth;
  ([[200, 'c1'], [1100, 'c2'], [2600, 'c3']] as const).forEach(([ms, cls]) => {
    chatTimers.push(window.setTimeout(() => chat.classList.add(cls), ms));
  });
}
$('#chatReplay')?.addEventListener('click', playChat);

// ---------- reveal on scroll ----------
function countUp(el: HTMLElement) {
  const to = Number(el.dataset.count ?? 0);
  if (RM || to === 0) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const tick = (now: number) => {
    const p = Math.min((now - t0) / 700, 1);
    el.textContent = String(Math.round(to * p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
$$('[data-count]').forEach((el) => {
  if (!RM) el.textContent = '0';
});

function reveal(el: HTMLElement) {
  el.classList.add('in');
  if (el.id === 'chat') playChat();
  $$('[data-count]', el).forEach(countUp);
}
const rv = $$('.rv');
if (RM || !('IntersectionObserver' in window)) {
  rv.forEach(reveal);
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        reveal(e.target as HTMLElement);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.2 },
  );
  rv.forEach((el) => io.observe(el));
}
