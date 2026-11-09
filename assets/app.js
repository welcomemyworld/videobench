(() => {
const { REDUCE, onVisible, reveal, odo, wipe, chapters, peek, tvStatic, slider, playhead } = window.FX;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
const MEDIA = LOCAL ? '/media/' : '/videobench-media/';

const SHORT = { 'gemini-4-argon': 'Argon', 'gpt-6.1-sol': 'GPT-6.1', 'claude-opus-5-5': 'Opus', 'hy4': 'hy4', 'claude-sonnet-5-5': 'Sonnet', 'grok-4.7': 'Grok', 'deepseek-v4-pro': 'DS-V4' };
const COLOR = { 'gemini-4-argon': '#4e82c3', 'gpt-6.1-sol': '#32302d', 'claude-opus-5-5': '#d97757', 'hy4': '#1b7f79', 'claude-sonnet-5-5': '#e5b696', 'grok-4.7': '#a19e96', 'deepseek-v4-pro': '#5d56a7' };
const LOGO_FILE = { gemini: 'gemini-color', gpt: 'openai', claude: 'claude-color', hy: 'hunyuan-color', grok: 'grok', deepseek: 'deepseek-color', qwen: 'qwen-color', kimi: 'kimi-color', doubao: 'doubao-color' };
const ST = {
  evaluated: [['已评测', 'Evaluated'], 'easy'], rubric_only: [['待评测（已拆 rubric）', 'Pending (rubric ready)'], ''], video: [['A 半 · Opus 已出视频', 'Half A · Opus video'], ''],
  failed: [['A 半 · 未出视频', 'Half A · no video'], 'hard'], none: [['未生成', 'Not generated'], 'hard'], manual: [['手工精做', 'Hand-crafted'], 'mid'], excluded: [['未纳入', 'Excluded'], ''],
};
const CORE = 'hy4';
const DIMS = ['解题与知识正确性', '教学讲解与逻辑', '可视化与动态演绎', '视听呈现与版式节奏'];
const STRIP = [['gemini-4-argon', 'agioyaz-986461', 5], ['gpt-6.1-sol', 'monokern-832979', 2], ['hy4', 'haribuilds-007643', 2], ['claude-opus-5-5', 'lexnlin-241739', 5],
  ['gpt-6.1-sol', 'gorden-sun-797351', 2], ['gemini-4-argon', 'zheke-622583', 2], ['gpt-6.1-sol', 'tanabe-fragm-322001', 5], ['hy4', 'curieuxexplorer-016717', 2]];

let LANG = new URLSearchParams(location.search).get('lang') || localStorage.getItem('vb-lang') || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
if (!['zh', 'en'].includes(LANG)) LANG = 'zh';
const I = (zh, en) => LANG === 'en' ? en : zh;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = x => x == null ? '—' : (+x).toFixed(1);
const f2 = x => x == null ? '—' : (+x).toFixed(2);
const short = m => SHORT[m] || m;
const sig = c => c && (c[0] > 0 || c[1] < 0);
const diffCls = d => ({ 简单: 'easy', 中等: 'mid', 困难: 'hard' }[d] || '');
const sw = m => `<span class="sw" style="background:${COLOR[m] || '#999'}"></span>`;
const mark = v => v === true ? '<span class="mk y">✓</span>' : v === false ? '<span class="mk n">✗</span>' : `<span class="mk u" title="${I('三家评审未形成多数', 'No majority among the three judges')}">–</span>`;
const prio = p => p === 'Must have' ? '<span class="pill must">Must</span>' : '<span class="pill nice">Nice</span>';
const audioMark = () => `<span class="mk u" title="${I('依赖声音：待音频录制后补判，不计分', 'Needs audio: judged once audio is recorded, not scored')}">♪</span>`;
const delta = (d, c, lowerBetter, fmt = f1) => {
  if (d == null) return '<span class="ns">—</span>';
  const s = sig(c), good = lowerBetter ? d < 0 : d > 0;
  return `<span class="${!s ? 'ns' : good ? 'up' : 'down'}" title="95% CI ${c ? c.join(' ~ ') : '—'}">${d > 0 ? '+' : ''}${fmt(d)}${s ? ' *' : ''}</span>`;
};
const tabs = (box, list, on, cb) => {
  box.innerHTML = list.map((t, i) => `<button class="tab ${i === on ? 'on' : ''}" data-i="${i}">${t}</button>`).join('');
  const place = slider(box, '.tab.on', 'tab-ind');
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    $$('.tab', box).forEach(x => x.classList.toggle('on', x === b));
    place();
    cb(+b.dataset.i);
  });
};
// Row / column crosshair over a heat table, with a floating tooltip.
const crosshair = (tb, tip) => {
  const clear = () => { tb.classList.remove('xh'); $$('.x-on, .x-hot', tb).forEach(c => c.classList.remove('x-on', 'x-hot')); peek.hide(); };
  tb.addEventListener('pointerover', e => {
    const td = e.target.closest('td');
    if (!td || td.classList.contains('self')) { clear(); return; }
    $$('.x-on, .x-hot', tb).forEach(c => c.classList.remove('x-on', 'x-hot'));
    [...tb.rows].forEach(r => r.cells[td.cellIndex]?.classList.add('x-on'));
    [...td.parentElement.cells].forEach(c => c.classList.add('x-on'));
    td.classList.add('x-hot');
    tb.classList.add('xh');
    const h = e.pointerType === 'mouse' && tip(td);
    if (h) peek.show(h, e.clientX, e.clientY); else peek.hide();
  });
  tb.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') peek.move(e.clientX, e.clientY); });
  tb.addEventListener('pointerleave', clear);
};

// ---------- logos ----------
const SVG = {};
let uid = 0;
const logoFile = m => { const k = Object.keys(LOGO_FILE).find(k => String(m).toLowerCase().startsWith(k)); return k && LOGO_FILE[k]; };
const logoInner = m => {
  const inner = SVG[logoFile(m)];
  if (!inner) return '';
  const n = ++uid;
  return inner.replace(/id="([^"]+)"/g, `id="$1-${n}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${n})`);
};
const logo = m => { const s = logoInner(m); return s ? `<svg class="lg" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true">${s}</svg>` : sw(m); };
const mn = (m, label = m) => `<span class="mname">${logo(m)}${esc(label)}</span>`;

// ---------- page chrome ----------
const topbar = $('#topbar');
addEventListener('scroll', () => topbar.classList.toggle('scrolled', scrollY > 8), { passive: true });
const CH = chapters($('#scrub'), $('#tcode'));

const framePos = i => `${(i % 4) * 100 / 3}% ${i < 4 ? 0 : 100}%`;
const vp = (q, m, big) => {
  const d = q.models[m];
  if (!d?.has_video) return `<div class="vp nov ${big ? 'big' : ''}">${I('未产出可播放画面', 'No playable video')}（${esc(d?.status || '')}）</div>`;
  const base = `${MEDIA}eval/${m}/${q.slug}`;
  return `<div class="vp ${big ? 'big' : ''}" data-src="${base}.g.mp4" style="background-image:url('${base}.sheet.jpg');background-position:${framePos(5)}"><span class="play">${I('播放', 'Play')}</span><div class="frames">${'<i></i>'.repeat(8)}</div></div>`;
};
let scrub = null;
document.addEventListener('pointermove', e => {
  const el = e.target.closest?.('.vp[data-src]');
  if (scrub && scrub !== el) { scrub.style.backgroundPosition = framePos(5); $$('.frames i', scrub).forEach(i => i.classList.remove('on')); }
  scrub = el && !el.querySelector('video') ? el : null;
  if (!scrub) return;
  const r = scrub.getBoundingClientRect();
  const i = Math.max(0, Math.min(7, Math.floor(((e.clientX - r.left) / r.width) * 8)));
  scrub.style.backgroundPosition = framePos(i);
  $$('.frames i', scrub).forEach((f, k) => f.classList.toggle('on', k === i));
});
document.addEventListener('click', e => {
  const el = e.target.closest('.vp[data-src]');
  if (!el || el.querySelector('video')) return;
  $$('video').forEach(v => v.pause());
  el.innerHTML = '';
  const v = document.createElement('video');
  Object.assign(v, { src: el.dataset.src, controls: true, autoplay: true, muted: true, playsInline: true, className: 'crt' });
  el.append(v);
  v.play().catch(() => {});
});
document.addEventListener('play', e => $$('video').forEach(v => v !== e.target && v.pause()), true);

// ---------- data ----------
const json = u => fetch(u).then(r => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); });
Promise.all([json('data/all.json'), json('data/rubric3.json'), json('data/report_v2.json'), json('data/en.json'),
  ...[...new Set(Object.values(LOGO_FILE))].map(f => fetch(`assets/logos/${f}.svg`).then(r => r.ok ? r.text() : '').then(t => {
    SVG[f] = t.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '');
  }))]).then(([D, R3, RV, EN]) => setup(D, R3, RV, EN)).catch(err => {
  $('#app').innerHTML = `<p style="padding:80px 0">数据加载失败 / Failed to load data (${esc(err.message)}). python3 -m http.server</p>`;
  console.error(err);
});

