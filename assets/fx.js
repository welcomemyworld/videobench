(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);
  document.documentElement.classList.add(REDUCE ? 'no-fx' : 'fx');

  function onVisible(el, fn, margin = '0px 0px -10% 0px') {
    if (!el) return;
    if (REDUCE) { fn(el); return; }
    const o = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { o.disconnect(); fn(el); }
    }, { rootMargin: margin });
    o.observe(el);
  }

  function reveal(els) {
    if (REDUCE) return;
    const o = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        const el = e.target;
        el.style.transitionDelay = `${i * 70}ms`;
        el.classList.add('in');
        o.unobserve(el);
        setTimeout(() => { el.style.transitionDelay = ''; }, 1100 + i * 70);
      });
    }, { rootMargin: '0px 0px -5% 0px' });
    els.forEach(e => { e.classList.add('rv'); o.observe(e); });
  }

  function countUp(el, to, fmt = v => Math.round(v)) {
    if (REDUCE) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    onVisible(el, () => {
      const t0 = performance.now(), dur = 1300;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(to * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // Wordmark playhead: plays across the word, holds, rewinds; hovering scrubs it like a video timeline.
  function playhead(el, { duration = 33.8, play = 4200, hold = 1800, rewind = 700 } = {}) {
    const frames = [...el.querySelectorAll('.mark-strip i')];
    const tc = el.querySelector('.mark-tc');
    const fmt = s => `00:${String(Math.floor(s)).padStart(2, '0')}:${String(Math.floor((s % 1) * 30)).padStart(2, '0')}`;
    const set = p => {
      el.style.setProperty('--p', p.toFixed(4));
      frames.forEach((f, i) => f.classList.toggle('lit', p >= i / frames.length + .02));
      if (tc) tc.textContent = fmt(p * duration);
    };
    if (REDUCE) { set(1); return () => {}; }
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const cycle = play + hold + rewind;
    let t0 = performance.now(), raf = 0, scrub = null, visible = true, alive = true;
    const tick = now => {
      if (!alive) return;
      if (scrub == null && visible) {
        const t = (now - t0) % cycle;
        set(t < play ? ease(t / play) : t < play + hold ? 1 : 1 - ease((t - play - hold) / rewind));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = e => {
      const r = el.getBoundingClientRect();
      scrub = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      set(scrub);
    };
    const leave = () => { scrub = null; t0 = performance.now() - play - hold; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); });
    io.observe(el);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); };
  }

  window.FX = { REDUCE, onVisible, reveal, countUp, playhead };
})();
