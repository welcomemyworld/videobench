(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);
  document.documentElement.classList.add(REDUCE ? 'no-fx' : 'fx');
  const EASE = 'cubic-bezier(.7,0,.25,1)';
  const ICON = {
    play: '<svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z"/></svg>',
    pause: '<svg viewBox="0 0 10 10"><path d="M2 1h2.2v8H2zM5.8 1H8v8H5.8z"/></svg>',
    rew: '<svg viewBox="0 0 10 10"><path d="M5 1.5L.5 5 5 8.5zM9.5 1.5L5 5l4.5 3.5z"/></svg>',
    ff: '<svg viewBox="0 0 10 10"><path d="M.5 1.5L5 5 .5 8.5zM5 1.5L9.5 5 5 8.5z"/></svg>',
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(2, '0');
  const tc = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}:${pad(Math.floor((s % 1) * 30))}`;

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

  // Odometer: every digit is a rolling column. Same-shaped updates roll from the old digits; `hold` parks at zeros.
  const DIGITS = Array.from({ length: 20 }, (_, i) => `<span>${i % 10}</span>`).join('');
  const escc = c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c);
  function odo(el, str, { delay = 0, hold = false } = {}) {
    if (!el) return;
    str = String(str);
    if (REDUCE) { el.textContent = str; return; }
    const shape = str.replace(/\d/g, '0');
    if (el._odoShape !== shape) {
      el._odoShape = shape;
      el.innerHTML = `<span class="odo" aria-hidden="true">${[...str].map(c => /\d/.test(c) ? `<span class="od"><span class="od-r">${DIGITS}</span></span>` : `<span class="od-s">${escc(c)}</span>`).join('')}</span><span class="sr"></span>`;
      void el.offsetWidth;
    }
    el.lastChild.textContent = str;
    if (hold) return;
    const rs = el.querySelectorAll('.od-r');
    let j = 0;
    for (const c of str) {
      if (!/\d/.test(c)) continue;
      rs[j].style.transitionDelay = `${delay + j * 55}ms`;
      rs[j].style.transform = `translateY(${-(+c + 10) * 5}%)`;
      j++;
    }
  }

  // Wipe: a clay playhead sweeps across the element and "renders" it in.
  function sweep(el, dur = 1000) {
    if (REDUCE || !el.animate) { el.classList.add('in'); return; }
    const head = document.createElement('i');
    head.className = 'wp-head';
    head.setAttribute('aria-hidden', 'true');
    el.append(head);
    el.classList.add('in');
    const a = el.animate({ clipPath: ['inset(-16px 100% -16px -16px)', 'inset(-16px 0% -16px -16px)'] }, { duration: dur, easing: EASE });
    head.animate({ left: ['0%', '100%'] }, { duration: dur, easing: EASE, fill: 'forwards' });
    head.animate({ opacity: [0, 1, 1, 0], offset: [0, .06, .86, 1] }, { duration: dur, fill: 'forwards' });
    a.onfinish = a.oncancel = () => head.remove();
  }
  function wipe(els, { dur = 1000, stagger = 130 } = {}) {
    els = els.filter(Boolean);
    if (REDUCE) return;
    const io = new IntersectionObserver(es => {
      es.filter(e => e.isIntersecting).forEach((e, i) => {
        io.unobserve(e.target);
        setTimeout(() => sweep(e.target, dur), i * stagger);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => { el.classList.add('wp'); io.observe(el); });
  }

  // Chapter scrubber: the page is a video, sections are chapters. Hover to preview, drag to seek.
  function chapters(root, clock) {
    if (!root) return { set() {} };
    root.innerHTML = '<div class="sc-segs"></div><div class="sc-knob"></div><div class="sc-tip"><span class="mono n"></span><b></b><span class="mono t"></span></div>';
    const segsEl = root.querySelector('.sc-segs'), knob = root.querySelector('.sc-knob'), tip = root.querySelector('.sc-tip');
    const tipN = tip.querySelector('.n'), tipB = tip.querySelector('b'), tipT = tip.querySelector('.t');
    if (clock) clock.innerHTML = `<i>${ICON.pause}</i><span>00:00:00</span><small>/ 00:00:00</small>`;
    const cI = clock?.querySelector('i'), cT = clock?.querySelector('span'), cD = clock?.querySelector('small');
    const PX_PER_SEC = 110;
    let list = [], marks = [], segs = [], max = 1, dur = 1, hoverF = -1, drag = false, lastY = scrollY, idle = 0, st = 'pause', raf = 0;

    const setSt = s => { if (s === st) return; st = s; if (cI) cI.innerHTML = ICON[s]; };
    const end = i => i + 1 < marks.length ? marks[i + 1] : 1;
    const update = () => {
      raf = 0;
      const p = clamp(scrollY / max);
      segs.forEach((s, i) => {
        const a = marks[i], w = Math.max(1e-6, end(i) - a);
        s.lastChild.style.transform = `scaleX(${clamp((p - a) / w)})`;
        s.firstChild.style.transform = `scaleX(${hoverF < 0 ? 0 : clamp((hoverF - a) / w)})`;
      });
      knob.style.left = `${p * 100}%`;
      if (cT) cT.textContent = tc(p * dur);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      dur = max / PX_PER_SEC;
      marks = list.map((c, i) => i ? clamp((c.el.getBoundingClientRect().top + scrollY - 64) / max) : 0);
      for (let i = 1; i < marks.length; i++) marks[i] = Math.max(marks[i], marks[i - 1]);
      segs.forEach((s, i) => { s.style.left = `${marks[i] * 100}%`; s.style.width = `calc(${(end(i) - marks[i]) * 100}% - 3px)`; });
      if (cD) cD.textContent = `/ ${tc(dur)}`;
      queue();
    };
    const fAt = e => { const r = root.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width); };
    const idxAt = f => { let k = 0; marks.forEach((m, i) => { if (m <= f) k = i; }); return k; };
    const hover = f => {
      hoverF = f;
      const k = idxAt(f);
      segs.forEach((s, i) => s.classList.toggle('on', i === k));
      tipN.textContent = pad(k + 1);
      tipB.textContent = list[k]?.title || '';
      tipT.textContent = tc(f * dur);
      const w = root.clientWidth, tw = tip.offsetWidth;
      tip.style.left = `${clamp(f * w, tw / 2 + 8, w - tw / 2 - 8)}px`;
      root.classList.add('hover');
      queue();
    };
    const unhover = () => { hoverF = -1; root.classList.remove('hover'); segs.forEach(s => s.classList.remove('on')); queue(); };
    const seek = f => {
      const html = document.documentElement;
      html.style.scrollBehavior = 'auto';
      scrollTo(0, f * max);
      html.style.scrollBehavior = '';
    };

    root.addEventListener('pointermove', e => { const f = fAt(e); hover(f); if (drag) seek(f); });
    root.addEventListener('pointerleave', () => { if (!drag) unhover(); });
    root.addEventListener('pointerdown', e => {
      e.preventDefault();
      drag = true;
      root.setPointerCapture?.(e.pointerId);
      root.classList.add('drag');
      const f = fAt(e);
      hover(f);
      seek(f);
    });
    const stop = e => {
      if (!drag) return;
      drag = false;
      root.classList.remove('drag');
      const r = root.getBoundingClientRect();
      if (e.type === 'pointercancel' || e.clientY < r.top || e.clientY > r.bottom) unhover();
    };
    root.addEventListener('pointerup', stop);
    root.addEventListener('pointercancel', stop);

    addEventListener('scroll', () => {
      const y = scrollY, dy = y - lastY;
      lastY = y;
      if (dy) setSt(dy > 0 ? (dy > 70 ? 'ff' : 'play') : 'rew');
      clearTimeout(idle);
      idle = setTimeout(() => setSt('pause'), 260);
      queue();
    }, { passive: true });
    addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);

    return {
      set(next) {
        list = next;
        segsEl.innerHTML = list.map(() => '<div class="seg"><i class="hv"></i><i class="fl"></i></div>').join('');
        segs = [...segsEl.children];
        measure();
      },
    };
  }

  // Floating preview card that follows the pointer.
  const peek = (() => {
    let el = null, cur = '';
    const box = () => el || (el = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'peek' })));
    const api = {
      show(html, x, y, cls = '') {
        const b = box();
        if (html !== cur) b.innerHTML = cur = html;
        b.className = `peek on ${cls}`;
        api.move(x, y);
      },
      move(x, y) {
        if (!el) return;
        const w = el.offsetWidth, h = el.offsetHeight, g = 18;
        let l = x + g, t = y + g;
        if (l + w > innerWidth - 8) l = x - w - g;
        if (t + h > innerHeight - 8) t = y - h - g;
        el.style.transform = `translate(${Math.max(8, l)}px, ${Math.max(8, t)}px)`;
      },
      hide() { el?.classList.remove('on'); },
    };
    return api;
  })();

  // Channel-switch static over a video frame.
  function tvStatic(target, dur = 420) {
    if (REDUCE || !target) return;
    const W = 192, H = 108;
    const c = document.createElement('canvas');
    c.className = 'tv-static';
    c.width = W; c.height = H;
    target.append(c);
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), buf = new Uint32Array(img.data.buffer);
    const t0 = performance.now();
    const tick = now => {
      const k = (now - t0) / dur;
      if (k >= 1 || !c.isConnected) { c.remove(); return; }
      for (let i = 0; i < buf.length; i++) { const v = (Math.random() * 255) | 0; buf[i] = 0xff000000 | (v << 16) | (v << 8) | v; }
      ctx.putImageData(img, 0, 0);
      const y = (((now - t0) / 150) % 1) * H;
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.fillRect(0, y, W, 7);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.fillRect(0, (y + H / 2) % H, W, 16);
      c.style.opacity = String(1 - k * k * k);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Sliding indicator under the active item of a tab group / nav.
  function slider(box, sel, cls) {
    if (!box) return () => {};
    box._slRO?.disconnect();
    box.querySelector(`:scope > .${cls}`)?.remove();
    const ind = document.createElement('i');
    ind.className = cls;
    ind.setAttribute('aria-hidden', 'true');
    box.append(ind);
    let snap = true;
    const place = () => {
      const b = box.querySelector(sel);
      if (!b) { ind.style.opacity = '0'; return; }
      if (snap) ind.style.transition = 'none';
      Object.assign(ind.style, { opacity: '1', width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px`, transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)` });
      if (snap) { void ind.offsetWidth; ind.style.transition = ''; snap = false; }
    };
    if ('ResizeObserver' in window) {
      box._slRO = new ResizeObserver(() => { snap = true; place(); });
      box._slRO.observe(box);
    } else requestAnimationFrame(place);
    return place;
  }

  // Wordmark playhead: plays across the word, holds, rewinds; hovering scrubs it like a video timeline.
  // Frames near the head magnify, lit frames play, and fast moves split the RGB channels.
  function playhead(el, { duration = 33.8, play = 4200, hold = 1800, rewind = 700 } = {}) {
    const frames = [...el.querySelectorAll('.mark-strip i')], n = frames.length;
    const tcI = el.querySelector('.mark-tc i'), tcT = el.querySelector('.mark-tc span');
    let last = 0, lastT = performance.now(), vel = 0, state = '';
    const setState = s => { if (s === state) return; state = s; if (tcI) tcI.innerHTML = ICON[s]; };
    const set = (p, now = performance.now()) => {
      el.style.setProperty('--p', p.toFixed(4));
      const dt = Math.max(8, now - lastT);
      vel = vel * .7 + (Math.abs(p - last) / dt) * 1000 * .3;
      last = p; lastT = now;
      const rgb = REDUCE ? 0 : clamp((vel - .7) * 3.2, 0, 7);
      el.style.setProperty('--rgb', `${rgb.toFixed(2)}px`);
      el.style.setProperty('--mv', REDUCE ? '0' : clamp(vel * 2.2).toFixed(2));
      el.classList.toggle('fast', rgb > .25);
      frames.forEach((f, i) => {
        f.classList.toggle('lit', p >= i / n + .02);
        if (REDUCE) return;
        const d = (p - (i + .5) / n) * n, s = 1 + .42 * Math.exp(-d * d * 1.8);
        f.style.transform = s > 1.004 ? `scale(${s.toFixed(3)})` : '';
        f.style.zIndex = s > 1.06 ? '2' : '';
      });
      if (tcT) tcT.textContent = tc(p * duration);
    };
    if (REDUCE) { setState('pause'); set(1); return () => {}; }
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const cycle = play + hold + rewind;
    let t0 = performance.now(), from = 1, raf = 0, scrub = null, visible = true, alive = true;
    const tick = now => {
      if (!alive) return;
      if (scrub != null) {
        set(scrub, now);
        if (vel < .04) setState('pause');
      } else if (visible) {
        if (now - t0 >= cycle) from = 1;
        const t = (now - t0) % cycle;
        setState(t < play ? 'play' : t < play + hold ? 'pause' : 'rew');
        set(t < play ? ease(t / play) : t < play + hold ? 1 : from * (1 - ease((t - play - hold) / rewind)), now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = e => {
      const r = el.getBoundingClientRect();
      const s = clamp((e.clientX - r.left) / r.width);
      if (scrub != null && Math.abs(s - scrub) > .002) setState(s > scrub ? 'ff' : 'rew');
      scrub = s;
    };
    const leave = () => {
      if (scrub == null) return;
      from = scrub;
      scrub = null;
      t0 = performance.now() - play - hold;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); });
    io.observe(el);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); };
  }

  window.FX = { REDUCE, ICON, tc, onVisible, reveal, countUp, odo, sweep, wipe, chapters, peek, tvStatic, slider, playhead };
})();