function setup(D, R3, RV, EN) {
  const M = D.meta, L = D.leaderboard, P = D.prompts, BASE = M.baseline, ORDER = L.map(b => b.model);
  const LB = Object.fromEntries(L.map(b => [b.model, b]));
  const R3L = R3.leaderboard;
  const RB = Object.fromEntries(RV.board.map(b => [b.model_id, b]));
  const A = RV.agreement;
  const VB = M.vibe || RV.vibe_dict || {};
  const CATS = Object.keys(M.cat_n).sort((a, b) => M.cat_n[b] - M.cat_n[a]);
  const Q = P.filter(p => p.status === 'evaluated');
  Q.forEach((q, i) => {
    q.qid = 'B' + String(i + 1).padStart(2, '0');
    const r = R3.prompts[q.slug];
    if (!r) return;
    q.items = r.items.map(it => ({ ...it, r: Object.fromEntries(Object.entries(it.r).map(([m, v]) => [m, v == null ? null : !!v])) }));
    q.r3 = r.models;
  });
  const QS = Object.fromEntries(Q.map(q => [q.slug, q]));
  // v3 rubric（6 字段规范、只判 1/0）覆盖 rubric 类指标；GSB、绝对分、标签仍用 v2
  L.forEach(b => {
    const x = R3L[b.model];
    if (!x) return;
    Object.assign(b, { rubric_pass_rate: x.rubric, must_have_pass_rate: x.must, must_have_all_pass_prompt_rate: x.must_all });
    b.ci = { ...b.ci, must_have_pass_rate: x.must_ci };
  });
  const scored = q => q.items.filter(i => !i.audio);
  const passN = (q, m) => scored(q).filter(i => i.r[m] === true).length;

  // translated vocab
  const tDim = d => I(d, EN.dim[d] || d);
  const tEv = v => I(v, EN.ev[v] || v);
  const tDiff = d => I(d, EN.diff[d] || d);
  const tWhy = w => I(w, EN.why[w] || w);
  const tOrg = o => I(o, { 腾讯混元: 'Tencent Hunyuan' }[o] || o);
  const tSt = s => ST[s] ? I(...ST[s][0]) : s;
  const tSum = q => I(q.summary || q.slug, EN.summary[q.slug] || q.prompt.slice(0, 160));
  const tBankTitle = p => I(p.summary || p.prompt || '', EN.summary[p.slug] || p.prompt || p.summary || '');
  const tag = id => VB[id] ? `<span class="pill ${VB[id].kind}">${esc(I(VB[id].text, EN.vibe[id] || VB[id].text))}</span>` : '';
  const zhNote = () => LANG === 'en' ? '<p class="muted" style="font-size:12px;margin:8px 0 0">Rubric checks and judge comments are shown in the original Chinese.</p>' : '';
  const NOTES = {
    stability: I(RV.notes.stability, EN.notes.stability),
    rubricFail: I(RV.notes.rubric.split('。').filter(Boolean).pop() + '。', EN.notes.rubric_fail),
    abs: I(RV.notes.abs, EN.notes.abs),
    vibe: I(RV.notes.vibe, EN.notes.vibe),
  };
  const legend = () => `<span style="color:${COLOR[CORE]}">■</span> ${esc(CORE)}　<span style="color:${COLOR[BASE]}">■</span> ${I('基准', 'baseline')} ${esc(BASE)}`;
  const nJ = M.judges.length;

  const S = { lb: 0, q: Q[0].slug, m: CORE, pane: 'work', sc: 0, bd: 0, qCat: '' };
  let stopMark = () => {};

  // each model's top-scoring output (per-prompt GSB, then gate score) for hover previews
  const BEST = Object.fromEntries(ORDER.map(m => [m, Q.filter(q => q.models[m]?.has_video)
    .sort((a, b) => (b.models[m].adv ?? 0) - (a.models[m].adv ?? 0) || (b.r3?.[m]?.gate ?? 0) - (a.r3?.[m]?.gate ?? 0))[0]]));
  const sheet = (m, q) => `${MEDIA}eval/${m}/${q.slug}.sheet.jpg`;
  let PEEK = {}, warm = false;
  const peekHTML = m => PEEK[m] ??= (q => q
    ? `<div class="pk-hd">${mn(m)}<span class="mono">${q.qid}</span></div><div class="fb" style="background-image:url('${sheet(m, q)}')"></div>
       <div class="pk-cap">${esc(tSum(q))}</div><div class="pk-ft">${I(`最佳作品 · 本题 GSB ${f1(q.models[m].adv)} · 点击打开`, `Top output · GSB ${f1(q.models[m].adv)} on this prompt · click to open`)}</div>`
    : `<div class="pk-hd">${mn(m)}</div>`)(BEST[m]);
  const warmPeeks = () => { if (warm) return; warm = true; ORDER.forEach(m => { if (BEST[m]) new Image().src = sheet(m, BEST[m]); }); };
  const openBest = m => { if (!BEST[m]) return; peek.hide(); window.__goQ(BEST[m].qid, m); };

  const METRICS = () => ({
    gsb: { label: I('GSB 优势率', 'GSB win rate'), s: 'GSB', max: 100, fmt: f1, get: m => ({ v: LB[m].gsb_advantage_rate, ci: LB[m].ci?.gsb_advantage_rate, d: LB[m].delta?.gsb_advantage_rate, dci: LB[m].delta_ci?.gsb_advantage_rate }),
      def: I(`每题由 ${nJ} 家评审给所有模型的视频排序（正序、倒序各一次，抵消位置偏差），再拆成两两比较，胜 1、平 0.5、负 0 取平均。`,
        `For each prompt, each of the ${nJ} judges ranks every model's video (once forward, once reversed, to cancel position bias); rankings are split into pairwise comparisons scored win 1, tie 0.5, loss 0, then averaged.`) },
    gate: { label: I('门槛分 0-100', 'Gate score 0–100'), s: I('门槛分', 'Gate'), max: 100, fmt: f1, get: m => ({ v: R3L[m].gate, ci: R3L[m].gate_ci, d: R3L[m].gate_d, dci: R3L[m].gate_dci }),
      def: I('每题 0-100：Must 全过 = 60 + 40 × Nice 通过率；任一 Must 不通过则封顶在 60 以下（= 60 × Must 通过率），Nice 再多也抵不掉一条 Must；未判定的项不计。',
        '0–100 per prompt: if every Must passes, 60 + 40 × Nice pass rate; if any Must fails, capped below 60 (= 60 × Must pass rate) — no amount of Nice makes up for a failed Must; unjudged checks are excluded.') },
    rubric: { label: I('Rubric 通过率', 'Rubric pass rate'), s: 'Rubric', max: 100, fmt: f1, get: m => ({ v: R3L[m].rubric, ci: R3L[m].rubric_ci, d: R3L[m].rubric_d, dci: R3L[m].rubric_dci }),
      def: I('按 6 字段规范拆分（Priority / Dimension / Evidence / Type / Necessity），每条三家各判 1 或 0、取多数，没有 N/A；依赖声音的条目暂未送评（待音频录制），不计入。通过率按条数计、不加权。',
        'Written with the 6-field spec (Priority / Dimension / Evidence / Type / Necessity); each check is judged 1 or 0 by all three judges and decided by majority, with no N/A; audio-dependent checks are not judged yet (awaiting audio recording) and are excluded. Pass rate counts checks, unweighted.') },
    must: { label: I('Must 通过率', 'Must pass rate'), s: 'Must', max: 100, fmt: f1, get: m => ({ v: R3L[m].must, ci: R3L[m].must_ci, d: R3L[m].must_d, dci: R3L[m].must_dci }),
      def: I('Must 指 rubric 中标为 Must have 的判定项。', 'Must refers to rubric checks marked Must have.') },
    abs: { label: I('绝对分 0-3', 'Absolute score 0–3'), s: I('绝对分', 'Abs.'), max: 3, fmt: f2, get: m => ({ v: LB[m].abs_mean, ci: LB[m].ci?.abs_mean, d: LB[m].delta?.abs_mean, dci: LB[m].delta_ci?.abs_mean }),
      def: I('绝对分取三家中位数。', 'The absolute score is the median of the three judges.') },
  });

  function render() {
    PEEK = {};
    document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
    document.title = I('VideoBench · 模型评测看板', 'VideoBench · Model Evaluation Dashboard');
    $$('#lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
    const NAV = [['leaderboard', '排行榜', 'Leaderboard'], ['method', 'Rubrics 怎么拆', 'Rubrics'], ['core', 'hy4 vs Opus', 'hy4 vs Opus'], ['questions', '逐题结果', 'Per prompt'],
      ['methods', '评审方式', 'Methods'], ['breakdown', 'Rubric 拆解', 'Breakdown'], ['matrix', 'GSB 两两矩阵', 'Pairwise'], ['abs', '绝对分分布', 'Abs. scores'],
      ['vibe', 'Vibe 标签', 'Vibe tags'], ['agreement', '评审一致性', 'Agreement'], ['board', '多模型对比', 'Comparison'], ['bank', '题库', 'Prompt bank']];
    $('#secnav').innerHTML = NAV.map(([id, zh, en]) => `<a href="#${id}">${I(zh, en)}</a>`).join('');
    const MT = METRICS();
    const sec = (id, title, tag, body) => `<section class="sec" id="${id}"><div class="sec-head"><h2><a href="#${id}">${title}</a></h2>${tag ? `<span class="tag" data-tag>${tag}</span>` : ''}</div>${body}</section>`;

    $('#app').innerHTML = `
      <section class="intro" id="top">
        <div class="mark" id="mark" role="img" aria-label="VideoBench">
          <div class="mark-word"><span class="w-base">VideoBench</span><span class="w-fill" aria-hidden="true">Video<b>Bench</b></span><span class="w-glint" aria-hidden="true">VideoBench</span></div>
          <div class="mark-strip">${STRIP.map(([m, s, i], k) => `<i style="background-image:url('${MEDIA}eval/${m}/${s}.sheet.jpg');background-position:${framePos(i)};--k:${k}"></i>`).join('')}</div>
          <span class="mark-head"></span><span class="mark-tc"><i></i><span></span></span>
        </div>
        <h1 class="mark-sub">${I('模型评测看板', 'Model Evaluation Dashboard')}</h1>
        <div class="chips">${CATS.map(c => `<span class="chip">${esc(c)} <b>${M.cat_n[c]}</b></span>`).join('')}<span class="chip">${I('基准', 'Baseline')} ${mn(BASE)}</span></div>
        <p class="lede">${I(
          `题目来自 <a href="https://github.com/yihui-dev/awesome-opus5-5-videos" target="_blank" rel="noopener">awesome-opus5-5-videos</a>：模型把提示词写成 HTML 动画，录成视频后由 ${nJ} 家不参赛的评审模型（${M.judges.map(j => mn(j)).join('、')}）直接看视频判分。每题一套 Rubrics，逐条判通过 / 不通过；另做 GSB 多模型排序和 0-3 绝对分。`,
          `Prompts come from <a href="https://github.com/yihui-dev/awesome-opus5-5-videos" target="_blank" rel="noopener">awesome-opus5-5-videos</a>: each model turns a prompt into an HTML animation, which is recorded as a video and scored by ${nJ} non-competing judge models (${M.judges.map(j => mn(j)).join(', ')}) watching the video directly. Each prompt has its own rubric, judged check by check as pass / fail; we also run GSB multi-model ranking and a 0–3 absolute score.`)}</p>
        <details class="links"><summary class="chip">${I('相关链接', 'Related links')}</summary><div class="menu">
          <a href="https://github.com/yihui-dev/awesome-opus5-5-videos" target="_blank" rel="noopener">awesome-opus5-5-videos ↗</a>
          <a href="#bank">${I('全部题库', 'Full prompt bank')}</a><a href="#questions">${I('逐题结果', 'Per-prompt results')}</a></div></details>
        <div class="stats" id="stats"></div>
        <div class="steps" id="method">
          <div class="step-tabs" id="stepTabs">${[I('题库', 'Prompt bank'), I('生成与录屏', 'Generation & recording'), I('评审与计分', 'Judging & scoring')].map((t, i) => `<button class="${i ? '' : 'on'}" data-step="${i + 1}"><i>${i + 1}</i>${t}</button>`).join('')}</div>
          <div class="step on" data-step="1" id="step1"></div><div class="step" data-step="2" id="step2"></div><div class="step" data-step="3" id="step3"></div>
        </div>
      </section>
      ${sec('leaderboard', I('排行榜 Leaderboard', 'Leaderboard'), I('按 GSB 优势率排序 · 各评审方式独立出分，不做加权总分 · 括号内为 95% 置信区间', 'Sorted by GSB win rate · each judging method is scored separately, no weighted total · brackets show 95% confidence intervals'),
        `<div class="card"><div class="tabs" data-tabs></div><div class="card-body"><div class="chart-title"><div><h3 data-title></h3><p data-sub></p></div><div class="meta" data-meta></div></div><div class="vbars" data-bars></div><div class="vnames" data-names></div></div><div class="def" data-def></div></div>`)}
      ${sec('core', `${mn(CORE)} vs ${mn(BASE)}`, I('差值后带 * 表示 95% 置信区间不含 0（显著）', '* after a difference means the 95% CI excludes 0 (significant)'), '<div class="kpis" data-slot></div>')}
      ${sec('questions', I('逐题 Rubrics 与结果', 'Per-prompt rubrics and results'), I('一个题 → 一套 Rubrics → 每个模型一个结果 · 点击左侧题目切换', 'One prompt → one rubric → one result per model · pick a prompt on the left'),
        '<div class="card ex"><aside class="ex-side"><div class="ex-filters" data-filters></div><div class="ex-list" data-list></div></aside><div class="ex-main" data-main></div></div>')}
      ${sec('methods', I('不同评审方式给出的排名', 'Rankings by judging method'), I('同一批录屏，四种打分方式各自出分', 'Same recordings, four scoring methods'),
        '<div class="card scatter"><div class="tabs" data-tabs></div><div class="card-body"><div class="chart-title"><div><h3 data-title></h3><p data-sub></p></div></div><div data-plot></div><div class="ranks" data-ranks></div></div></div>')}
      ${sec('breakdown', I('Rubric 拆解', 'Rubric breakdown'), I('通过率 %，不含未形成多数的判定', 'Pass rate %, excluding checks without a majority'),
        '<div class="card"><div class="tabs" data-tabs></div><div class="card-body"><div class="chart-title"><div><h3 data-title></h3><p data-sub></p></div></div><div class="tbl-wrap" data-slot></div></div><div class="def" data-def></div></div>')}
      ${sec('matrix', I('GSB 两两矩阵', 'GSB pairwise matrix'), I('行模型对列模型的优势率 (W+0.5T)/N，按题等权；粗体带 * 为 95% CI 不含 50%。悬停看 G:S:B 与区间。', "Row model's win rate against the column model, (W+0.5T)/N, prompts weighted equally; bold with * means the 95% CI excludes 50%. Hover for G:S:B and the CI."),
        '<div class="card"><div class="card-body tbl-wrap" data-slot></div></div>')}
      ${sec('abs', I('绝对分分布（0-3，三评审中位数）', 'Absolute score distribution (0–3, median of three judges)'), I('颜色从红（0）到绿（3）。', 'Colour runs from red (0) to green (3).'), '<div class="card"><div class="card-body tbl-wrap" data-slot></div></div>')}
      ${sec('vibe', I('Vibe 标签密度（每 100 个作品出现次数）与 Tag Lift', 'Vibe tag density (per 100 outputs) and tag lift'),
        I(`Tag Lift = 该模型密度 − ${BASE} 密度。Pros 为正、Cons 为负是好事。`, `Tag lift = model density − ${BASE} density. Positive for pros and negative for cons is good. `) + NOTES.vibe, '<div class="card"><div class="tbl-wrap" data-slot></div></div>')}
      ${sec('agreement', I('评审一致性', 'Judge agreement'), '', `<div class="card"><div class="tbl-wrap" data-slot></div></div>
        <div class="sec-head" style="margin-top:22px"><h3 style="margin:0;font-size:15px">${I('各评审单独给出的 GSB 优势率', 'GSB win rate by individual judge')}</h3></div><div class="card"><div class="tbl-wrap" data-judges></div></div>`)}
      ${sec('board', I('多模型对比', 'Model comparison'), I(`按 GSB 优势率排序。每格上为数值，下为相对 ${BASE} 的差值。比率均为百分数。`, `Sorted by GSB win rate. Each cell shows the value, with the difference from ${BASE} below. Rates are percentages.`),
        `<div class="card"><div class="tbl-wrap"><table class="tbl" data-slot></table></div><div class="tbl-foot"><span data-legend></span><button class="btn" data-expand>${I('展开分数明细', 'Expand score breakdown')}</button></div><div class="def" data-def></div></div>`)}
      ${sec('bank', I('全部题库', 'Full prompt bank'), ' ', '<div class="card"><div class="bank-tools" data-tools></div><div class="tbl-wrap"><table class="tbl bank" data-slot></table></div><div class="more"><button class="btn" data-more></button></div></div>')}`;

    stopMark();
    stopMark = playhead($('#mark'));
    renderIntro(MT); renderLeaderboard(MT); renderCore(); renderQuestions(); renderMethods(MT); renderBreakdown();
    renderMatrix(); renderAbs(); renderVibe(); renderAgreement(); renderBoard(MT); renderBank();
    $('#foot').textContent = I(`评审：${M.judges.join(' / ')} · 数据来自 data/all.json 与 data/report_v2.json；Rubric 为 v3（data/rubric3.json）`,
      `Judges: ${M.judges.join(' / ')} · Data from data/all.json and data/report_v2.json; rubric is v3 (data/rubric3.json)`);
    wipe([$('#stats'), $('#method'), ...$$('section.sec > .card, section.sec > .kpis')]);
    reveal($$('section.sec > .sec-head'));
    watchNav();
    CH.set([['top', I('简介', 'Overview')], ...NAV.map(([id, zh, en]) => [id, I(zh, en)])]
      .map(([id, title]) => ({ title, el: $('#' + id) })).filter(c => c.el)
      .sort((a, b) => a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }

  function watchNav() {
    const nav = $('#secnav'), links = $$('a', nav);
    const place = slider(nav, 'a.on', 'nav-ind');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('on', on);
        if (on) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
      });
      place();
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const t = $(a.getAttribute('href')); if (t) io.observe(t); });
  }

  // ---------- intro & method ----------
  function renderIntro(MT) {
    const kAvg = M.gsb_consistency ? Object.values(M.gsb_consistency).reduce((a, b) => a + b, 0) / Object.values(M.gsb_consistency).length : null;
    const stats = [
      [I('参评模型', 'Models'), L.length, v => Math.round(v), I(`基准 ${short(BASE)}`, `baseline ${short(BASE)}`)],
      [I('已评测题目', 'Prompts evaluated'), M.n_B_eval, v => Math.round(v), I(`/ 题库 ${M.n_total} 题`, `of ${M.n_total} in the bank`)],
      [I('Rubric 判分项', 'Rubric checks'), R3.meta.n_items, v => Math.round(v), I(`每题 ${Math.round(R3.meta.n_items / M.n_B_eval)} 条左右`, `~${Math.round(R3.meta.n_items / M.n_B_eval)} per prompt`)],
      [I('GSB 显著可分', 'GSB separable pairs'), M.gsb_sig, v => `${Math.round(v)} / ${M.gsb_total}`, I('模型两两对比', 'pairwise model comparisons')],
      [I('评审一致性', 'Judge agreement'), R3.meta.kappa, v => `κ ${v.toFixed(2)}`, kAvg ? I(`GSB 正反序一致 ${kAvg.toFixed(0)}%`, `GSB forward/reverse agreement ${kAvg.toFixed(0)}%`) : ''],
    ];
    $('#stats').innerHTML = stats.map(([k, , , e]) => `<div class="stat"><small>${k}</small><b></b><em>${e}</em></div>`).join('');
    $$('#stats b').forEach((b, i) => {
      const s = stats[i][2](stats[i][1]);
      odo(b, s, { hold: true });
      onVisible(b, () => odo(b, s, { delay: 200 + i * 120 }));
    });

    $('#stepTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      $$('#stepTabs button').forEach(x => x.classList.toggle('on', x === b));
      $$('.step').forEach(s => s.classList.toggle('on', s.dataset.step === b.dataset.step));
    });
    const stCount = Object.fromEntries(Object.keys(ST).map(k => [k, P.filter(p => p.status === k).length]));
    const repo = '<a href="https://github.com/yihui-dev/awesome-opus5-5-videos" target="_blank" rel="noopener">awesome-opus5-5-videos</a>';
    $('#step1').innerHTML = `<p>${I(`题目来自 ${repo}。共 ${P.length} 题 · A 半 ${M.n_A}（Opus 出视频 ${M.n_A_video}）· B 半 ${M.n_B}（已评测 ${M.n_B_eval}）· 手工 ${M.n_manual} · 未纳入 ${M.n_excluded}（提示词仅部分公开）`,
      `Prompts come from ${repo}. ${P.length} prompts in total · Half A ${M.n_A} (Opus video ${M.n_A_video}) · Half B ${M.n_B} (${M.n_B_eval} evaluated) · hand-crafted ${M.n_manual} · excluded ${M.n_excluded} (prompt only partly public)`)}</p>
      <div class="chips">${Object.keys(ST).filter(k => stCount[k]).map(k => `<span class="chip">${tSt(k)} <b>${stCount[k]}</b></span>`).join('')}</div>
      <p>${I(`已评测 ${M.n_B_eval} 题按类别：`, `The ${M.n_B_eval} evaluated prompts by category: `)}${CATS.map(c => `${esc(c)} ${M.cat_n[c]}`).join(' · ')}</p>`;
    $('#step2').innerHTML = `<p>${I(`模型把提示词写成 HTML 动画，录成视频后由 ${nJ} 家不参赛的评审模型直接看视频判分。`, `Each model writes the prompt as an HTML animation; the recording is scored by ${nJ} non-competing judge models watching the video directly.`)}</p>
      <p>${esc(NOTES.stability)}</p><p>${esc(NOTES.rubricFail)}</p>
      <div class="card tbl-wrap" style="margin-top:14px"><table class="tbl"><tr><th>${I('模型', 'Model')}</th><th>${I('录像', 'Recording')}</th></tr>
      ${ORDER.map(m => `<tr><td>${mn(m)}</td><td>${Object.entries(RB[m].render).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}</td></tr>`).join('')}</table></div>`;

    const ds = R3.meta.dist, N = R3.meta.n_items;
    const fm = (o, tr = x => x) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(tr(k))} ${v}`).join('<br>');
    const FIELDS = [
      ['Criterion', I('一句能回答"是(1) / 否(0)"的判定句，每条只考一件事，写清看到 / 听到什么算满足，不用"流畅""精美"这类无法核对的词', 'A sentence answerable with yes (1) / no (0) that tests one thing only and states what must be seen / heard; no uncheckable words like "smooth" or "beautiful"'),
        I(`${N} 条 · 每题约 ${(N / R3.meta.n_prompts).toFixed(1)} 条`, `${N} checks · ~${(N / R3.meta.n_prompts).toFixed(1)} per prompt`)],
      ['Priority', I('<span class="pill must">Must have</span> 核心交付物，缺了作品就不算完成（主体对象、点名的关键要求、硬性数字 / 文字 / 数据、能正常出画面），每题 2-4 条、不超过一半；<span class="pill nice">Nice to have</span> 次要细节和加分项',
        '<span class="pill must">Must have</span> core deliverables without which the work is incomplete (main subject, explicitly named key requirements, hard numbers / text / data, renders at all), 2–4 per prompt and no more than half; <span class="pill nice">Nice to have</span> secondary details and bonuses'),
        `${fm(ds.p)}<br>${I(`平均每题 Must ${R3.meta.must_per_prompt} 条`, `${R3.meta.must_per_prompt} Must per prompt on average`)}`],
      ['Dimension', I('四选一，只选这条最主要在判的一项，一事一维，不跨维混填（见下表）', 'Pick exactly one — the main thing the check judges; one check, one dimension (see below)'), I('见下表', 'see below')],
      ['Evidence', I('判定依据从哪来：画面 / 旁白内容 / 画面或旁白 / 连续画面（动画过程、遮挡、节奏）/ 原生音频（音效、配乐、读音）/ 音画联合（声音与画面步骤同步）。提示词没提声音就不出音频类条目',
        'Where the verdict comes from: frames / narration / frames or narration / continuous frames (animation process, occlusion, pacing) / native audio (sound effects, music, pronunciation) / audio-visual sync (sound matched to visual steps). No audio checks unless the prompt mentions sound'), fm(ds.ev, tEv)],
      ['Type', I('Objective：按明确答案或可观察事实即可判定；Subjective：需要对质量下判断，也要写清标准。尽量多出 Objective', 'Objective: decidable from a clear answer or observable fact; Subjective: needs a quality judgement, with the standard spelled out. Prefer Objective'), fm(ds.type)],
      ['Necessity', I('Explicit：提示词原文直接写明的要求，每个明确要求都必须拆出；Implicit：按常识、学科或可用性推出来的要求（如文字不得被遮挡）', 'Explicit: stated in the prompt — every explicit requirement must become a check; Implicit: inferred from common sense, the subject or usability (e.g. text must not be covered)'), fm(ds.nec)],
    ];
    const DIM_DESC = [
      I('提示词给定的条件、数据、事实是否被正确复现；数值、文字、公式、知识、物理或几何关系有没有错', 'Whether conditions, data and facts from the prompt are reproduced correctly; any errors in numbers, text, formulas, knowledge, physics or geometry'),
      I('讲解或叙事的思路与顺序、因果说明、步骤之间的衔接、是否回应提示词点名的要点、有无总结', 'Order and reasoning of the explanation or narrative, causal explanation, transitions between steps, whether named points are addressed, whether there is a summary'),
      I('图形构造、3D 空间建模与镜头运镜、连续动态变化、分步视觉呈现、交互或物理模拟效果', 'Shape construction, 3D modelling and camera work, continuous motion, step-by-step visuals, interaction or physics simulation'),
      I('画面清晰无遮挡 / 出框 / 穿帮、3D 死角、版式配色、文字可读、旁白字幕准确、音画同步与整体节奏', 'Clear frames with nothing covered, out of frame or broken, no 3D blind spots, layout and colour, readable text, accurate narration and subtitles, audio-visual sync and overall pacing'),
    ];
    $('#step3').innerHTML = `<p>${I('GSB、绝对分、Rubric、Vibe 标签四套结果各自出分，不做加权总分；评审直接看完整录像。', 'GSB, absolute score, rubric and vibe tags are scored separately with no weighted total; judges watch the full recording.')}</p>
      <div class="grade">${[
        ['Rubric', I('逐条判 1 / 0', 'Binary per check'), I('每题一套 Rubrics，逐条判通过 / 不通过。每条三家各判 1 或 0、取多数，没有 N/A；通过率按条数计、不加权。', 'Each prompt has its own rubric, judged check by check as pass / fail. Each check is judged 1 or 0 by all three judges and decided by majority, with no N/A; pass rate counts checks, unweighted.')],
        ['GSB', I('多模型排序', 'Multi-model ranking'), MT.gsb.def],
        [I('绝对分', 'Absolute score'), I('0-3 分', '0–3 scale'), esc(NOTES.abs)],
        [I('Vibe 标签', 'Vibe tags'), 'Pros / Cons', esc(NOTES.vibe)],
      ].map(([t, k, d]) => `<div><h3>${t}</h3><div class="kind">${k}</div><p>${d}</p></div>`).join('')}</div>
      <h4>${I('Rubrics 怎么拆', 'How rubrics are written')} <span class="muted" style="font-weight:400">· ${I('出题人 gpt-5.5（不参赛）· 只看提示词，不看任何模型作品 · 每题一次拆完，格式不对重拆', 'written by gpt-5.5 (not competing) · from the prompt only, without seeing any model output · one pass per prompt, regenerated if malformed')}</span></h4>
      <p>${I('每道题拆成 <b>8-12 条</b>（最多 20 条）二元判定项。评审看完整录屏，每条只输出 <b>1（满足）或 0（不满足）</b>，没有 0.5，也没有 N/A；看不清、拿不准一律判 0。每条填 6 个字段：',
        'Each prompt is split into <b>8–12</b> (at most 20) binary checks. Judges watch the full recording and output only <b>1 (met) or 0 (not met)</b> per check — no 0.5 and no N/A; anything unclear or uncertain is judged 0. Each check has 6 fields:')}</p>
      <div class="card tbl-wrap"><table class="tbl"><tr><th style="width:130px">${I('字段', 'Field')}</th><th>${I('取值与填法', 'How to fill it')}</th><th class="num" style="width:230px">${I('40 题实际分布', 'Distribution over 40 prompts')}</th></tr>
        ${FIELDS.map(([f, d, v]) => `<tr><td><b>${f}</b></td><td style="white-space:normal">${d}</td><td class="num" style="white-space:normal">${v}</td></tr>`).join('')}</table></div>
      <h4>${I('Dimension 四个维度', 'The four dimensions')} <span class="muted" style="font-weight:400">${I('（全部题统一使用）', '(shared by all prompts)')}</span></h4>
      <div class="card tbl-wrap"><table class="tbl"><tr><th style="width:200px">${I('维度', 'Dimension')}</th><th>${I('判什么', 'What it judges')}</th><th class="num" style="width:120px">${I('条数', 'Checks')}</th></tr>
        ${DIMS.map((d, i) => `<tr><td><b>${tDim(d)}</b></td><td style="white-space:normal">${DIM_DESC[i]}</td><td class="num">${ds.dim[d] || 0}（${Math.round(100 * (ds.dim[d] || 0) / N)}%）</td></tr>`).join('')}</table></div>
      <div class="formula">${I('计分：每条三家评审各判一次取多数；通过率按条数计、不加权。门槛分（每题 0-100）= Must 全过时 60 + 40 × Nice 通过率，任一 Must 不通过则 60 × Must 通过率，Nice 再多也抵不掉一条 Must。<br>当前录屏没有音轨、评审也听不到声音，Evidence 为"原生音频 / 音画联合"的条目暂不送评（表中标 ♪，不计分），待录制加上音频后补判。',
        'Scoring: each check is judged once by each of the three judges and decided by majority; pass rate counts checks, unweighted. Gate score (0–100 per prompt) = 60 + 40 × Nice pass rate if every Must passes, otherwise 60 × Must pass rate — no amount of Nice makes up for a failed Must.<br>Recordings have no audio track yet and judges cannot hear sound, so checks whose Evidence is "native audio / audio-visual sync" are not judged (marked ♪, not scored) until audio is recorded.')}</div>`;
  }

  // ---------- leaderboard chart ----------
  function renderLeaderboard(MT) {
    const sec = $('#leaderboard'), bars = $('[data-bars]', sec), names = $('[data-names]', sec);
    const keys = ['gsb', 'gate', 'rubric', 'must', 'abs'];
    let shown = false, rank = null;
    bars.innerHTML = '<div class="ax"></div>' + ORDER.map(m => `<div class="vb" data-m="${m}"><div class="col" style="background:${COLOR[m]}"></div><div class="ci"></div><div class="val"><span class="vnum"></span><small></small></div></div>`).join('');
    names.innerHTML = ORDER.map((m, i) => `<div data-m="${m}" class="${m === CORE ? 'core' : ''}" style="--o:${i}"><span class="vlogo">${logo(m)}</span>${esc(m)}<small>${esc(tOrg(LB[m].org))}${m === BASE ? ` · ${I('基准', 'baseline')}` : ''}</small></div>`).join('');
    const H = '(100% - 48px)';
    const badge = (m, d) => {
      const host = $(`[data-m="${m}"]`, names);
      $('.rk', host)?.remove();
      host.insertAdjacentHTML('beforeend', `<b class="rk ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</b>`);
      const b = host.lastElementChild;
      setTimeout(() => b.remove(), 2300);
    };
    const draw = () => {
      const mt = MT[keys[S.lb]];
      const rows = ORDER.map(m => ({ m, ...mt.get(m) })).sort((a, b) => b.v - a.v);
      const base = mt.get(BASE).v;
      const pos = v => `calc(${(shown ? v : 0) / mt.max} * ${H})`;
      const flip = shown && rank && !REDUCE ? [...$$('.vb', bars), ...$$(':scope > [data-m]', names)].map(el => [el, el.getBoundingClientRect().left]) : [];
      rows.forEach((r, i) => {
        const b = $(`.vb[data-m="${r.m}"]`, bars);
        b.style.order = i;
        $(`[data-m="${r.m}"]`, names).style.order = i;
        $('.col', b).style.height = pos(r.v);
        const ci = $('.ci', b);
        ci.style.display = r.ci ? '' : 'none';
        if (r.ci) { ci.style.bottom = pos(r.ci[0]); ci.style.height = pos(r.ci[1] - r.ci[0]); }
        const val = $('.val', b);
        val.style.bottom = `calc(${pos(r.ci ? Math.max(r.v, r.ci[1]) : r.v)} + 6px)`;
        odo($('.vnum', val), mt.fmt(r.v), { hold: !shown, delay: i * 50 });
        $('small', val).innerHTML = r.m === BASE ? `<span class="ns">${I('基准', 'baseline')}</span>` : delta(r.d, r.dci, false, mt.fmt);
      });
      flip.forEach(([el, x0]) => {
        const dx = x0 - el.getBoundingClientRect().left;
        if (Math.abs(dx) > 1) el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 850, easing: 'cubic-bezier(.65,0,.25,1)' });
      });
      if (shown) {
        if (rank) rows.forEach((r, i) => { if (rank[r.m] !== i) badge(r.m, rank[r.m] - i); });
        rank = Object.fromEntries(rows.map((r, i) => [r.m, i]));
      }
      const step = mt.max === 3 ? 1 : 25;
      $('.ax', bars).innerHTML = Array.from({ length: mt.max / step + 1 }, (_, i) => `<div style="bottom:calc(${(i * step) / mt.max} * ${H})"><span>${i * step}</span></div>`).join('')
        + `<div class="base" style="bottom:calc(${base / mt.max} * ${H})"></div>`;
      $('[data-title]', sec).textContent = mt.label;
      $('[data-sub]', sec).textContent = I(`${mt.label} · 误差线为 95% 置信区间 · 虚线为基准 ${BASE} · 越高越好`, `${mt.label} · error bars show 95% CIs · dashed line is the baseline ${BASE} · higher is better`);
      $('[data-meta]', sec).innerHTML = `<span class="chip">${I(`${L.length} 个模型`, `${L.length} models`)}</span><span class="chip">${I(`${Q.length} 题`, `${Q.length} prompts`)}</span>`;
      $('[data-def]', sec).innerHTML = `<p><b>${mt.label}</b>${mt.def}</p><p>${I('Δ 带 * 表示相对基准显著（按题 bootstrap 95% 置信区间不含 0）。', 'Δ marked * is significant vs. the baseline (per-prompt bootstrap 95% CI excludes 0).')}${legend()}</p>`;
    };
    tabs($('[data-tabs]', sec), keys.map(k => MT[k].label), S.lb, i => { S.lb = i; draw(); });
    const card = $('.card', sec);
    const at = e => e.target.closest('.vb, .vnames > [data-m]')?.dataset.m;
    card.addEventListener('pointerover', e => {
      const m = at(e);
      card.classList.toggle('hl', !!m);
      $$('[data-m]', card).forEach(x => x.classList.toggle('hot', x.dataset.m === m));
    });
    card.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const m = at(e);
      if (!m) { peek.hide(); return; }
      warmPeeks();
      peek.show(peekHTML(m), e.clientX, e.clientY, 'wide');
    });
    card.addEventListener('pointerleave', () => { card.classList.remove('hl'); peek.hide(); });
    card.addEventListener('click', e => { const m = at(e); if (m) openBest(m); });
    draw();
    onVisible(bars, () => { shown = true; names.classList.add('shown'); requestAnimationFrame(draw); });
  }

  // ---------- core vs baseline ----------
  function renderCore() {
    const cb = RB[CORE], bb = RB[BASE], g = cb.gsb_vs_baseline;
    const v2 = k => ({ v: cb.metrics[k], b: bb.metrics[k], d: cb.deltas_vs_baseline[k], c: cb.deltas_ci95[k] });
    const v3 = k => ({ v: R3L[CORE][k], b: R3L[BASE][k], d: R3L[CORE][k + '_d'], c: R3L[CORE][k + '_dci'] });
    const K = [[I('GSB 优势率(对全体)', 'GSB win rate (vs all)'), v2('gsb_advantage_rate')], [I('首位率', 'First-place rate'), v2('first_place_rate')], [I('绝对分均值', 'Mean absolute score'), v2('abs_mean'), 0, f2],
      [I('高分率(≥2)', 'High-score rate (≥2)'), v2('high_score_rate')], [I('Must have 通过率', 'Must have pass rate'), v3('must')], [I('Nice to have 通过率', 'Nice to have pass rate'), v3('nice')],
      [I('Pros 密度', 'Pros density'), v2('pros_density')], [I('Cons 密度', 'Cons density'), v2('cons_density'), 1]];
    $('#core [data-slot]').innerHTML = (g ? `<div class="kpi wide"><small>${I('直接 GSB', 'Head-to-head GSB')}</small><b data-odo="${g.G} : ${g.S} : ${g.B}"></b><span>${I(`G:S:B，优势率 ${f1(g.advantage_rate)}%（CI ${g.ci95 ? g.ci95.join('~') : '—'}），净胜率 ${f1(g.net_win_rate)}%`, `G:S:B, win rate ${f1(g.advantage_rate)}% (CI ${g.ci95 ? g.ci95.join('~') : '—'}), net win rate ${f1(g.net_win_rate)}%`)}</span></div>` : '')
      + K.map(([n, x, lb, fm = f1]) => `<div class="kpi"><small>${n}</small><b data-odo="${fm(x.v)}"></b><span>${esc(BASE)} ${fm(x.b)}${I('，', ', ')}Δ ${delta(x.d, x.c, lb, fm)}</span></div>`).join('');
    $$('#core [data-odo]').forEach((b, i) => {
      odo(b, b.dataset.odo, { hold: true });
      onVisible(b, () => odo(b, b.dataset.odo, { delay: i * 60 }));
    });
  }

  // ---------- question explorer ----------
  function renderQuestions() {
    const sec = $('#questions'), fl = $('[data-filters]', sec), list = $('[data-list]', sec), main = $('[data-main]', sec);
    fl.innerHTML = [['', I('全部', 'All'), Q.length], ...CATS.map(c => [c, c, M.cat_n[c]])].map(([v, n, k]) => `<button class="chip ${v === S.qCat ? 'on' : ''}" data-c="${v}">${esc(n)} · ${k}</button>`).join('')
      + `<select data-diff><option value="">${I('全部难度', 'All difficulties')}</option>${['简单', '中等', '困难'].map(d => `<option value="${d}">${tDiff(d)}</option>`).join('')}</select>
         <select data-sort><option value="">${I('默认顺序', 'Default order')}</option><option value="disc">${I('模型差距最大的在前', 'Largest model spread first')}</option><option value="hy">${I('hy4 与 Opus 差距最大的在前', 'Largest hy4–Opus gap first')}</option><option value="hard">${I('最难的在前', 'Hardest first')}</option></select>`;
    const disc = q => { const a = Object.values(q.models).map(d => d.adv || 0); return Math.max(...a) - Math.min(...a); };
    const hyd = q => Math.abs((q.models[CORE]?.adv || 0) - (q.models[BASE]?.adv || 0));
    const renderList = () => {
      const d = $('[data-diff]', fl).value, s = $('[data-sort]', fl).value;
      let l = Q.filter(q => (!S.qCat || q.category === S.qCat) && (!d || q.diff === d));
      if (s === 'disc') l = [...l].sort((a, b) => disc(b) - disc(a));
      if (s === 'hy') l = [...l].sort((a, b) => hyd(b) - hyd(a));
      if (s === 'hard') l = [...l].sort((a, b) => (a.abs_avg || 0) - (b.abs_avg || 0));
      list.innerHTML = l.map(q => `<div class="ex-item ${q.slug === S.q ? 'on' : ''}" data-slug="${q.slug}">
        <span class="qid">${q.qid}</span><span class="qt">${esc(tSum(q))}</span>
        <div class="row"><span class="pill">${esc(q.category)}</span><span class="pill ${diffCls(q.diff)}">${esc(tDiff(q.diff))}</span>
          <span class="spark" title="${I('本题 GSB 优势率', 'GSB win rate on this prompt')}">${ORDER.filter(m => q.models[m]).map((m, j) => `<i style="height:${Math.max(2, (q.models[m].adv || 0) / 100 * 16)}px;background:${COLOR[m]};--d:${j}" title="${short(m)} ${f1(q.models[m].adv)}"></i>`).join('')}</span></div></div>`).join('')
        || `<p class="muted" style="padding:16px">${I('没有符合条件的题目', 'No matching prompts')}</p>`;
    };
    const meta = it => `${esc(tDim(it.dim))} · ${esc(tEv(it.ev))} · ${esc(it.type)} · ${esc(it.nec)}`;
    const paneWork = q => {
      const ms = ORDER.filter(m => q.models[m]);
      if (!q.models[S.m]) S.m = ms[0];
      const m = S.m, d = q.models[m], r = q.r3?.[m] || {};
      return `<div class="label">${I('模型', 'Model')}</div>
        <div class="model-pills">${ms.map(x => `<button data-m="${x}" class="${x === m ? 'on' : ''}">${logo(x)}${short(x)} <em>${Math.round(q.models[x].adv ?? 0)}</em></button>`).join('')}</div>
        <div class="sub-grid anim">
          <div>
            ${vp(q, m, true)}
            <div class="figs"><span>${I('门槛分', 'Gate')} <b>${r.gate != null ? Math.round(r.gate) : '—'}</b></span><span>${I('绝对分', 'Abs.')} <b>${d.score ?? '—'}</b></span><span>Rubric <b>${passN(q, m)} / ${scored(q).length}</b></span><span>Must <b>${f1(r.must)}%</b></span><span>${I('本题 GSB', 'GSB here')} <b>${f1(d.adv)}</b></span><a href="${MEDIA}eval/${m}/${q.slug}.html" target="_blank" rel="noopener">HTML ↗</a></div>
            <div class="label">${I('Vibe 标签', 'Vibe tags')}</div>
            <div class="tags">${[...(d.pros || []), ...(d.cons || [])].map(tag).join('') || '<span class="muted">—</span>'}</div>
            <div class="label">${I('评审评语', 'Judge comments')}</div>
            <div class="notes">${d.note ? d.note.split(' | ').map(x => { const [j, ...t] = x.split(': '); return t.length ? `<div><b>${logo(j)}${esc(j)}</b>${esc(t.join(': '))}</div>` : `<div>${esc(x)}</div>`; }).join('') : '<div class="muted">—</div>'}</div>
          </div>
          <div>
            <div class="label">${I('判分', 'Verdicts')} · ${esc(m)}</div>
            <ul class="items">${q.items.map((it, i) => `<li style="--i:${i}">${it.audio ? audioMark() : mark(it.r[m])}<span>${prio(it.p)} ${esc(it.c)}<small>${meta(it)}</small></span></li>`).join('')}</ul>
            ${zhNote()}
          </div>
        </div>`;
    };
    const panePrompt = q => `<div class="label">${I('题目', 'Prompt')}</div><div class="prompt" title="${I('点击展开 / 收起', 'Click to expand / collapse')}">${esc(q.prompt)}</div>
      <p class="muted" style="font-size:12.5px">${esc(tSum(q))} · @${esc(q.author)} · ${esc(q.slug)}${q.post_url ? ` · <a href="${esc(q.post_url)}" target="_blank" rel="noopener">${I('原帖', 'Original post')}</a>` : ''}</p>`;
    const paneAll = q => {
      const ms = ORDER.filter(m => q.models[m]);
      const n = scored(q).length, au = q.items.length - n;
      return `<div class="label">${I('Rubrics 与各模型判分结果（三家评审多数票）', 'Rubric and verdicts per model (majority of three judges)')}</div>
        <div class="card tbl-wrap"><table class="tbl rub">
          <tr><th>${I('判分标准', 'Check')}</th>${ms.map(m => `<th class="${m === S.m ? 'on' : ''}">${mn(m, short(m))}</th>`).join('')}</tr>
          ${q.items.map((it, i) => `<tr><td>${i + 1}. ${prio(it.p)} ${esc(it.c)}<small>${meta(it)}</small></td>${ms.map((m, j) => `<td class="${m === S.m ? 'on' : ''}" style="--d:${i + j}">${it.audio ? audioMark() : mark(it.r[m])}</td>`).join('')}</tr>`).join('')}
          <tr class="total"><td>${I(`通过项（共 ${n} 条${au ? `，另 ${au} 条待音频` : ''}）`, `Passed (${n} checks${au ? `, ${au} more awaiting audio` : ''})`)}</td>${ms.map(m => `<td>${passN(q, m)} / ${n}</td>`).join('')}</tr>
          <tr class="total"><td>${I('Must 通过率', 'Must pass rate')}</td>${ms.map(m => `<td>${f1(q.r3?.[m]?.must)}</td>`).join('')}</tr>
          <tr class="total"><td>${I('门槛分 0-100', 'Gate score 0–100')}</td>${ms.map(m => { const g = q.r3?.[m]?.gate; return `<td style="color:${g < 60 ? 'var(--bad)' : 'inherit'}">${g != null ? Math.round(g) : '—'}</td>`; }).join('')}</tr>
          <tr class="total"><td>${I('绝对分 0-3', 'Absolute score 0–3')}</td>${ms.map(m => `<td>${q.models[m].score ?? '—'}</td>`).join('')}</tr>
          <tr class="total"><td>${I('本题 GSB 优势率', 'GSB win rate (this prompt)')}</td>${ms.map(m => `<td>${f1(q.models[m].adv)}</td>`).join('')}</tr>
        </table></div>${zhNote()}
        <div class="label">${I('各模型结果（点击画面在本页播放）', 'Results per model (click to play)')}</div>
        <div class="tiles">${ms.map(m => { const d = q.models[m]; return `<div class="tile">
          <div class="hd"><b>${mn(m)}</b><span class="pill ${d.adv >= 70 ? 'easy' : d.adv < 40 ? 'hard' : ''}">GSB ${f1(d.adv)}</span></div>
          ${vp(q, m)}
          <div class="bd"><div class="figs" style="margin-top:0"><span>${I('门槛分', 'Gate')} <b>${q.r3?.[m]?.gate != null ? Math.round(q.r3[m].gate) : '—'}</b></span><span>${I('绝对分', 'Abs.')} <b>${d.score ?? '—'}</b></span><a href="${MEDIA}eval/${m}/${q.slug}.html" target="_blank" rel="noopener">HTML</a></div></div></div>`; }).join('')}</div>`;
    };
    const renderMain = zap => {
      const q = QS[S.q];
      main.innerHTML = `<div class="ex-head"><div class="qid">${q.qid}</div><h3>${esc(tSum(q))}</h3>
          <div class="meta"><span class="pill">${esc(q.category)}</span> <span class="pill ${diffCls(q.diff)}">${esc(tDiff(q.diff))}</span> · @${esc(q.author)}${q.post_url ? ` · <a href="${esc(q.post_url)}" target="_blank" rel="noopener">${I('原帖', 'Original post')}</a>` : ''}</div></div>
        <div class="ex-tabs">${[['work', I('作品与判分', 'Output & verdicts')], ['prompt', I('题目', 'Prompt')], ['all', I('对比全部模型', 'Compare all models')]].map(([k, n]) => `<button data-p="${k}" class="${k === S.pane ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="ex-pane anim">${S.pane === 'work' ? paneWork(q) : S.pane === 'prompt' ? panePrompt(q) : paneAll(q)}</div>`;
      if (zap) tvStatic($('.vp.big', main));
    };
    const select = (slug, scroll) => {
      S.q = slug;
      $$('.ex-item', list).forEach(x => x.classList.toggle('on', x.dataset.slug === slug));
      renderMain(true);
      if (scroll) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    fl.addEventListener('click', e => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      $$('[data-c]', fl).forEach(x => x.classList.toggle('on', x === b));
      S.qCat = b.dataset.c;
      renderList();
    });
    fl.addEventListener('change', renderList);
    list.addEventListener('click', e => { const it = e.target.closest('.ex-item'); if (it) select(it.dataset.slug); });
    main.addEventListener('click', e => {
      const p = e.target.closest('[data-p]');
      if (p) { S.pane = p.dataset.p; renderMain(); return; }
      const m = e.target.closest('.model-pills [data-m]');
      if (m) { if (m.dataset.m !== S.m) { S.m = m.dataset.m; renderMain(true); } return; }
      const pr = e.target.closest('.prompt');
      if (pr) pr.classList.toggle('open');
    });
    renderList();
    renderMain();
    window.__goQ = (qid, m) => {
      const q = Q.find(x => x.qid === qid);
      if (!q) return;
      if (m && q.models[m]) { S.m = m; S.pane = 'work'; }
      S.qCat = '';
      $$('[data-c]', fl).forEach((x, i) => x.classList.toggle('on', i === 0));
      $('[data-diff]', fl).value = '';
      renderList();
      select(q.slug, true);
    };
  }

  // ---------- methods scatter ----------
  function renderMethods(MT) {
    const sec = $('#methods'), plot = $('[data-plot]', sec);
    const PAIRS = [['gate', 'gsb'], ['rubric', 'gsb'], ['abs', 'gsb'], ['rubric', 'abs']];
    const W = 860, Hh = 440, ml = 56, mr = 24, mt = 16, mb = 46;
    const nice = (lo, hi) => { const r = hi - lo, s = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25].find(x => r / x <= 6) || 25; return { lo: Math.floor(lo / s) * s, hi: Math.ceil(hi / s) * s, s }; };
    const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    plot.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}"><rect class="quad"/><text class="quad-t"></text><g class="grid"></g><g class="axis"></g>`
      + ORDER.map(m => `<g class="pt" data-m="${m}"><line class="dl dx"/><line class="dl dy"/><line class="h" stroke="${COLOR[m]}" stroke-width="2" opacity=".5"/><line class="v" stroke="${COLOR[m]}" stroke-width="2" opacity=".5"/>
        <circle class="ring" r="13" fill="none" stroke="${COLOR[m]}" stroke-width="2"/><circle r="13" fill="#fff" stroke="${COLOR[m]}" stroke-width="2.5"/><svg x="-8" y="-8" width="16" height="16" viewBox="0 0 24 24" fill="#141413" fill-rule="evenodd">${logoInner(m)}</svg>
        <text x="17" y="-12">${esc(short(m))}</text></g>`).join('') + '</svg>';
    const svg = $('svg', plot);
    const draw = i => {
      S.sc = i;
      const [kx, ky] = PAIRS[i], mx = MT[kx], my = MT[ky];
      const pts = ORDER.map(m => ({ m, x: mx.get(m), y: my.get(m) }));
      const ext = (k, metric) => { const vals = pts.flatMap(p => [p[k].v, ...(p[k].ci || [])]); return nice(Math.max(0, Math.min(...vals)), Math.min(metric.max, Math.max(...vals))); };
      const dx = ext('x', mx), dy = ext('y', my);
      const X = v => ml + ((Math.max(dx.lo, Math.min(dx.hi, v)) - dx.lo) / (dx.hi - dx.lo)) * (W - ml - mr);
      const Y = v => mt + (1 - (Math.max(dy.lo, Math.min(dy.hi, v)) - dy.lo) / (dy.hi - dy.lo)) * (Hh - mt - mb);
      let grid = '', axis = '';
      for (let v = dy.lo; v <= dy.hi + 1e-9; v += dy.s) { grid += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}"/>`; axis += `<text x="${ml - 8}" y="${Y(v) + 4}" text-anchor="end">${+v.toFixed(2)}</text>`; }
      for (let v = dx.lo; v <= dx.hi + 1e-9; v += dx.s) { grid += `<line y1="${mt}" y2="${Hh - mb}" x1="${X(v)}" x2="${X(v)}"/>`; axis += `<text x="${X(v)}" y="${Hh - mb + 18}" text-anchor="middle">${+v.toFixed(2)}</text>`; }
      axis += `<text class="t" x="${W - mr}" y="${Hh - 6}" text-anchor="end">${mx.label} →</text><text class="t" transform="translate(14 ${Hh - mb}) rotate(-90)">${my.label} →</text>`;
      $('.grid', svg).innerHTML = grid;
      $('.axis', svg).innerHTML = axis;
      const qx = X(median(pts.map(p => p.x.v))), qy = Y(median(pts.map(p => p.y.v)));
      const quad = $('.quad', svg);
      Object.entries({ x: qx, y: mt, width: W - mr - qx, height: qy - mt }).forEach(([k, v]) => quad.setAttribute(k, v));
      const qt = $('.quad-t', svg);
      qt.setAttribute('x', W - mr - 8); qt.setAttribute('y', mt + 16); qt.setAttribute('text-anchor', 'end');
      qt.textContent = I('两项都高于中位数', 'Above median on both');
      pts.forEach(p => {
        const el = $(`.pt[data-m="${p.m}"]`, svg), cx = X(p.x.v), cy = Y(p.y.v);
        el.style.transform = `translate(${cx}px, ${cy}px)`;
        const h = $('.h', el), v = $('.v', el);
        const xc = p.x.ci || [p.x.v, p.x.v], yc = p.y.ci || [p.y.v, p.y.v];
        h.setAttribute('x1', X(xc[0]) - cx); h.setAttribute('x2', X(xc[1]) - cx); h.setAttribute('y1', 0); h.setAttribute('y2', 0);
        v.setAttribute('y1', Y(yc[0]) - cy); v.setAttribute('y2', Y(yc[1]) - cy); v.setAttribute('x1', 0); v.setAttribute('x2', 0);
        const dx = $('.dx', el), dy = $('.dy', el);
        dx.setAttribute('x1', 0); dx.setAttribute('y1', 0); dx.setAttribute('x2', ml - cx); dx.setAttribute('y2', 0);
        dy.setAttribute('x1', 0); dy.setAttribute('y1', 0); dy.setAttribute('x2', 0); dy.setAttribute('y2', Hh - mb - cy);
      });
      $('[data-title]', sec).textContent = `${my.label} vs ${mx.label}`;
      $('[data-sub]', sec).textContent = I(`${my.label} · ${mx.label} · 十字线为各自的 95% 置信区间`, `${my.label} · ${mx.label} · crosshairs show each metric's 95% CI`);
    };
    tabs($('[data-tabs]', sec), PAIRS.map(([x, y]) => `${MT[y].label} vs ${MT[x].label}`), S.sc, draw);
    draw(S.sc);
    const card = $('.card', sec);
    svg.addEventListener('pointerover', e => {
      const m = e.target.closest('.pt')?.dataset.m;
      card.classList.toggle('hl', !!m);
      $$('.pt', svg).forEach(p => p.classList.toggle('hot', p.dataset.m === m));
    });
    svg.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const m = e.target.closest('.pt')?.dataset.m;
      if (!m) { peek.hide(); return; }
      warmPeeks();
      peek.show(peekHTML(m), e.clientX, e.clientY, 'wide');
    });
    svg.addEventListener('pointerleave', () => { card.classList.remove('hl'); peek.hide(); });
    svg.addEventListener('click', e => { const m = e.target.closest('.pt')?.dataset.m; if (m) openBest(m); });

    const ranksOf = k => { const vals = ORDER.map(m => MT[k].get(m).v); return vals.map(v => vals.filter(x => x > v).length + (vals.filter(x => x === v).length + 1) / 2); };
    const spear = (a, b) => { const ra = ranksOf(a), rb = ranksOf(b), n = ra.length, ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
      let num = 0, da = 0, db = 0; ra.forEach((x, i) => { num += (x - ma) * (rb[i] - mb); da += (x - ma) ** 2; db += (rb[i] - mb) ** 2; }); return num / Math.sqrt(da * db); };
    const order = k => [...ORDER].sort((a, b) => MT[k].get(b).v - MT[k].get(a).v).map(short).join(' > ');
    $('[data-ranks]', sec).innerHTML = `${I('不同评审方式给出的排名：', 'Ranking by method:')}${['gsb', 'abs', 'gate', 'rubric', 'must'].map(k => `<br><b>${MT[k].label}</b>${order(k)}`).join('')}
      <br>${I('方法间 Spearman：', 'Spearman between methods: ')}${[['gsb', 'abs'], ['gsb', 'gate'], ['gsb', 'rubric'], ['gsb', 'must'], ['abs', 'rubric'], ['rubric', 'must']].map(([a, b]) => `${MT[a].s}-${MT[b].s} ${spear(a, b).toFixed(2)}`).join(I('，', ', '))}`;
  }

  // ---------- rubric breakdown ----------
  function renderBreakdown() {
    const sec = $('#breakdown'), slot = $('[data-slot]', sec);
    const all = Q.flatMap(q => q.items.filter(i => !i.audio));
    const rate = (m, f) => { let y = 0, n = 0; all.filter(f).forEach(i => { if (i.r[m] === true) { y++; n++; } else if (i.r[m] === false) n++; }); return n ? (100 * y) / n : null; };
    const by = (field, cols, tr = x => x) => cols.map(c => ({ c: tr(c), n: all.filter(i => i[field] === c).length, v: m => rate(m, i => i[field] === c) }));
    const distinct = f => [...new Set(all.map(i => i[f]))].sort((a, b) => all.filter(i => i[f] === b).length - all.filter(i => i[f] === a).length);
    const VIEWS = [
      { t: I('按题目类别（GSB 优势率）', 'By category (GSB win rate)'), sub: I('分类列是该类题目上的 GSB 优势率', 'GSB win rate on the prompts of each category'),
        cols: [...CATS.map(c => ({ c, n: I(`${M.cat_n[c]} 题`, `${M.cat_n[c]} prompts`), v: m => LB[m].by_cat[c] })), { c: I('全部', 'All'), n: I(`${Q.length} 题`, `${Q.length} prompts`), v: m => LB[m].gsb_advantage_rate }] },
      { t: I('按 Dimension', 'By dimension'), sub: I('Rubric 通过率，按判定项所属维度', "Rubric pass rate by the check's dimension"), cols: by('dim', DIMS, tDim) },
      { t: I('按 Priority', 'By priority'), sub: I('Rubric 通过率，Must have / Nice to have', 'Rubric pass rate, Must have / Nice to have'), cols: by('p', ['Must have', 'Nice to have']) },
      { t: I('按 Evidence', 'By evidence'), sub: I('Rubric 通过率，按判定依据来源', 'Rubric pass rate by evidence source'), cols: by('ev', distinct('ev'), tEv) },
      { t: I('按 Type', 'By type'), sub: I('Rubric 通过率，Objective / Subjective', 'Rubric pass rate, Objective / Subjective'), cols: by('type', distinct('type')) },
      { t: I('按 Necessity', 'By necessity'), sub: I('Rubric 通过率，Explicit / Implicit', 'Rubric pass rate, Explicit / Implicit'), cols: by('nec', distinct('nec')) },
    ];
    const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
    const color = t => { const c = t < .5 ? mix([204, 98, 64], [240, 238, 230], t * 2) : mix([240, 238, 230], [59, 127, 77], (t - .5) * 2); return `background:rgb(${c});color:${Math.abs(t - .5) > .32 ? '#fff' : 'var(--ink)'}`; };
    const draw = i => {
      S.bd = i;
      const vw = VIEWS[i];
      const vals = vw.cols.map(col => ORDER.map(m => col.v(m)));
      let k = 0;
      slot.innerHTML = `<table class="heat in"><tr><th></th>${vw.cols.map(c => `<th>${esc(c.c)}<small>${typeof c.n === 'number' ? I(`${c.n} 条`, `${c.n} checks`) : c.n}</small></th>`).join('')}</tr>
        ${ORDER.map((m, r) => `<tr><th class="row">${mn(m)}</th>${vw.cols.map((c, j) => {
          const v = vals[j][r], col = vals[j].filter(x => x != null), lo = Math.min(...col), hi = Math.max(...col);
          return `<td data-r="${r}" data-j="${j}" style="${v == null ? '' : color(hi > lo ? (v - lo) / (hi - lo) : .5)};--i:${k++}">${f1(v)}</td>`;
        }).join('')}</tr>`).join('')}</table>`;
      const tb = $('table', slot);
      if (!REDUCE) { tb.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => tb.classList.add('in'))); }
      setTimeout(() => tb.classList.add('done'), REDUCE ? 0 : 1400);
      crosshair(tb, td => {
        const r = +td.dataset.r, j = +td.dataset.j, v = vals[j][r];
        return `<div class="pk-hd" style="margin-bottom:4px">${mn(ORDER[r])}</div>${esc(vw.cols[j].c)} · <b>${f1(v)}</b><div class="pk-ft">${esc(vw.sub)}</div>`;
      });
      $('[data-title]', sec).textContent = vw.t;
      $('[data-sub]', sec).textContent = vw.sub;
    };
    tabs($('[data-tabs]', sec), VIEWS.map(v => v.t), S.bd, draw);
    $('[data-def]', sec).innerHTML = `<p>${I('每列在所有模型间归一化：绿色为该列最高，红色为该列最低。Rubric 为 v3（6 字段规范、只判 1 / 0），依赖声音的条目不计入。', "Each column is normalized across models: green is the column's highest, red its lowest. Rubric is v3 (6-field spec, 1 / 0 only); audio-dependent checks are excluded.")}</p>`;
    onVisible(sec, () => draw(S.bd));
  }

  // ---------- GSB matrix ----------
  function renderMatrix() {
    const PM = {};
    RV.gsb_pairs.forEach(p => {
      PM[p.a + '|' + p.b] = p;
      PM[p.b + '|' + p.a] = { ...p, adv: 100 - p.adv, ci95: p.ci95 && [100 - p.ci95[1], 100 - p.ci95[0]], G: p.B, B: p.G };
    });
    const heat = v => { const a = Math.min(1, Math.pow(Math.abs(v - 50) / 50, .8)) * .9 + .05; return `background:${v >= 50 ? `rgba(59,127,77,${a})` : `rgba(204,98,64,${a})`};color:${a > .5 ? '#fff' : 'var(--ink)'}`; };
    let k = 0;
    $('#matrix [data-slot]').innerHTML = `<table class="heat"><tr><th></th>${ORDER.map(m => `<th>${mn(m, short(m))}</th>`).join('')}</tr>
      ${ORDER.map(a => `<tr><th class="row">${mn(a, short(a))}</th>${ORDER.map(b => {
        if (a === b) return '<td class="self">-</td>';
        const p = PM[a + '|' + b];
        if (!p) return '<td class="self">-</td>';
        return `<td class="${p.significant ? 'sig' : ''}" data-a="${a}" data-b="${b}" style="${heat(p.adv)};--i:${k++}">${f1(p.adv)}${p.significant ? '*' : ''}</td>`;
      }).join('')}</tr>`).join('')}</table>`;
    const tb = $('#matrix .heat');
    crosshair(tb, td => {
      const { a, b } = td.dataset, p = PM[a + '|' + b];
      return p ? `<div class="pk-hd" style="justify-content:flex-start;margin-bottom:4px">${mn(a, short(a))}<span class="mono">vs</span>${mn(b, short(b))}</div>
        ${I('优势率', 'Win rate')} <b>${f1(p.adv)}${p.significant ? '*' : ''}</b> · G:S:B ${p.G}:${p.S}:${p.B}<div class="pk-ft">95% CI ${p.ci95 ? p.ci95.join(' ~ ') : '—'}${p.significant ? I(' · 显著', ' · significant') : ''}</div>` : '';
    });
    onVisible($('#matrix'), () => { tb.classList.add('in'); setTimeout(() => tb.classList.add('done'), REDUCE ? 0 : 1300); });
  }

  // ---------- abs distribution ----------
  function renderAbs() {
    const DC = { '0': '#b9553d', '0.5': '#c76e3c', '1': '#d18e46', '1.5': '#d8b260', '2': '#8aab67', '2.5': '#58945b', '3': '#3b7f4d' };
    const judges = Object.keys(A.per_judge_scores);
    $('#abs [data-slot]').innerHTML = `<table class="tbl"><tr><th>${I('模型', 'Model')}</th><th>${I('分布', 'Distribution')}</th><th class="num">${I('均值', 'Mean')}</th><th>${I('各评审均分', 'Mean by judge')}</th></tr>
      ${ORDER.map(m => { const d = RB[m].abs_dist, n = Object.values(d).reduce((a, b) => a + b, 0);
        return `<tr class="${m === CORE ? 'core' : m === BASE ? 'base' : ''}"><td class="model">${mn(m)}</td>
          <td><div class="dist">${Object.keys(DC).filter(k => d[k]).map(k => `<span data-g="${d[k]}" style="flex-grow:${REDUCE ? d[k] : 0};background:${DC[k]}" title="${I(`${k} 分：${d[k]} 题（${Math.round((d[k] / n) * 100)}%）`, `score ${k}: ${d[k]} prompts (${Math.round((d[k] / n) * 100)}%)`)}"></span>`).join('')}</div></td>
          <td class="num"><b>${f2(RB[m].metrics.abs_mean)}</b></td><td class="muted">${judges.map(j => `${mn(j)} ${f2(A.per_judge_scores[j].abs[m])}`).join(' · ')}</td></tr>`; }).join('')}</table>
      <div class="legend">${Object.entries(DC).filter(([k]) => ORDER.some(m => RB[m].abs_dist[k])).map(([k, c]) => `<span><i class="sw" style="background:${c}"></i>${I(`${k} 分`, `${k} pts`)}</span>`).join('')}</div>`;
    onVisible($('#abs'), () => $$('#abs .dist span').forEach(s => { s.style.flexGrow = s.dataset.g; }));
  }

  // ---------- vibe tags ----------
  function renderVibe() {
    const V = RV.vibe_dict, cb = RB[CORE];
    $('#vibe [data-slot]').innerHTML = `<table class="tbl"><tr><th>${I('标签', 'Tag')}</th>${ORDER.map(m => `<th class="num">${mn(m, short(m))}</th>`).join('')}<th class="num">${short(CORE)} Lift</th></tr>
      ${Object.keys(V).map(t => { const row = ORDER.map(m => RB[m].tag_density[t] || 0), hi = Math.max(...row, 1), pros = V[t].kind === 'pros';
        return `<tr><td><span class="pill ${V[t].kind}">${esc(t)}</span> ${esc(I(V[t].text, EN.vibe[t] || V[t].text))}</td>${row.map(v => `<td class="num" style="background:rgba(${pros ? '59,127,77' : '204,98,64'},${((v / hi) * .28).toFixed(3)})">${f1(v)}</td>`).join('')}
          <td class="num">${cb ? delta(cb.tag_lift_vs_baseline[t], [cb.tag_lift_vs_baseline[t], cb.tag_lift_vs_baseline[t]], !pros) : '—'}</td></tr>`; }).join('')}</table>`;
  }

  // ---------- agreement ----------
  function renderAgreement() {
    const ent = o => Object.entries(o || {});
    const jl = k => mn(k);
    const rows = [
      [I('Rubric 三评审 Fleiss κ（v3）', 'Rubric Fleiss κ, three judges (v3)'), I(`${R3.meta.kappa}（${R3.meta.kappa_n} 个判定）`, `${R3.meta.kappa} (${R3.meta.kappa_n.toLocaleString('en')} verdicts)`)],
      [I('Rubric 各评审通过率（v3）', 'Rubric pass rate per judge (v3)'), ent(R3.meta.judge_pass_rate).map(([k, v]) => `${jl(k)} ${f1(v)}%`).join(I('，', ', '))],
      [I('绝对分完全一致 / 差≤1', 'Absolute score: exact agreement / within 1'), Object.keys(A.abs_exact_agree).map(k => `${esc(k)} ${f1(A.abs_exact_agree[k])}% / ${f1(A.abs_within1_agree[k])}%`).join(I('，', ', '))],
      [I('各评审绝对分均值（松紧）', 'Mean absolute score per judge (leniency)'), ent(A.abs_mean_by_judge).map(([k, v]) => `${jl(k)} ${v}`).join(I('，', ', '))],
      [I('GSB 同评审正反序一致', 'GSB forward/reverse consistency (same judge)'), ent(A.gsb_fwd_rev_consistency).map(([k, v]) => `${jl(k)} ${f1(v)}%`).join(I('，', ', '))],
      ...['gsb', 'abs'].map(k => [I(`各评审单独排名 Spearman（${k}）`, `Per-judge ranking Spearman (${k})`), ent(A.per_judge_rank_spearman[k]).map(([a, b]) => `${esc(a)} ${b}`).join(I('，', ', '))]),
    ];
    $('#agreement [data-slot]').innerHTML = `<table class="tbl">${rows.map(([k, v]) => `<tr><td style="width:300px;color:var(--muted);white-space:normal">${k}</td><td style="white-space:normal">${v}</td></tr>`).join('')}</table>`;
    $('#agreement [data-judges]').innerHTML = `<table class="tbl"><tr><th>${I('评审', 'Judge')}</th>${ORDER.map(m => `<th class="num">${mn(m, short(m))}</th>`).join('')}</tr>
      ${ent(A.per_judge_scores).map(([j, v]) => `<tr><td>${mn(j)}</td>${ORDER.map(m => `<td class="num">${f1(v.gsb[m])}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  // ---------- full board ----------
  function renderBoard() {
    const sec = $('#board'), tb = $('[data-slot]', sec);
    const cell = (v, d, c, lb, fm = f1, isBase) => `${fm(v)}<span class="ci">${isBase ? I('基准', 'baseline') : delta(d, c, lb, fm)}</span>`;
    const COLS = [
      { h: I('门槛分 0-100', 'Gate 0–100'), f: (m, B) => cell(R3L[m].gate, R3L[m].gate_d, R3L[m].gate_dci, 0, f1, B) },
      { h: I('Rubric 通过率', 'Rubric pass'), f: (m, B) => cell(R3L[m].rubric, R3L[m].rubric_d, R3L[m].rubric_dci, 0, f1, B) },
      { h: I('Must 通过率', 'Must pass'), f: (m, B) => cell(R3L[m].must, R3L[m].must_d, R3L[m].must_dci, 0, f1, B) },
      { h: I('Must 全过题数', 'All-Must prompts'), f: m => `${R3L[m].must_all_n ?? Math.round((LB[m].must_have_all_pass_prompt_rate || 0) * M.n_B_eval / 100)} / ${M.n_B_eval}` },
      { h: I('绝对分 0-3', 'Abs. 0–3'), ext: 1, f: (m, B) => cell(LB[m].abs_mean, LB[m].delta?.abs_mean, LB[m].delta_ci?.abs_mean, 0, f2, B) },
      ...CATS.map(c => ({ h: `${esc(c)}<span class="ci">${I(`${M.cat_n[c]} 题`, `${M.cat_n[c]} prompts`)}</span>`, ext: 1, f: m => f1(LB[m].by_cat[c]) })),
      { h: I('Nice 通过率', 'Nice pass'), ext: 1, f: (m, B) => cell(R3L[m].nice, R3L[m].nice_d, R3L[m].nice_dci, 0, f1, B) },
      ...[['gsb_net_win_rate', '净胜率', 'Net win'], ['first_place_rate', '首位率', 'First place'], ['high_score_rate', '高分率', 'High score'], ['full_score_rate', '满分率', 'Full score'], ['low_score_rate', '低分率', 'Low score', 1], ['pros_density', 'Pros 密度', 'Pros density'], ['cons_density', 'Cons 密度', 'Cons density', 1]]
        .map(([k, zh, en, lb]) => ({ h: I(zh, en), ext: 1, f: (m, B) => cell(RB[m].metrics[k], RB[m].deltas_vs_baseline[k], RB[m].deltas_ci95[k], lb, f1, B) })),
      { h: `vs ${short(BASE)} G:S:B`, ext: 1, f: m => RB[m].gsb_vs_baseline ? `${RB[m].gsb_vs_baseline.G}:${RB[m].gsb_vs_baseline.S}:${RB[m].gsb_vs_baseline.B}` : '—' },
      { h: I('录像', 'Recording'), ext: 1, f: m => Object.entries(RB[m].render).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') },
    ];
    tb.innerHTML = `<tr><th>${I('排名', 'Rank')}</th><th>${I('模型', 'Model')}</th><th class="num">${I('GSB 优势率', 'GSB win rate')}</th><th></th><th class="num">Δ vs ${short(BASE)}</th>${COLS.map(c => `<th class="num ${c.ext ? 'ext' : ''}">${c.h}</th>`).join('')}</tr>
      ${L.map((b, i) => { const m = b.model, B = m === BASE; return `<tr class="${m === CORE ? 'core' : B ? 'base' : ''}">
        <td><span class="rank ${i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</span></td>
        <td class="model">${mn(m)}<small>${esc(tOrg(b.org))}</small></td>
        <td class="num"><b>${f1(b.gsb_advantage_rate)}</b><span class="ci">[${b.ci.gsb_advantage_rate.map(x => (+x).toFixed(1)).join(', ')}]</span></td>
        <td><span class="mini-bar"><i data-w="${b.gsb_advantage_rate}" style="background:${COLOR[m]}"></i></span></td>
        <td class="num">${B ? `<span class="ns">${I('基准', 'baseline')}</span>` : delta(b.delta?.gsb_advantage_rate, b.delta_ci?.gsb_advantage_rate)}</td>
        ${COLS.map(c => `<td class="num ${c.ext ? 'ext' : ''}">${c.f(m, B)}</td>`).join('')}</tr>`; }).join('')}`;
    $('[data-legend]', sec).innerHTML = legend();
    $('[data-def]', sec).innerHTML = I(
      `<p>GSB 优势率：每题由 ${nJ} 家评审给所有模型的视频排序（正序、倒序各一次，抵消位置偏差），再拆成两两比较，胜 1、平 0.5、负 0 取平均。分类列是该类题目上的 GSB 优势率。</p>
       <p>绝对分取三家中位数；Rubric 按 6 字段规范拆分（Priority / Dimension / Evidence / Type / Necessity），每条三家各判 1 或 0、取多数，没有 N/A；依赖声音的条目暂未送评（待音频录制），不计入，通过率按条数计、不加权；Must 指 rubric 中标为 Must have 的判定项。</p>
       <p>门槛分（每题 0-100）：Must 全过 = 60 + 40 × Nice 通过率；任一 Must 不通过则封顶在 60 以下（= 60 × Must 通过率），Nice 再多也抵不掉一条 Must；未判定的项不计。Δ 带 * 表示相对基准显著（按题 bootstrap 95% 置信区间不含 0）。</p>`,
      `<p>GSB win rate: for each prompt, each of the ${nJ} judges ranks every model's video (once forward, once reversed, to cancel position bias); rankings are split into pairwise comparisons scored win 1, tie 0.5, loss 0, then averaged. Category columns are the GSB win rate on prompts of that category.</p>
       <p>The absolute score is the median of the three judges. The rubric uses the 6-field spec (Priority / Dimension / Evidence / Type / Necessity); each check is judged 1 or 0 by all three judges and decided by majority, with no N/A; audio-dependent checks are not judged yet (awaiting audio recording) and are excluded; pass rate counts checks, unweighted. Must refers to rubric checks marked Must have.</p>
       <p>Gate score (0–100 per prompt): if every Must passes, 60 + 40 × Nice pass rate; if any Must fails, capped below 60 (= 60 × Must pass rate) — no amount of Nice makes up for a failed Must; unjudged checks are excluded. Δ marked * is significant vs. the baseline (per-prompt bootstrap 95% CI excludes 0).</p>`);
    const btn = $('[data-expand]', sec);
    btn.addEventListener('click', () => { const on = tb.classList.toggle('expanded'); btn.textContent = on ? I('收起分数明细', 'Collapse score breakdown') : I('展开分数明细', 'Expand score breakdown'); });
    onVisible(tb, () => $$('.mini-bar i', tb).forEach(i => { i.style.width = i.dataset.w + '%'; }));
  }

  // ---------- bank ----------
  function renderBank() {
    const sec = $('#bank'), tools = $('[data-tools]', sec), tb = $('[data-slot]', sec), more = $('[data-more]', sec);
    tools.innerHTML = `<input data-kw placeholder="${I('搜索题目 ID、提示词、作者…', 'Search ID, prompt, author…')}">
      <select data-cat><option value="">${I('全部类别', 'All categories')}</option>${[...new Set(P.map(p => p.category).filter(Boolean))].sort().map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <select data-diff><option value="">${I('全部难度', 'All difficulties')}</option>${['简单', '中等', '困难'].map(d => `<option value="${d}">${tDiff(d)}</option>`).join('')}</select>
      <select data-st><option value="">${I('全部状态', 'All statuses')}</option>${Object.keys(ST).map(k => { const c = P.filter(p => p.status === k).length; return c ? `<option value="${k}">${tSt(k)}（${c}）</option>` : ''; }).join('')}</select>`;
    P.forEach((p, i) => { p.no = i + 1; });
    let rows = P, shown = 0;
    const PAGE = 80;
    const head = `<tr><th>No.</th><th>ID</th><th>${I('题目', 'Prompt')}</th><th>${I('类别', 'Category')}</th><th>${I('难度', 'Difficulty')}</th><th class="num">${I('Rubric 项', 'Rubric checks')}</th><th class="num">${I('平均绝对分', 'Mean abs.')}</th><th>${I('状态', 'Status')}</th></tr>`;
    const row = p => { const t = tBankTitle(p); return `<tr class="row" data-no="${p.no}"><td class="muted">${p.no}</td><td><b>${p.qid ? `<a href="#q-${p.qid}">${p.qid}</a>` : '—'}</b></td>
      <td class="title">${esc(t.slice(0, 130))}${t.length > 130 ? '…' : ''}<small>@${esc(p.author)}</small></td>
      <td><span class="pill">${esc(p.category)}</span></td><td>${p.diff ? `<span class="pill ${diffCls(p.diff)}">${esc(tDiff(p.diff))}</span>` : '—'}</td>
      <td class="num">${QS[p.slug]?.items?.length ?? p.rubric?.length ?? '—'}</td><td class="num">${p.abs_avg != null ? f2(p.abs_avg) : '—'}</td>
      <td><span class="pill ${ST[p.status]?.[1] || ''}">${tSt(p.status)}</span></td></tr>`; };
    const detail = p => {
      let right;
      if (p.status === 'video') right = `<div class="label">${I('Opus 5.5 产物', 'Opus 5.5 output')}</div>${p.poster ? `<img src="${MEDIA}${p.poster}" alt="" loading="lazy">` : ''}<p class="muted">${p.html ? `<a href="${MEDIA}${p.html}" target="_blank" rel="noopener">${I('在线 HTML', 'Open HTML')}</a>` : ''}</p>`;
      else if (p.status === 'failed') right = `<div class="label">${I('Opus 5.5 产物', 'Opus 5.5 output')}</div><p style="color:var(--bad)">${I('未出视频：', 'No video: ')}${esc(tWhy(p.why))}</p>${p.html ? `<p class="muted"><a href="${MEDIA}${p.html}" target="_blank" rel="noopener">${I('查看 HTML', 'View HTML')}</a></p>` : ''}`;
      else if (p.status === 'rubric_only') right = `<div class="label">${I(`Rubrics（${p.rubric.length} 条，尚未跑多模型）`, `Rubric (${p.rubric.length} checks, not yet run on all models)`)}</div><ul class="items">${p.rubric.map((r, i) => `<li><span class="muted">${i + 1}.</span><span>${r.w >= 3 ? prio('Must have') : prio('')} ${esc(r.c)}<small>${esc(r.dim)} / ${esc(r.level)}</small></span></li>`).join('')}</ul>${zhNote()}`;
      else if (p.status === 'manual') right = `<div class="label">${I('手工精做', 'Hand-crafted')}</div>`;
      else right = `<p class="muted">${esc(tWhy(p.why) || I('未参与生成和评测', 'Not generated or evaluated'))}</p>`;
      return `<tr class="det"><td colspan="8"><div class="det-grid"><div><div class="label">${I('提示词', 'Prompt')}</div><div class="prompt">${esc(p.prompt)}</div>
        <p class="muted" style="font-size:12px">${esc(p.slug)} · @${esc(p.author)}${p.post_url ? ` · <a href="${esc(p.post_url)}" target="_blank" rel="noopener">${I('原帖', 'Original post')}</a>` : ''}</p></div><div>${right}</div></div></td></tr>`;
    };
    const page = () => {
      tb.insertAdjacentHTML('beforeend', rows.slice(shown, shown + PAGE).map(row).join(''));
      shown = Math.min(shown + PAGE, rows.length);
      more.style.display = shown < rows.length ? '' : 'none';
      more.textContent = I(`加载更多（剩 ${rows.length - shown} 题）`, `Load more (${rows.length - shown} left)`);
    };
    const render = () => {
      const kw = $('[data-kw]', tools).value.trim().toLowerCase(), c = $('[data-cat]', tools).value, d = $('[data-diff]', tools).value, s = $('[data-st]', tools).value;
      rows = P.filter(p => (!kw || [p.qid, p.slug, p.author, p.prompt, p.summary, EN.summary[p.slug]].join(' ').toLowerCase().includes(kw)) && (!c || p.category === c) && (!d || p.diff === d) && (!s || p.status === s));
      $('[data-tag]', sec).textContent = I(`共 ${P.length} 题，当前显示 ${rows.length} 题 · A 半 ${M.n_A}（Opus 出视频 ${M.n_A_video}）· B 半 ${M.n_B}（已评测 ${M.n_B_eval}）· 手工 ${M.n_manual} · 未纳入 ${M.n_excluded}（提示词仅部分公开）`,
        `${P.length} prompts, showing ${rows.length} · Half A ${M.n_A} (Opus video ${M.n_A_video}) · Half B ${M.n_B} (${M.n_B_eval} evaluated) · hand-crafted ${M.n_manual} · excluded ${M.n_excluded} (prompt only partly public)`);
      tb.innerHTML = head;
      shown = 0;
      page();
    };
    tools.addEventListener('input', render);
    more.addEventListener('click', page);
    tb.addEventListener('click', e => {
      const pr = e.target.closest('.prompt');
      if (pr) { pr.classList.toggle('open'); return; }
      const tr = e.target.closest('tr.row');
      if (!tr) return;
      const p = P[+tr.dataset.no - 1];
      if (p.qid) { e.preventDefault(); window.__goQ(p.qid); return; }
      if (e.target.closest('a')) return;
      const nx = tr.nextElementSibling;
      if (nx?.classList.contains('det')) { nx.remove(); return; }
      tr.insertAdjacentHTML('afterend', detail(p));
    });
    render();
  }

  $('#lang').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (!b || b.dataset.lang === LANG) return;
    LANG = b.dataset.lang;
    localStorage.setItem('vb-lang', LANG);
    const url = new URL(location.href);
    url.searchParams.set('lang', LANG);
    history.replaceState(null, '', url);
    const y = scrollY;
    render();
    scrollTo(0, y);
  });

  render();
  if (location.hash.startsWith('#q-B')) window.__goQ(location.hash.slice(3));
}
})();
