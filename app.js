/* ── AI Security Range 830 MVP Demo v3 · 应用逻辑 ───────────────
 * hash 路由 SPA + 左侧抽屉导航（两大区块：操作区 / 资源区）
 * 操作区 · 操作中心三 tab：测试场（#/range-tasks 靶场任务为默认页 · #/eval-tasks 评测任务）
 *             训练场 #/training（数据产出仪表盘 + 训练演示窗 + 介绍瀑布流）
 *             实战场 #/drill 实战演练场任务（研发中，位于操作区最后一个 tab）
 * 资源区 · 资源中心：#/assets 资产中心（展示页）· #/system 系统配置
 * 任务流：#/marketplace 新建任务（评测/靶场攻防）· #/train-new 新建训练任务
 *         #/tasks 任务中心 · #/workbench 评测控制台 · #/range 靶场控制台
 *         #/training-console 训练控制台 · #/result-detail 结果详情
 * 兼容：#/overview #/portal #/results → #/range-tasks；#/data #/resources → #/assets；#/report → #/result-detail
 * ─────────────────────────────────────────────────────────────── */
'use strict';

/* ══ 工具 ═══════════════════════════════════════════════════════ */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const fmtElapsed = (ms) => { const s = Math.floor(ms / 1000); return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`; };
const fmtClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

/* ══ 主题 ═══════════════════════════════════════════════════════ */
(function initTheme() {
  if (localStorage.getItem('aisr-theme') === 'dark') document.documentElement.classList.add('dark');
})();
function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('aisr-theme', dark ? 'dark' : 'light');
  $('#theme-icon').textContent = dark ? '◑' : '◐';
}

/* ══ 侧边导航（收缩状态 localStorage 持久化）══════════════════════ */
function initSidebar() {
  const sb = $('#sidebar');
  if (localStorage.getItem('aisr-sidebar') === 'collapsed') sb.classList.add('collapsed');
  syncCollapseBtn();
  $('#sb-collapse').addEventListener('click', () => {
    const collapsed = sb.classList.toggle('collapsed');
    localStorage.setItem('aisr-sidebar', collapsed ? 'collapsed' : 'expanded');
    syncCollapseBtn();
  });
}
function syncCollapseBtn() {
  const c = $('#sidebar').classList.contains('collapsed');
  $('#sb-collapse').innerHTML = c ? '»' : '« <span class="sb-label">收起导航</span>';
  $('#sb-collapse').title = c ? '展开导航' : '收起导航';
}

/* ══ 计时器 / 弹窗 ═══════════════════════════════════════════════ */
let timers = [];
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push({ t: 'to', id }); return id; }
function every(fn, ms) { const id = setInterval(fn, ms); timers.push({ t: 'iv', id }); return id; }
function clearTimers() { timers.forEach((t) => (t.t === 'to' ? clearTimeout(t.id) : clearInterval(t.id))); timers = []; }

function openModal(html, wide) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal${wide ? ' wide' : ''}" role="dialog">${html}</div>`;
  $('[data-close]').addEventListener('click', closeModal);
}
function closeModal() { $('#modal-root').innerHTML = ''; rgRoot = null; }

/* ══ 路由 ═══════════════════════════════════════════════════════ */
const ROUTE_ALIASES = { '': 'range-tasks', overview: 'range-tasks', portal: 'range-tasks', results: 'range-tasks', data: 'assets', resources: 'assets', report: 'result-detail' };
const NAV_OF = {
  'range-tasks': 'range-tasks', 'eval-tasks': 'range-tasks', drill: 'drill', training: 'training',
  assets: 'assets', system: 'system',
  tasks: 'tasks', marketplace: 'range-tasks', workbench: 'range-tasks', range: 'range-tasks', 'result-detail': 'tasks',
  'train-new': 'training', 'training-console': 'training',
};
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'range-tasks';
  const [path, qs] = raw.split('?');
  const params = {};
  if (qs) qs.split('&').forEach((kv) => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
  return { route: path || 'range-tasks', params };
}
function router() {
  window.TrainingPipeline.unmount();
  clearTimers(); closeModal(); closeUserPop(); closeDlPop(); hideTopoTip(); closeRgPops();
  rgRoot = null;
  const { route } = parseHash();
  /* 运行中任务小圆点（sidebar · 靶场任务项） */
  const dot = $('#run-dot');
  if (dot) dot.style.display = sessionStorage.getItem('aisr-running') === '1' ? '' : 'none';
  const r = ROUTE_ALIASES[route] || route;
  const nav = NAV_OF[r] || 'range-tasks';
  $$('#sidenav a').forEach((a) => a.classList.toggle('active', a.dataset.route === nav));
  if (r === 'eval-tasks') renderEvalLanding();
  else if (r === 'training') renderTrainingLanding();
  else if (r === 'train-new') renderTrainNew();
  else if (r === 'training-console') renderTrainingConsole();
  else if (r === 'workbench') renderWorkbench();
  else if (r === 'range') renderRange();
  else if (r === 'marketplace') renderMarketplace();
  else if (r === 'result-detail') renderResultDetail();
  else if (r === 'assets') renderAssets();
  else if (r === 'system') renderSystem();
  else if (r === 'drill') renderDrill();
  else if (r === 'tasks') renderTasks();
  else renderRangeLanding();
  window.scrollTo(0, 0);
}

/* ══ 徽标工具 ═══════════════════════════════════════════════════ */
function diffBadge(d) {
  const cls = { 入门: 'badge-olive', 中等: 'badge-primary', 困难: 'badge-gold', 地狱: 'badge-destructive' }[d] || '';
  return `<span class="badge ${cls}">${d}</span>`;
}
const verdictBadge = (v) => v === 'pass' || v === '通过'
  ? '<span class="badge badge-olive">通过</span>'
  : v === 'fail' || v === '未通过'
    ? '<span class="badge badge-destructive">未通过</span>'
    : '<span class="badge badge-gold">部分</span>';
const levelBadge = (l) => l === '高'
  ? '<span class="badge badge-destructive">高</span>'
  : l === '中' ? '<span class="badge badge-gold">中</span>' : '<span class="badge">低</span>';
const catShort = (id) => (CATEGORIES.find((c) => c.id === id) || {}).short || id;

/* ════════════════════════════════════════════════════════════════
 * Landing 页 · 靶场任务 / 评测任务 / 训练场（演示型首页）
 * 首屏：数据仪表盘 + 实时任务窗 + 并行任务小窗（点击直达控制台）
 * ════════════════════════════════════════════════════════════════ */
/* ── 并行演示任务小窗：landing 演示广度（更小窗格，点击进对应控制台）── */
const LANDING_MINIS = {
  range: [
    { id: 'nuc', title: '核电指挥中心红蓝对抗', cat: 'redblue', badge: '靶场攻防任务', go: '#/range', goCn: '靶场', offset: 26000 },
    { id: 'edge', title: '边界渗透演练 · DMZ 突破', cat: 'redblue', badge: '靶场攻防任务', go: '#/range', goCn: '靶场', offset: 47000 },
  ],
  eval: [
    { id: 'mythos', title: 'Mythos-Attack-v2 智能体评测', cat: 'eval', badge: '评测任务', go: '#/workbench', goCn: '评测', offset: 21000 },
    { id: 'dpsk', title: 'DeepSeek-V3 大模型风险评测', cat: 'eval', badge: '评测任务', go: '#/workbench', goCn: '评测', offset: 39000 },
  ],
  training: [
    { id: 'def', title: '防御策略优化训练 · Sentinel-7B', cat: 'training', badge: '训练任务', go: '#/training-console', goCn: '训练', offset: 18000 },
    { id: 'vuln', title: '漏洞利用专精训练 · ExploitCraft', cat: 'training', badge: '训练任务', go: '#/training-console', goCn: '训练', offset: 33000 },
  ],
};
function landingMinisHtml(kind) {
  return `
  <div class="demo-minis">
    ${LANDING_MINIS[kind].map((m) => `
    <div class="runwin mini" id="lm-${m.id}" data-go="${m.go}" role="link" tabindex="0">
      <div class="runwin-head">
        <span class="live-dot"></span>
        <span class="runwin-title">${m.title}</span>
        <span class="badge badge-primary">${m.badge}</span>
      </div>
      <div class="runwin-viz"><div class="sim-risk" id="lm-viz-${m.id}"></div></div>
      <div class="runwin-foot">
        <div class="prog-track"><div class="prog-fill" id="lm-fill-${m.id}" style="width:0%"></div></div>
        <div class="runwin-meta">
          <span id="lm-step-${m.id}">初始化运行环境…</span>
          <span class="mono"><span id="lm-pct-${m.id}">0%</span> · <span id="lm-time-${m.id}">00:00</span></span>
        </div>
      </div>
      <div class="runwin-goto">点击进入${m.goCn}控制台 →</div>
    </div>`).join('')}
  </div>`;
}
function bindLandingMinis(kind) {
  LANDING_MINIS[kind].forEach((m) => {
    const el = $('#lm-' + m.id);
    el.addEventListener('click', () => { location.hash = m.go; });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = m.go; });
  });
  const tickAll = () => LANDING_MINIS[kind].forEach((m) => paintLandingMini(m));
  tickAll();
  every(tickAll, 1000);
}
/* 小窗循环模拟：固定周期重播，各窗相位错开呈现并行效果 */
function paintLandingMini(m) {
  const fill = $('#lm-fill-' + m.id);
  if (!fill) return;
  const el = (Date.now() + m.offset) % 96000;
  $('#lm-time-' + m.id).textContent = fmtElapsed(el);
  const setPct = (pct, step, vizHtml) => {
    fill.style.width = pct + '%';
    $('#lm-pct-' + m.id).textContent = pct + '%';
    $('#lm-step-' + m.id).textContent = step;
    $('#lm-viz-' + m.id).innerHTML = vizHtml;
  };
  if (m.cat === 'training') {
    const ep = Math.min(12, 1 + Math.floor(el / 7000));
    const pct = Math.min(97, Math.round((ep / 12) * 100));
    const loss = (1.8 * Math.exp(-ep / 6) + 0.12).toFixed(3);
    const reward = (0.18 + (ep / 12) * 0.68).toFixed(2);
    setPct(pct, `Epoch ${ep}/12 · loss ${loss}`, `
      <span>Epoch <b>${ep}/12</b></span>
      <span>loss <b>${loss}</b></span>
      <span>reward <b style="color:var(--chart-3)">${reward}</b></span>`);
  } else if (m.cat === 'eval') {
    const i = Math.min(EVAL_STEPS.length, 1 + Math.floor(el / 3000));
    const pct = Math.min(97, Math.round((i / EVAL_STEPS.length) * 100));
    const fails = Math.floor(i * 0.22), part = Math.floor(i * 0.13);
    setPct(pct, `当前检测：${EVAL_STEPS[i - 1].name}`, `
      <span>已检测 <b>${i}/${EVAL_STEPS.length}</b></span>
      <span>未通过 <b style="color:var(--destructive)">${fails}</b></span>
      <span>部分 <b style="color:var(--chart-4)">${part}</b></span>
      <span>通过 <b style="color:var(--chart-3)">${i - fails - part}</b></span>`);
  } else {
    const i = Math.min(RB_STEPS.length, 1 + Math.floor(el / 3000));
    const pct = Math.min(97, Math.round((i / RB_STEPS.length) * 100));
    const s = RB_STEPS[i - 1];
    setPct(pct, `当前：M${s.g} ${RB_GROUPS[s.g - 1].name}`, `
      <span>里程碑 <b>${Math.max(0, s.g - 1)}/${RB_GROUPS.length}</b></span>
      <span>攻击得分 <b>${i * 14}</b></span>
      <span>渗透阶段 <b style="color:var(--primary)">${RANGE_KILLCHAIN[Math.min(5, Math.floor((i / RB_STEPS.length) * 6))]}</b></span>`);
  }
}
/* 循环演示窗：视频窗 chrome + 靶场 hero（整窗点击进入控制台） */
function demoLoopHtml() {
  return `
  <div class="vc-wrap">
    <div class="video-chrome"><span class="vc-rec"></span><span>实时任务画面</span><span class="vc-tag">演示</span>
      <button class="vc-new" id="vc-new-range" title="沿用该演示任务的模板配置发起新任务">从此模板新建任务 →</button>
    </div>
    ${rangeSectionHtml('grid', 'hero')}
  </div>`;
}
function bindDemoLoop() {
  const heroSec = $('#rg-hero-sec');
  heroSec.addEventListener('click', () => { location.hash = '#/range'; });
  heroSec.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = '#/range'; });
  $('#vc-new-range').addEventListener('click', (e) => {
    e.stopPropagation();
    openTemplateStep({ cat: 'redblue', mode: 'battle' });
  });
  paintRange('grid');
  every(tickRange, 1000);
}
/* 评测流程模拟演示窗：进度条 + 检测项清单 + 判定徽标，走完循环重播 */
const evalSim = { tick: 0, idx: 0 };
function evalLoopHtml() {
  return `
  <div class="vc-wrap">
    <div class="video-chrome"><span class="vc-rec"></span><span>实时任务画面</span><span class="vc-tag">演示</span>
      <button class="vc-new" id="vc-new-eval" title="沿用该演示任务的模板配置发起新任务">从此模板新建任务 →</button>
    </div>
    <section class="card eval-loop" id="el-sec" role="link" tabindex="0" aria-label="进入评测控制台" title="点击进入评测控制台">
      <div class="el-head">
        <span class="live-dot"></span>
        <span class="el-title">GPT-4o 风险点全量评测 · 智能体执行</span>
        <span class="badge badge-primary">评测任务</span>
        <span class="env-status"><span class="dot dot-ok"></span>运行中</span>
        <span class="el-time mono" id="el-time">00:00</span>
      </div>
      <div class="el-body">
        <div>
          <div class="el-pct" id="el-pct">0%</div>
          <div class="prog-track" style="margin-top:6px"><div class="prog-fill" id="el-fill" style="width:0%"></div></div>
          <div class="el-cur" id="el-cur">初始化评测环境…</div>
          <div class="el-counts" id="el-counts"></div>
        </div>
        <div class="el-steps" id="el-steps"></div>
      </div>
      <div class="el-foot" id="el-foot">评测引擎就绪，等待第一项检测开始…</div>
    </section>
  </div>`;
}
function bindEvalLoop() {
  const go = () => { location.hash = '#/workbench'; };
  const sec = $('#el-sec');
  sec.addEventListener('click', go);
  sec.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  $('#vc-new-eval').addEventListener('click', (e) => {
    e.stopPropagation();
    openTemplateStep({ cat: 'eval', objectKind: 'llm', objectId: 'gpt-4o' });
  });
  paintEvalLoop();
  every(tickEvalLoop, 1000);
}
function tickEvalLoop() {
  evalSim.tick += 1;
  if (evalSim.tick % 2 === 0) evalSim.idx += 1;
  if (evalSim.idx > EVAL_STEPS.length + 4) { evalSim.idx = 0; evalSim.tick = 0; }
  paintEvalLoop();
}
function paintEvalLoop() {
  const fill = $('#el-fill');
  if (!fill) return;
  const len = EVAL_STEPS.length;
  const cur = Math.min(evalSim.idx, len);
  const pct = Math.round((cur / len) * 100);
  fill.style.width = pct + '%';
  $('#el-pct').textContent = pct + '%';
  $('#el-time').textContent = fmtElapsed(evalSim.tick * 1000);
  const done = EVAL_STEPS.slice(0, cur);
  const f = done.filter((s) => s.verdict === 'fail').length;
  const p = done.filter((s) => s.verdict === 'partial').length;
  $('#el-counts').innerHTML = `
    <span>已检测 <b>${cur}/${len}</b></span>
    <span>通过 <b style="color:var(--chart-3)">${cur - f - p}</b></span>
    <span>部分 <b style="color:var(--chart-4)">${p}</b></span>
    <span>未通过 <b style="color:var(--destructive)">${f}</b></span>`;
  const curStep = cur < len ? EVAL_STEPS[cur] : null;
  const curGroup = curStep ? EVAL_GROUPS[curStep.g - 1].name : '';
  $('#el-cur').innerHTML = curStep
    ? `当前检测：<b>${curStep.name}</b> · ${curGroup}`
    : '全部检测完成 · 生成评测报告与错题集…';
  $('#el-steps').innerHTML = EVAL_GROUPS.map((g) => {
    const rows = EVAL_STEPS.map((s, i) => ({ s, i })).filter(({ s }) => s.g === g.id).map(({ s, i }) => {
      const st = i < cur ? s.verdict : i === cur ? 'cur' : 'todo';
      const mark = st === 'pass' ? '✓' : st === 'fail' ? '✗' : st === 'partial' ? '◐' : st === 'cur' ? '▸' : '·';
      const cls = st === 'pass' ? 'v-pass' : st === 'fail' ? 'v-fail' : st === 'partial' ? 'v-part' : '';
      return `<div class="el-step${st === 'cur' ? ' cur' : ''}"><span class="el-mark ${cls}">${mark}</span>${s.name}</div>`;
    }).join('');
    return `<div><div class="el-group-label">${g.id} · ${g.name}</div>${rows}</div>`;
  }).join('');
  $('#el-foot').textContent = curStep
    ? `[${fmtClock(new Date())}] 执行检测 ${curStep.tag} · ${curStep.action}`
    : `[${fmtClock(new Date())}] 评测闭环 · 报告编号 RPT-${String(evalSim.tick).padStart(2, '0')} · 开始新一轮评测`;
}
function statCardsHtml(stats, compact) {
  return `<div class="stats-row${compact ? ' compact' : ''}">${stats.map(([label, num]) => `<div class="card"><div class="card-sub">${label}</div><div class="stat-num">${num}</div></div>`).join('')}</div>`;
}

/* 训练多轮次演示窗：主图 = 每轮次攻击/防御成功率双折线（攻击 80%→20%，防御 30%→90%）
 * 小图 = loss / reward 过程指标；折线逐轮次绘制，走完循环重播；整窗点击进入训练控制台 */
const TRAIN_ROUNDS = {
  n: 12,
  atk: [80, 76, 71, 65, 58, 51, 45, 39, 34, 29, 25, 20],
  def: [30, 36, 43, 50, 57, 63, 69, 74, 79, 83, 87, 90],
  loss: [2.40, 1.92, 1.51, 1.18, 0.92, 0.71, 0.56, 0.44, 0.35, 0.28, 0.22, 0.18],
  reward: [0.12, 0.20, 0.28, 0.36, 0.44, 0.52, 0.60, 0.67, 0.73, 0.79, 0.83, 0.87],
};
const trainSim = { tick: 0 };
const TRAIN_LOOP_TICKS = 34; /* 12 轮 × 2 tick + 完成停留 10 tick */
function trainShownRounds() { return Math.min(TRAIN_ROUNDS.n, 1 + Math.floor(trainSim.tick / 2)); }
/* 通用迷你折线 SVG：vals 全量数组，shown 为当前可见点数 */
function miniLineSvg(vals, shown, opts) {
  const W = opts.w, H = opts.h, P = { l: 6, r: 6, t: 8, b: 6 };
  const n = vals.length;
  const min = opts.min != null ? opts.min : Math.min(...vals);
  const max = opts.max != null ? opts.max : Math.max(...vals);
  const x = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - min) / (max - min || 1)) * (H - P.t - P.b);
  const pts = vals.slice(0, shown).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = shown - 1;
  return `<svg viewBox="0 0 ${W} ${H}" class="tl-spark" preserveAspectRatio="none">
    <polyline points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" class="tl-line-ghost"/>
    <polyline points="${pts}" class="tl-line" style="stroke:${opts.color}"/>
    <circle cx="${x(last).toFixed(1)}" cy="${y(vals[last]).toFixed(1)}" r="3" class="tl-dot" style="fill:${opts.color}"/>
  </svg>`;
}
/* 主图：成功率双折线（0–100% 坐标，网格 + 坐标轴 + 图例） */
function trainChartSvg(shown) {
  const W = 640, H = 300, P = { l: 44, r: 16, t: 16, b: 36 };
  const n = TRAIN_ROUNDS.n;
  const x = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b);
  const grid = [0, 25, 50, 75, 100].map((g) => `
    <line x1="${P.l}" y1="${y(g)}" x2="${W - P.r}" y2="${y(g)}" class="tl-grid"/>
    <text x="${P.l - 8}" y="${y(g) + 4}" class="tl-axis" text-anchor="end">${g}%</text>`).join('');
  const xlabels = TRAIN_ROUNDS.atk.map((_, i) => (i % 2 === 0 || i === n - 1)
    ? `<text x="${x(i)}" y="${H - 12}" class="tl-axis" text-anchor="middle">R${i + 1}</text>` : '').join('');
  const line = (vals, cls) => {
    const pts = vals.slice(0, shown).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const dots = vals.slice(0, shown).map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === shown - 1 ? 4 : 2.2}" class="${cls}-dot"/>`).join('');
    return `<polyline points="${pts}" class="${cls}"/>${dots}`;
  };
  return `<svg viewBox="0 0 ${W} ${H}" class="tl-chart">
    ${grid}${xlabels}
    ${line(TRAIN_ROUNDS.atk, 'tl-atk')}
    ${line(TRAIN_ROUNDS.def, 'tl-def')}
  </svg>`;
}
function trainLoopHtml() {
  return `
  <div class="vc-wrap">
    <div class="video-chrome"><span class="vc-rec"></span><span>实时任务画面</span><span class="vc-tag">演示</span>
      <button class="vc-new" id="vc-new-train" title="沿用该演示任务的训练配置发起新任务">从此模板新建任务 →</button>
    </div>
    <section class="card eval-loop tl-wrap" id="tl-sec" role="link" tabindex="0" aria-label="进入训练控制台" title="点击进入训练控制台">
      <div class="el-head">
        <span class="live-dot"></span>
        <span class="el-title">PentestGPT-Attack-v3 · 多轮次攻防对抗训练</span>
        <span class="badge badge-primary">训练任务</span>
        <span class="env-status"><span class="dot dot-ok"></span>运行中</span>
        <span class="el-time mono" id="tl-time">00:00</span>
      </div>
      <div class="tl-body">
        <div class="tl-main">
          <div class="tl-legend">
            <span><i class="tl-sw tl-sw-atk"></i>攻击成功率 <b class="mono" id="tl-atk-val">80%</b></span>
            <span><i class="tl-sw tl-sw-def"></i>防御成功率 <b class="mono" id="tl-def-val">30%</b></span>
            <span class="tl-round mono" id="tl-round">轮次 R1/12</span>
          </div>
          <div id="tl-chart"></div>
        </div>
        <div class="tl-side">
          <div class="tl-mini">
            <div class="tl-mini-head"><span>loss 曲线</span><b class="mono" id="tl-loss-val">2.40</b></div>
            <div id="tl-loss"></div>
          </div>
          <div class="tl-mini">
            <div class="tl-mini-head"><span>reward 曲线</span><b class="mono" id="tl-reward-val">0.12</b></div>
            <div id="tl-reward"></div>
          </div>
          <div class="tl-mini tl-kpis">
            <div><span class="card-sub">本批轨迹数据</span><b class="mono" id="tl-traj">0 条</b></div>
            <div><span class="card-sub">检查点</span><b class="mono" id="tl-ckpt">v3.0</b></div>
          </div>
        </div>
      </div>
      <div class="el-foot" id="tl-foot">训练引擎就绪，开始第 1 轮对抗训练…</div>
    </section>
  </div>`;
}
function bindTrainLoop() {
  const go = () => { location.hash = '#/training-console'; };
  const sec = $('#tl-sec');
  sec.addEventListener('click', go);
  sec.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  $('#vc-new-train').addEventListener('click', (e) => {
    e.stopPropagation();
    openTrainTemplateStep();
  });
  paintTrainLoop();
  every(tickTrainLoop, 1000);
}
function tickTrainLoop() {
  trainSim.tick += 1;
  if (trainSim.tick > TRAIN_LOOP_TICKS) trainSim.tick = 0;
  paintTrainLoop();
}
function paintTrainLoop() {
  const chart = $('#tl-chart');
  if (!chart) return;
  const tick = trainSim.tick;
  const shown = trainShownRounds();
  const done = shown >= TRAIN_ROUNDS.n;
  const i = shown - 1;
  chart.innerHTML = trainChartSvg(shown);
  $('#tl-loss').innerHTML = miniLineSvg(TRAIN_ROUNDS.loss, shown, { w: 220, h: 84, color: 'var(--chart-1)', min: 0, max: 2.6 });
  $('#tl-reward').innerHTML = miniLineSvg(TRAIN_ROUNDS.reward, shown, { w: 220, h: 84, color: 'var(--chart-3)', min: 0, max: 1 });
  $('#tl-time').textContent = fmtElapsed(tick * 30000);
  $('#tl-round').textContent = done ? '12 轮完成' : `轮次 R${shown}/12`;
  $('#tl-atk-val').textContent = TRAIN_ROUNDS.atk[i] + '%';
  $('#tl-def-val').textContent = TRAIN_ROUNDS.def[i] + '%';
  $('#tl-loss-val').textContent = TRAIN_ROUNDS.loss[i].toFixed(2);
  $('#tl-reward-val').textContent = TRAIN_ROUNDS.reward[i].toFixed(2);
  $('#tl-traj').textContent = (shown * 1450).toLocaleString() + ' 条';
  $('#tl-ckpt').textContent = 'v3.' + i;
  $('#tl-foot').textContent = done
    ? `[${fmtClock(new Date())}] 训练闭环 · 攻击成功率收敛至 20% · 防御成功率提升至 90% · 轨迹数据集与检查点已归档，开始新一轮训练`
    : `[${fmtClock(new Date())}] R${shown}/12 · 攻击成功率 ${TRAIN_ROUNDS.atk[i]}% ↓ · 防御成功率 ${TRAIN_ROUNDS.def[i]}% ↑ · loss ${TRAIN_ROUNDS.loss[i].toFixed(2)} · 轨迹数据回流中`;
}

function testfieldTabsHtml(active) {
  return `
  <div class="range-tabs">
    <a class="range-tab${active === 'range' ? ' active' : ''}" href="#/range-tasks">靶场任务</a>
    <a class="range-tab${active === 'eval' ? ' active' : ''}" href="#/eval-tasks">评测任务</a>
  </div>`;
}

function renderRangeLanding() {
  rangeState.scene = 'grid';
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">测试场 · 靶场任务</h2>
        <p class="page-desc">高仿真攻防靶场 · 红蓝对抗与渗透演练任务入口</p>
      </div>
      <div style="display:flex;gap:10px">
        <a class="btn btn-ghost" href="#/tasks">任务中心</a>
        <button class="btn btn-primary" id="btn-new-task">＋ 新建任务</button>
      </div>
    </div>
    ${testfieldTabsHtml('range')}
    <div class="history-head">数据仪表盘</div>
    ${statCardsHtml(TASK_STATS, true)}
    ${demoLoopHtml()}
    ${landingMinisHtml('range')}
  </div>`;
  bindDemoLoop();
  bindLandingMinis('range');
  $('#btn-new-task').addEventListener('click', () => openMarketplace(null));
}

function renderEvalLanding() {
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">测试场 · 评测任务</h2>
        <p class="page-desc">面向大模型与智能体的风险点全量评测 · 报告与错题集自动归集</p>
      </div>
      <div style="display:flex;gap:10px">
        <a class="btn btn-ghost" href="#/tasks">任务中心</a>
        <button class="btn btn-primary" id="btn-new-task">＋ 新建任务</button>
      </div>
    </div>
    ${testfieldTabsHtml('eval')}
    <div class="history-head">数据仪表盘</div>
    ${statCardsHtml(EVAL_STATS, true)}
    ${evalLoopHtml()}
    ${landingMinisHtml('eval')}
  </div>`;
  bindEvalLoop();
  bindLandingMinis('eval');
  $('#btn-new-task').addEventListener('click', () => openMarketplaceCat('eval'));
}

function renderTrainingLanding() {
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">训练场</h2>
        <p class="page-desc">训练数据产出总览 · 目标导向的攻防能力训练</p>
      </div>
      <div style="display:flex;gap:10px">
        <a class="btn btn-ghost" href="#/tasks">任务中心</a>
        <button class="btn btn-primary" id="btn-new-train">＋ 新建训练任务</button>
      </div>
    </div>
    <div class="history-head">数据产出仪表盘</div>
    ${statCardsHtml(TRAIN_STATS, true)}
    ${trainLoopHtml()}
    ${landingMinisHtml('training')}
  </div>`;
  bindTrainLoop();
  bindLandingMinis('training');
  $('#btn-new-train').addEventListener('click', () => { location.hash = '#/train-new'; });
}

/* ════════════════════════════════════════════════════════════════
 * 任务中心（任务流枢纽，导航不设入口）
 * 任务仪表盘（实时）+ 运行中任务（新任务即见，小窗模拟运行）
 * + 已完成任务列表（任务标签 / 结果标签 / 数据标签 + 三个操作）
 * ════════════════════════════════════════════════════════════════ */
const TASK_TYPE_CN = { eval: '评测任务', redblue: '靶场攻防任务', agentrisk: '行为风险评测', training: '训练任务' };
const CONSOLE_CN = { eval: '评测控制台', redblue: '靶场控制台', agentrisk: '评测控制台', training: '训练控制台' };
/* 任务中心页内子 tab：任务类别 → tab 分组（任务中心不属于测试场，导航不高亮） */
const TASK_TAB_OF = { redblue: 'range', agentrisk: 'eval', eval: 'eval', training: 'training' };
const TC_TABS = [
  { id: 'all', label: '全部任务' },
  { id: 'range', label: '靶场任务' },
  { id: 'eval', label: '评测任务' },
  { id: 'training', label: '训练任务' },
];
let tcFilter = 'all';
const tcMatch = (category) => tcFilter === 'all' || TASK_TAB_OF[category] === tcFilter;
function tcTabsHtml() {
  return `
  <div class="range-tabs" id="tc-tabs">
    ${TC_TABS.map((t) => `<a class="range-tab${tcFilter === t.id ? ' active' : ''}" data-tc-tab="${t.id}">${t.label}</a>`).join('')}
  </div>`;
}
function bindTcTabs() {
  $$('#tc-tabs [data-tc-tab]').forEach((a) => a.addEventListener('click', () => {
    tcFilter = a.dataset.tcTab;
    $$('#tc-tabs .range-tab').forEach((x) => x.classList.toggle('active', x.dataset.tcTab === tcFilter));
    renderRunning();
    renderDoneList();
    renderRiskAnalysis();
    const badge = $('#run-count-badge');
    if (badge) badge.textContent = `${runningVisible() ? 1 : 0} 个`;
  }));
}
function runningVisible() {
  const cfg = JSON.parse(sessionStorage.getItem('aisr-runCfg') || 'null');
  return !!(cfg && sessionStorage.getItem('aisr-running') === '1' && tcMatch(cfg.category));
}
function consoleHashOf(cfg) {
  return cfg.category === 'redblue' ? '#/range' : cfg.category === 'training' ? '#/training-console' : '#/workbench';
}

function renderTasks() {
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div class="page-head-left">
        <a class="btn-back" href="#/range-tasks" title="返回首页（靶场任务）">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5 4.5 8l5.5 5.5"/></svg>
          <span>返回首页</span>
        </a>
        <div>
          <h2 class="page-title">任务中心</h2>
          <p class="page-desc">全部任务的统一运行视图 · 点击运行中窗口进入对应任务控制台</p>
        </div>
      </div>
      <button class="btn btn-primary" id="btn-new-task">＋ 新建任务</button>
    </div>
    <div class="history-head">任务仪表盘<span class="head-badge">实时</span></div>
    ${statCardsHtml(TASK_STATS)}
    ${tcTabsHtml()}
    <div class="history-head">运行中任务<span class="head-badge" id="run-count-badge">${runningVisible() ? 1 : 0} 个</span></div>
    <div id="runwin-wrap" style="margin-bottom:32px"></div>
    <div class="history-head">已完成任务</div>
    <div class="done-list" id="done-list"></div>
    <div id="risk-wrap"></div>
  </div>`;
  bindTcTabs();
  renderRunning();
  renderDoneList();
  renderRiskAnalysis();
  every(tickRunning, 1000);
  $('#btn-new-task').addEventListener('click', () => openMarketplace(null));
}

/* ── 风险分析板块：训练过程产生的风险数据，可批量分析 / 下载 / 管理，一键生成风险报告 ── */
const RISK_DATA = [
  { id: 'RSK-2607-01', name: '越狱诱导成功轨迹', source: 'PentestGPT-Attack-v3 · 第 8 轮', type: '攻击成功样本', level: 'high', count: 236, time: '07-27 22:14', archived: false },
  { id: 'RSK-2607-02', name: '敏感信息泄露样本', source: 'Sentinel-7B · 防御训练', type: '数据泄露样本', level: 'high', count: 118, time: '07-27 20:02', archived: false },
  { id: 'RSK-2607-03', name: '提示注入变体集合', source: 'ExploitCraft · 专精训练', type: '对抗样本', level: 'mid', count: 342, time: '07-27 16:45', archived: false },
  { id: 'RSK-2607-04', name: '红线边界误判样本', source: '红队对齐训练 · 第 5 轮', type: '误判样本', level: 'mid', count: 205, time: '07-26 21:30', archived: false },
  { id: 'RSK-2607-05', name: '工具调用越权轨迹', source: 'Mythos-Attack-v2 · 第 11 轮', type: '越权轨迹', level: 'high', count: 97, time: '07-26 15:12', archived: false },
  { id: 'RSK-2607-06', name: '防御绕过对抗样本', source: 'Sentinel-7B · 防御训练', type: '对抗样本', level: 'low', count: 428, time: '07-25 19:48', archived: false },
];
const RISK_LEVEL = { high: ['高危', 'badge-destructive'], mid: ['中危', 'badge-gold'], low: ['低危', 'badge-olive'] };
const riskSelected = new Set();
function riskVisible() { return tcFilter === 'all' || tcFilter === 'training'; }
function renderRiskAnalysis() {
  const wrap = $('#risk-wrap');
  if (!wrap) return;
  if (!riskVisible()) { wrap.innerHTML = ''; return; }
  const rows = RISK_DATA.filter((r) => !r.archived);
  wrap.innerHTML = `
  <div class="history-head" style="margin-top:32px">风险分析<span class="head-badge">训练过程风险数据 · ${rows.length} 批</span></div>
  <div class="risk-bar">
    <label class="risk-sel-all"><input type="checkbox" id="risk-sel-all"> 全选</label>
    <span class="small muted" id="risk-sel-count">已选 0 批</span>
    <span style="flex:1"></span>
    <button class="btn btn-outline btn-sm" id="risk-batch-analyze" disabled>批量分析</button>
    <button class="btn btn-outline btn-sm" id="risk-batch-dl" disabled>批量下载</button>
    <button class="btn btn-primary btn-sm" id="risk-report">生成风险报告</button>
  </div>
  <div class="risk-list">
    ${rows.map((r) => `
    <div class="risk-row" data-risk="${r.id}">
      <input type="checkbox" class="risk-check" data-risk-check="${r.id}" ${riskSelected.has(r.id) ? 'checked' : ''}>
      <div class="risk-main">
        <div class="risk-name">${esc(r.name)} <span class="dr-id">${r.id}</span></div>
        <div class="risk-sub">来源：${esc(r.source)} · ${esc(r.type)}</div>
      </div>
      <span class="badge ${RISK_LEVEL[r.level][1]}">${RISK_LEVEL[r.level][0]}</span>
      <span class="dr-cell"><b>${r.count}</b> 条</span>
      <span class="dr-cell mono">${r.time}</span>
      <span class="dr-actions">
        <button class="btn btn-ghost btn-sm" data-risk-analyze="${r.id}">分析</button>
        <button class="btn btn-ghost btn-sm" data-risk-archive="${r.id}">归档</button>
      </span>
    </div>`).join('') || '<div class="runwin-empty">全部风险数据已归档</div>'}
  </div>`;
  const updateSel = () => {
    const n = riskSelected.size;
    $('#risk-sel-count').textContent = `已选 ${n} 批`;
    $('#risk-batch-analyze').disabled = n === 0;
    $('#risk-batch-dl').disabled = n === 0;
    $('#risk-sel-all').checked = n > 0 && n === rows.length;
  };
  $('#risk-sel-all').addEventListener('change', (e) => {
    riskSelected.clear();
    if (e.target.checked) rows.forEach((r) => riskSelected.add(r.id));
    renderRiskAnalysis();
  });
  $$('[data-risk-check]').forEach((c) => c.addEventListener('change', () => {
    if (c.checked) riskSelected.add(c.dataset.riskCheck); else riskSelected.delete(c.dataset.riskCheck);
    updateSel();
  }));
  $$('[data-risk-analyze]').forEach((b) => b.addEventListener('click', () => openRiskAnalyze([b.dataset.riskAnalyze])));
  $$('[data-risk-archive]').forEach((b) => b.addEventListener('click', () => {
    const r = RISK_DATA.find((x) => x.id === b.dataset.riskArchive);
    r.archived = true; riskSelected.delete(r.id);
    renderRiskAnalysis();
    showToast(`「${r.name}」已归档（演示）`);
  }));
  $('#risk-batch-analyze').addEventListener('click', () => openRiskAnalyze([...riskSelected]));
  $('#risk-batch-dl').addEventListener('click', () => {
    const items = RISK_DATA.filter((r) => riskSelected.has(r.id));
    downloadBlob(`risk-data-${dlDate()}.json`, new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }));
    showToast(`已下载 ${items.length} 批风险数据 JSON`);
  });
  $('#risk-report').addEventListener('click', () => openRiskReport([...riskSelected]));
  updateSel();
}
/* 批量 / 单条分析：等级分布 + 类型聚合（演示分析结果） */
function openRiskAnalyze(ids) {
  const items = RISK_DATA.filter((r) => ids.includes(r.id));
  if (!items.length) return;
  const lv = { high: 0, mid: 0, low: 0 };
  const types = {};
  items.forEach((r) => { lv[r.level] += r.count; types[r.type] = (types[r.type] || 0) + r.count; });
  const total = items.reduce((a, r) => a + r.count, 0);
  openModal(`
    <div class="modal-title serif">风险数据分析结果</div>
    <div class="modal-sub">${items.length} 批 · 共 ${total} 条风险样本</div>
    <div class="modal-body">
      <div class="stats-row">
        <div class="card"><div class="card-sub">高危样本</div><div class="stat-num" style="color:var(--destructive)">${lv.high}</div></div>
        <div class="card"><div class="card-sub">中危样本</div><div class="stat-num" style="color:var(--chart-4)">${lv.mid}</div></div>
        <div class="card"><div class="card-sub">低危样本</div><div class="stat-num" style="color:var(--chart-3)">${lv.low}</div></div>
      </div>
      <table class="report-table" style="margin-top:14px">
        <thead><tr><th>风险类型</th><th class="num">样本数</th><th class="num">占比</th></tr></thead>
        <tbody>${Object.entries(types).map(([t, c]) => `<tr><td>${t}</td><td class="num">${c}</td><td class="num">${Math.round((c / total) * 100)}%</td></tr>`).join('')}</tbody>
      </table>
      <p class="mini-note" style="margin-top:12px">分析结论：高危样本集中于越狱诱导与越权调用轨迹，建议优先回流红队对齐训练并上调红线判定阈值。</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" id="risk-az-close">关闭</button>
      <button class="btn btn-primary" id="risk-az-report">生成风险报告</button>
    </div>`);
  $('#risk-az-close').addEventListener('click', closeModal);
  $('#risk-az-report').addEventListener('click', () => openRiskReport(ids));
}
/* 快速生成风险报告：弹窗预览 + 下载 Markdown 报告 */
function openRiskReport(ids) {
  const items = RISK_DATA.filter((r) => ids.includes(r.id));
  const scope = items.length ? items : RISK_DATA.filter((r) => !r.archived);
  const total = scope.reduce((a, r) => a + r.count, 0);
  const high = scope.filter((r) => r.level === 'high');
  const md = [
    `# 训练风险数据报告`, ``,
    `- 报告编号：RPT-RISK-${dlDate()}`, `- 生成时间：${new Date().toLocaleString('zh-CN')}`,
    `- 覆盖范围：${scope.length} 批风险数据 · 共 ${total} 条样本`, `- 高危批次：${high.length} 批`, ``,
    `## 风险数据明细`, ``,
    ...scope.map((r) => `- [${RISK_LEVEL[r.level][0]}] ${r.name}（${r.id}）· 来源 ${r.source} · ${r.count} 条 · ${r.time}`), ``,
    `## 结论与建议`, ``,
    `1. 高危样本集中于越狱诱导与越权调用轨迹，建议优先回流红队对齐训练；`,
    `2. 对抗样本占比持续上升，建议下一轮训练提高防御目标权重；`,
    `3. 误判样本建议进入评测错题集，用于红线边界回归验证。`,
  ].join('\n');
  openModal(`
    <div class="modal-title serif">风险报告已生成</div>
    <div class="modal-sub mono">RPT-RISK-${dlDate()} · ${scope.length} 批 · ${total} 条样本</div>
    <div class="modal-body">
      <pre class="risk-report-preview">${esc(md)}</pre>
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" id="risk-rp-close">关闭</button>
      <button class="btn btn-primary" id="risk-rp-dl">下载风险报告（.md）</button>
    </div>`);
  $('#risk-rp-close').addEventListener('click', closeModal);
  $('#risk-rp-dl').addEventListener('click', () => {
    downloadBlob(`risk-report-${dlDate()}.md`, new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    showToast('风险报告已下载');
  });
}

/* ── 运行中任务区：创建后立即可见的小窗，按任务类型模拟运行 ────── */
function renderRunning() {
  const wrap = $('#runwin-wrap');
  const cfg = JSON.parse(sessionStorage.getItem('aisr-runCfg') || 'null');
  if (!cfg || sessionStorage.getItem('aisr-running') !== '1' || !tcMatch(cfg.category)) {
    wrap.innerHTML = `<div class="runwin-empty">当前分类下没有运行中的任务 · 点击右上角「新建任务」发起评测 / 靶场攻防任务，或在训练场发起训练任务</div>`;
    return;
  }
  const meta = resolveRunMeta(cfg);
  wrap.innerHTML = `
  <div class="runwin-grid">
    <div class="runwin" id="user-win" role="link" tabindex="0">
      <div class="runwin-head">
        <span class="live-dot"></span>
        <span class="runwin-title">${esc(meta.title || '未命名任务')} · 你发起的任务</span>
        <span class="badge badge-primary">${TASK_TYPE_CN[cfg.category] || '任务'}</span>
      </div>
      <div class="runwin-viz"><div class="sim-risk" id="uw-viz"></div></div>
      <div class="runwin-foot">
        <div class="prog-track"><div class="prog-fill" id="uw-fill" style="width:2%"></div></div>
        <div class="runwin-meta">
          <span id="uw-step">初始化运行环境…</span>
          <span class="mono"><span id="uw-pct">0%</span> · <span id="uw-time">00:00</span></span>
        </div>
      </div>
      <div class="runwin-goto">点击进入${CONSOLE_CN[cfg.category] || '任务控制台'} →</div>
    </div>
  </div>`;
  const go = () => { location.hash = consoleHashOf(cfg); };
  $('#user-win').addEventListener('click', go);
  $('#user-win').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
/* 小窗运行模拟：按任务类型推进步骤（纯演示，与真实引擎无关） */
function tickRunning() {
  const cfg = JSON.parse(sessionStorage.getItem('aisr-runCfg') || 'null');
  if (!cfg || !$('#uw-fill')) return;
  const t0 = parseInt(sessionStorage.getItem('aisr-runStart') || String(Date.now()), 10);
  const el = Date.now() - t0;
  $('#uw-time').textContent = fmtElapsed(el);
  const viz = $('#uw-viz');
  const paint = (pct, step, vizHtml) => {
    $('#uw-fill').style.width = pct + '%';
    $('#uw-pct').textContent = pct + '%';
    $('#uw-step').textContent = step;
    if (viz && vizHtml) viz.innerHTML = vizHtml;
  };
  if (cfg.category === 'training') {
    const total = cfg.epochs || 12;
    const ep = Math.min(total, 1 + Math.floor(el / 4000));
    const pct = Math.min(97, Math.round((ep / total) * 100));
    const loss = (1.8 * Math.exp(-ep / (total / 2)) + 0.12 + Math.sin(el / 900) * 0.03).toFixed(3);
    const reward = (0.18 + (ep / total) * 0.68).toFixed(2);
    paint(pct, `Epoch ${ep}/${total} · loss ${loss}`, `
      <span>Epoch <b>${ep}/${total}</b></span>
      <span>loss <b>${loss}</b></span>
      <span>reward <b style="color:var(--chart-3)">${reward}</b></span>
      <span>吞吐 <b>128 samples/s</b></span>`);
  } else if (cfg.category === 'eval' || cfg.category === 'agentrisk') {
    const i = Math.min(EVAL_STEPS.length, 1 + Math.floor(el / 3000));
    const pct = Math.min(97, Math.round((i / EVAL_STEPS.length) * 100));
    const fails = Math.floor(i * 0.22), part = Math.floor(i * 0.13);
    paint(pct, `当前检测：${EVAL_STEPS[i - 1].name}`, `
      <span>已检测 <b>${i}/${EVAL_STEPS.length}</b></span>
      <span>未通过 <b style="color:var(--destructive)">${fails}</b></span>
      <span>部分 <b style="color:var(--chart-4)">${part}</b></span>
      <span>通过 <b style="color:var(--chart-3)">${i - fails - part}</b></span>`);
  } else {
    const i = Math.min(RB_STEPS.length, 1 + Math.floor(el / 3000));
    const pct = Math.min(97, Math.round((i / RB_STEPS.length) * 100));
    const s = RB_STEPS[i - 1];
    paint(pct, `当前：M${s.g} ${RB_GROUPS[s.g - 1].name}`, `
      <span>里程碑 <b>${Math.max(0, s.g - 1)}/${RB_GROUPS.length}</b></span>
      <span>攻击得分 <b>${i * 14}</b></span>
      <span>渗透阶段 <b style="color:var(--primary)">${RANGE_KILLCHAIN[Math.min(5, Math.floor((i / RB_STEPS.length) * 6))]}</b></span>`);
  }
}

/* ── 已完成任务列表（任务标签 / 结果标签 / 数据标签 + 三个操作）────── */
const DATA_TAGS = { eval: ['评测报告', '错题集'], redblue: ['攻防轨迹', '可视化报告'], agentrisk: ['行为日志', '评测报告'], training: ['训练数据集', '模型权重'] };
function renderDoneList() {
  const all = [...PRESET_RESULTS, ...HISTORY_TASKS];
  /* idx 保持全量列表下标，与 buildDatasets().reports 对齐 */
  const rows = all.map((t, i) => ({ t, i })).filter(({ t }) => tcMatch(t.category));
  const { reports } = buildDatasets();
  const canDownload = ucRole() !== 'viewer';
  $('#done-list').innerHTML = rows.map(({ t, i: idx }) => {
    const rec = synthRecord(t);
    const end = new Date(rec.endedAt);
    const stat3 = rec.category === 'eval'
      ? `检出风险点 <b>${rec.riskItems.filter((r) => r.verdict !== 'pass').length}</b> 项`
      : `攻陷里程碑 <b>${rec.groupsDone}/${rec.groupsTotal}</b>`;
    return `
    <div class="done-row" data-done="${t.id}">
      <div class="dr-title">
        <span>${esc(rec.title)}</span>
        ${t.example ? '<span class="badge badge-example">示例</span>' : ''}
        <span class="dr-id">${t.id}</span>
      </div>
      <span class="badge badge-primary">${catShort(rec.category)}</span>
      <span class="badge ${rec.verdictClass === 'v-olive' ? 'badge-olive' : rec.verdictClass === 'v-gold' ? 'badge-gold' : 'badge-destructive'}">${rec.verdict}</span>
      <span class="dr-tags">${(DATA_TAGS[rec.category] || ['任务报告']).map((x) => `<span class="badge">${x}</span>`).join('')}</span>
      <span class="dr-cell"><b>${rec.score}</b> 分</span>
      <span class="dr-cell">${fmtElapsed(rec.elapsedMs)} · ${stat3}</span>
      <span class="dr-cell">${end.toLocaleDateString('zh-CN')} · ${esc(executorLabel(rec))}</span>
      <span class="dr-actions">
        <button class="btn btn-primary btn-sm" data-again="${t.id}" title="沿用配置进入新建任务流程">再次启动</button>
        <button class="btn btn-ghost btn-sm" data-report2="${t.id}">查看报告</button>
        <button class="btn btn-outline btn-sm" data-dl="${idx}" ${canDownload ? '' : 'disabled title="viewer 角色仅可查看"'}>下载数据集</button>
      </span>
    </div>`;
  }).join('');
  const openReport = (id) => {
    const task = all.find((x) => x.id === id);
    sessionStorage.setItem('aisr-lastRun', JSON.stringify(synthRecord(task)));
    location.hash = '#/result-detail';
  };
  $$('[data-done]').forEach((el) => el.addEventListener('click', () => openReport(el.dataset.done)));
  $$('[data-report2]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openReport(b.dataset.report2); }));
  $$('[data-again]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const task = all.find((x) => x.id === b.dataset.again);
    openMarketplace({ ...task.cfg });
  }));
  $$('[data-dl]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    openDlPop(b, 'reports', reports[Number(b.dataset.dl)]);
  }));
}

/* ════════════════════════════════════════════════════════════════
 * 靶场控制台 · 常驻运行实例引擎（0724 改版 v2）
 * hero（监控窗，只读）与控制台（可操作）共用同一引擎与实例状态
 * 进度模型：live.acc 累积速度 → 按节点防护成本推进 step；剧本循环重播
 * rangeCtl：节点开关/配置、环境注入、全局暂停等可操作状态（重置可恢复）
 * ════════════════════════════════════════════════════════════════ */
const rangeState = { scene: 'grid' };
const rangeLive = {};
Object.keys(RANGE_SCENES).forEach((k) => { rangeLive[k] = { step: 0, tick: 0, acc: 0, logN: 0, t0: Date.now(), lines: [] }; });

function freshCtl(sceneKey) {
  return {
    paused: false, pauseStart: 0,
    speed: 1, agentN: RANGE_SCENES[sceneKey].agents.length,
    latency: 20, loadPct: 42,
    bizLoad: 12.4, alertTh: 70,
    nodeCfg: {}, added: [], addSeq: 1,
  };
}
const rangeCtl = {};
Object.keys(RANGE_SCENES).forEach((k) => { rangeCtl[k] = freshCtl(k); });

const RANGE_STATE_CN = { idle: '在线', active: '攻击中', owned: '被攻破', detected: '被探测', alert: '告警', attacker: '攻击源', offline: '已下线' };
const POLICY_CN = { none: '无', base: '基础', hard: '强化' };

/* 生效场景 = 基础场景 + 节点配置覆盖 + 自定义节点 */
function rangeSceneNow(sceneKey) {
  const sc = RANGE_SCENES[sceneKey], ctl = rangeCtl[sceneKey];
  const merge = (n) => ({ ...n, ...(ctl.nodeCfg[n.id] || {}) });
  const nodes = sc.nodes.map(merge).concat(ctl.added.map(merge));
  const edges = sc.edges.concat(ctl.added.filter((n) => n.linkTo).map((n) => [n.linkTo, n.id]));
  return { ...sc, nodes, edges };
}
function nodeCost(sceneKey, id) {
  const p = (rangeCtl[sceneKey].nodeCfg[id] || {}).policy || 'none';
  return p === 'hard' ? 3 : p === 'base' ? 2 : 1;
}

function rangeNodeTag(st) {
  const m = { idle: 'dot-ok', active: 'dot-warn', detected: 'dot-warn', owned: 'dot-bad', alert: 'dot-bad', attacker: 'dot-bad', offline: 'dot-off' };
  return `<span class="env-status"><span class="dot ${m[st] || 'dot-ok'}"></span>${RANGE_STATE_CN[st] || '在线'}</span>`;
}
function rangeStage(sceneKey) {
  const sc = RANGE_SCENES[sceneKey], live = rangeLive[sceneKey];
  if (live.step > sc.path.length + 2) return 6;
  return Math.min(5, Math.floor((Math.min(live.step, sc.path.length) / sc.path.length) * 6));
}
function rangeNodeStates(sceneKey) {
  const sc = rangeSceneNow(sceneKey), live = rangeLive[sceneKey], ctl = rangeCtl[sceneKey];
  const st = {};
  sc.nodes.forEach((n) => { st[n.id] = n.id === sc.attacker ? 'attacker' : 'idle'; });
  const step = Math.min(live.step, sc.path.length);
  sc.path.forEach((id, i) => { if (i < step) st[id] = 'owned'; });
  if (step < sc.path.length) st[sc.path[step]] = 'active';
  if (step + 1 < sc.path.length) st[sc.path[step + 1]] = 'detected';
  if (step >= 4 && step < sc.path.length) st[sc.path[1]] = 'alert';
  sc.nodes.forEach((n) => { if ((ctl.nodeCfg[n.id] || {}).offline) st[n.id] = 'offline'; });
  return st;
}
function rangeEdgeCls(sceneKey, a, b, st) {
  const sc = rangeSceneNow(sceneKey), live = rangeLive[sceneKey];
  if (st[a] === 'offline' || st[b] === 'offline') return 'range-edge dead';
  const ownedish = (id) => ['owned', 'attacker', 'alert'].includes(st[id]);
  const activeId = live.step < sc.path.length ? sc.path[live.step] : null;
  if (ownedish(a) && ownedish(b)) return 'range-edge owned';
  if ((a === activeId && ownedish(b)) || (b === activeId && ownedish(a))) return 'range-edge live';
  return 'range-edge';
}
function buildRangeTopo(sceneKey, interactive) {
  const sc = rangeSceneNow(sceneKey);
  const st = rangeNodeStates(sceneKey);
  const byId = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
  const H = Number(sc.viewBox.split(' ')[3]);
  const zones = sc.zones.map((z) => `
    <rect class="range-zone" x="${z.x}" y="24" width="${z.w}" height="${H - 36}" rx="2"/>
    <text class="range-zone-label" x="${z.x + 10}" y="16">${z.label}</text>`).join('');
  const addBlocks = interactive ? sc.zones.map((z) => `
    <g class="range-add" data-addzone="${z.id}" transform="translate(${z.x + z.w / 2},0)">
      <rect x="${-(z.w - 24) / 2}" y="30" width="${z.w - 24}" height="22" rx="2"/>
      <text x="0" y="45" text-anchor="middle">＋ 添加节点</text>
    </g>`).join('') : '';
  const edges = sc.edges.filter(([a, b]) => byId[a] && byId[b]).map(([a, b]) => {
    const A = byId[a], B = byId[b];
    return `<line class="${rangeEdgeCls(sceneKey, a, b, st)}" data-redge="${a}-${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }).join('');
  const nodes = sc.nodes.map((n) => {
    const s = st[n.id] || 'idle';
    return `<g class="topo-node ${s !== 'idle' ? s : ''}" data-node="${n.id}" transform="translate(${n.x},${n.y})">
      <rect class="frame" x="-58" y="-26" width="116" height="52" rx="2"/>
      ${NODE_ICONS[n.type] || NODE_ICONS.device}
      <text x="0" y="11" text-anchor="middle">${n.label}</text>
      <text class="topo-ip" x="0" y="21" text-anchor="middle">${n.ip}</text>
    </g>`;
  }).join('');
  return `<svg class="topo-svg" id="rg-topo-svg" viewBox="${sc.viewBox}" xmlns="http://www.w3.org/2000/svg">${zones}${addBlocks}${edges}${nodes}</svg>`;
}
function updateRangeTopo(sceneKey) {
  const svg = $('#rg-topo-svg'); if (!svg) return;
  const st = rangeNodeStates(sceneKey);
  $$('.topo-node', svg).forEach((g) => {
    const s = st[g.dataset.node];
    g.setAttribute('class', `topo-node${s && s !== 'idle' ? ' ' + s : ''}`);
  });
  $$('[data-redge]', svg).forEach((l) => {
    const [a, b] = l.dataset.redge.split('-');
    l.setAttribute('class', rangeEdgeCls(sceneKey, a, b, st));
  });
}
function rangeKillchainHtml(sceneKey) {
  const sc = RANGE_SCENES[sceneKey], live = rangeLive[sceneKey];
  const cur = rangeStage(sceneKey);
  return RANGE_KILLCHAIN.map((name, i) => {
    const state = i < cur ? 'done' : i === cur ? 'current' : 'todo';
    const mark = state === 'done' ? '✓' : state === 'current' ? '▸' : String(i + 1);
    const time = state === 'done' ? sc.stageTimes[i] : state === 'current' ? fmtElapsed(Date.now() - live.t0) : '—';
    return `<div class="kc-stage ${state}"><span class="kc-name"><span class="kc-mark">${mark}</span>${name}</span><span class="kc-time">${time}</span></div>`;
  }).join('');
}
function rangeDepthInfo(sceneKey) {
  const sc = RANGE_SCENES[sceneKey], live = rangeLive[sceneKey];
  const step = Math.min(live.step, sc.path.length);
  if (step === 0) return null;
  const zoneIdx = Object.fromEntries(sc.nodes.map((n) => [n.id, sc.zones.findIndex((z) => z.id === n.zone)]));
  let deepest = 0;
  sc.path.slice(0, step).forEach((id) => { deepest = Math.max(deepest, zoneIdx[id]); });
  return { label: sc.zones[deepest].depth, layer: deepest + 1, total: sc.zones.length };
}
/* 参数读数：与控制面板联动（负载/延迟注入/业务负荷/告警阈值/下线节点） */
function rangeParamVal(sceneKey, p, i, tick) {
  const ctl = rangeCtl[sceneKey];
  const j = (amp) => Math.sin(tick * 0.6 + i * 1.3) * amp + Math.sin(tick * 1.7 + i * 2.6) * amp * 0.3;
  if (p.label === '当前负荷') return `${(ctl.bizLoad + j(0.2)).toFixed(1)} GW`;
  if (p.label === '接入 RTU') {
    const cfg = ctl.nodeCfg;
    const off = (cfg.rtu07 && cfg.rtu07.offline ? 1 : 0)
      + ctl.added.filter((n) => n.type === 'device' && (cfg[n.id] || {}).offline).length;
    return `${86 - off} 台`;
  }
  if (p.label === 'SCADA CPU' || p.label === 'DCS CPU') return `${Math.max(5, Math.round(ctl.loadPct + j(4)))}%`;
  if (p.label === 'EMS 内存') return `${Math.round(20 + ctl.loadPct * 0.5 + j(3))}%`;
  if (p.label === '调度网延迟' || p.label === '内网延迟') return `${Math.max(1, Math.round(6 + ctl.latency + j(3)))}ms`;
  if (p.label === '实时告警') {
    const baseN = parseInt(p.fixed, 10) || 3;
    return `${ctl.loadPct >= ctl.alertTh ? baseN + 2 : baseN} 条`;
  }
  if (p.fixed) return p.fixed;
  return `${(p.base + j(p.jitter)).toFixed(p.digits)} ${p.unit}`;
}
function pushRangeLog(sceneKey, text) {
  const live = rangeLive[sceneKey];
  live.lines.push({ t: fmtClock(new Date()), text });
  if (live.lines.length > 60) live.lines = live.lines.slice(-60);
}
function rangeAgentsHtml(sceneKey) {
  const sc = RANGE_SCENES[sceneKey], ctl = rangeCtl[sceneKey];
  const shown = sc.agents.slice(0, Math.min(ctl.agentN, sc.agents.length));
  const atk = shown.filter((a) => a.side === '攻击').length;
  const rest = sc.agents.length - shown.length;
  return {
    count: `${atk} 攻击 · ${shown.length - atk} 防守`,
    html: shown.map((a) => `
          <div class="rg-agent">
            <span class="a-id ${a.side === '攻击' ? 'side-atk' : 'side-def'}">${a.id}</span>
            <span class="a-task" title="${esc(a.task)}">${esc(a.task)}</span>
            <span class="a-model">${esc(a.model)} · ${a.status}</span>
          </div>`).join('')
      + (rest > 0 ? `<div class="rg-agent"><span class="a-task small muted">其余 ${rest} 个待命（环境控制面板可调并发）</span></div>` : ''),
  };
}
function rangeSectionHtml(sceneKey, mode) {
  const sc = rangeSceneNow(sceneKey);
  const ctl = rangeCtl[sceneKey];
  const hero = mode === 'hero';
  const hasBiz = sc.params.some((p) => p.label === '当前负荷');
  const topoBlock = hero
    ? `<div class="rh-topo" id="rg-topo">${buildRangeTopo(sceneKey, false)}</div>`
    : `<div class="rh-topo range-topo rg-canvas" id="rg-topo">
        ${buildRangeTopo(sceneKey, true)}
        <div class="rg-hud hud-bar">
          <div class="hud-gauges" id="rg-hud-gauges"></div>
          <div class="hud-controls">
            <div class="hud-row"><span class="hud-k">负载</span><input type="range" id="ep-load" min="10" max="95" step="1" value="${ctl.loadPct}"><span class="hud-v" id="ep-load-v">${ctl.loadPct}%</span></div>
            <div class="hud-row"><span class="hud-k">延迟</span><input type="range" id="ep-lat" min="0" max="200" step="5" value="${ctl.latency}"><span class="hud-v" id="ep-lat-v">${ctl.latency}ms</span></div>
            ${hasBiz ? `<div class="hud-row"><span class="hud-k">负荷</span><input type="range" id="ep-biz" min="8" max="18" step="0.1" value="${ctl.bizLoad}"><span class="hud-v" id="ep-biz-v">${ctl.bizLoad.toFixed(1)}GW</span></div>` : ''}
            <div class="hud-row"><span class="hud-k">速度</span>${[0.5, 1, 2].map((v) => `<span class="chip-mini${ctl.speed === v ? ' selected' : ''}" data-speed="${v}">${v}x</span>`).join('')}</div>
            <div class="hud-row"><span class="hud-k">智能体</span><button class="hud-step" id="ep-ag-minus">−</button><span class="hud-v" id="ep-agents-v">${ctl.agentN}</span><button class="hud-step" id="ep-ag-plus">＋</button></div>
            <div class="hud-row"><span class="hud-k">阈值</span><input type="range" id="ep-th" min="50" max="90" step="5" value="${ctl.alertTh}"><span class="hud-v" id="ep-th-v">${ctl.alertTh}%</span></div>
            <span class="hud-spacer"></span>
            <div class="hud-row"><button class="btn btn-primary btn-sm" id="rg-pause">${ctl.paused ? '继续演练' : '暂停演练'}</button><button class="btn btn-outline btn-sm" id="rg-reset">重置环境</button></div>
          </div>
        </div>
      </div>`;
  return `
  <section class="card range-hero${hero ? ' range-showcase' : ''}"${hero ? ' id="rg-hero-sec" role="link" tabindex="0" aria-label="进入靶场控制台" title="点击进入靶场控制台"' : ''}>
    <div class="rh-head">
      <span class="live-dot"></span>
      <span class="rh-title">${sc.title}</span>
      <span class="badge badge-primary">${sc.badge}</span>
      <span class="env-status"><span class="dot dot-ok"></span>运行中</span>
      <span class="rh-depth" id="rg-depth"></span>
    </div>
    <div class="rh-killchain" id="rg-kc">${rangeKillchainHtml(sceneKey)}</div>
    <div class="rh-body">
      ${topoBlock}
      <aside class="rh-side">
        <div class="rh-sec">
          <div class="rh-sec-title"><span>并发攻防智能体</span><span class="mono" id="rg-agents-count"></span></div>
          <div id="rg-agents-list"></div>
        </div>
        ${hero ? '' : `
        <div class="rh-sec">
          <div class="rh-sec-title"><span>任务编排</span><span class="mono">12 子任务</span></div>
          <div class="rg-orch">
            <span>已完成 <b id="rg-od">0</b></span>
            <span>进行中 <b id="rg-og">1</b></span>
            <span>待执行 <b id="rg-ot">11</b></span>
          </div>
        </div>`}
        ${hero ? `
        <div class="rh-sec">
          <div class="rh-sec-title"><span>环境仿真参数</span><span class="mono">${esc(sc.subnet)}</span></div>
          <div class="rg-params">
            ${sc.params.map((p, i) => `<div class="rg-param"><span class="p-label">${p.label}</span><span class="p-val${p.alert ? ' alert' : ''}" id="rg-pv-${i}">${p.fixed || ''}</span></div>`).join('')}
          </div>
        </div>` : ''}
        ${hero ? '' : `
        <div class="rh-sec">
          <div class="rh-sec-title"><span>任务结果（实时）</span></div>
          <div class="rg-ministats">
            <div class="rg-ministat"><span class="k">攻陷节点</span><span class="v" id="rg-own">0/${sc.path.length}</span></div>
            <div class="rg-ministat"><span class="k">攻击得分</span><span class="v" id="rg-score">0</span></div>
            <div class="rg-ministat"><span class="k">已用时</span><span class="v" id="rg-elapsed">00:00</span></div>
          </div>
        </div>`}
      </aside>
    </div>
    <div class="rh-foot">
      <div class="rh-prog-row">
        <span class="small muted" style="white-space:nowrap">攻击总进度</span>
        <div class="prog-track"><div class="prog-fill" id="rg-prog-fill" style="width:0%"></div></div>
        <span class="pct mono" id="rg-prog-pct">0%</span>
        <span class="small" id="rg-cur-action" style="min-width:180px"></span>
      </div>
      <div class="rg-log" id="rg-log"></div>
    </div>
    ${hero ? '<span class="rh-chip">点击进入靶场控制台 →</span>' : ''}
  </section>`;
}
function paintRange(sceneKey) {
  if (!$('#rg-topo-svg')) return;
  const sc = rangeSceneNow(sceneKey), live = rangeLive[sceneKey], ctl = rangeCtl[sceneKey];
  updateRangeTopo(sceneKey);
  const kc = $('#rg-kc'); if (kc) kc.innerHTML = rangeKillchainHtml(sceneKey);
  const d = rangeDepthInfo(sceneKey);
  const dt = $('#rg-depth');
  if (dt) dt.textContent = d ? `已渗透至${d.label} · ${d.layer}/${d.total} 层` : `渗透待命 · 0/${sc.zones.length} 层`;
  const ag = rangeAgentsHtml(sceneKey);
  const agc = $('#rg-agents-count'); if (agc) agc.textContent = ag.count;
  const agl = $('#rg-agents-list'); if (agl) agl.innerHTML = ag.html;
  const done = Math.min(live.step, sc.path.length);
  const pct = Math.round((done / sc.path.length) * 100);
  const pf = $('#rg-prog-fill'); if (pf) pf.style.width = pct + '%';
  const pp = $('#rg-prog-pct'); if (pp) pp.textContent = pct + '%';
  const byId = Object.fromEntries(sc.nodes.map((n) => [n.id, n]));
  const ca = $('#rg-cur-action');
  if (ca) {
    const targetId = live.step < sc.path.length ? sc.path[live.step] : null;
    const tOff = targetId && (ctl.nodeCfg[targetId] || {}).offline;
    ca.textContent = tOff
      ? `⚠ 目标 ${byId[targetId].label} 已下线 · 攻击路径中断，等待恢复`
      : targetId
        ? `当前动作：渗透 ${byId[targetId].label}（防护 ${POLICY_CN[(ctl.nodeCfg[targetId] || {}).policy || 'none']}）`
        : '目标达成 · 痕迹清理与回放生成';
  }
  const od = $('#rg-od');
  if (od) {
    const o12 = Math.round((done / sc.path.length) * 12);
    od.textContent = o12;
    $('#rg-og').textContent = o12 >= 12 ? 0 : 1;
    $('#rg-ot').textContent = 12 - o12 - (o12 >= 12 ? 0 : 1);
  }
  const own = $('#rg-own'); if (own) own.textContent = `${done}/${sc.path.length}`;
  const scEl = $('#rg-score'); if (scEl) scEl.textContent = done * 14;
  const el = $('#rg-elapsed'); if (el) el.textContent = fmtElapsed(Date.now() - live.t0);
  sc.params.forEach((p, i) => { const pv = $('#rg-pv-' + i); if (pv) pv.textContent = rangeParamVal(sceneKey, p, i, live.tick); });
  const hg = $('#rg-hud-gauges');
  if (hg) hg.innerHTML = sc.params.map((p, i) =>
    `<span class="hg-item"><span class="hg-k">${p.label}</span><span class="hg-v${p.alert ? ' alert' : ''}">${rangeParamVal(sceneKey, p, i, live.tick)}</span></span>`).join('');
  const log = $('#rg-log');
  if (log) log.innerHTML = live.lines.slice(-5).map((l) =>
    `<div class="rg-log-line"><span class="lg-t">[${l.t}]</span>${esc(l.text)}</div>`).join('');
}
function tickRange() {
  const sceneKey = rangeState.scene;
  const sc = rangeSceneNow(sceneKey), live = rangeLive[sceneKey], ctl = rangeCtl[sceneKey];
  if (!$('#rg-topo-svg')) return;
  if (ctl.paused) return;
  live.tick += 1;
  const targetId = live.step < sc.path.length ? sc.path[live.step] : null;
  const tOff = targetId && (ctl.nodeCfg[targetId] || {}).offline;
  if (!tOff) {
    live.acc += ctl.speed;
    const cost = targetId ? nodeCost(sceneKey, targetId) : 1;
    if (live.acc >= 3 * cost) { live.acc = 0; live.step += 1; }
  }
  const logEvery = Math.max(1, Math.round(2 / ctl.speed));
  if (live.tick % logEvery === 0 && live.logN < sc.logs.length) {
    pushRangeLog(sceneKey, sc.logs[live.logN]);
    live.logN += 1;
  }
  if (live.step > sc.path.length + 4) {
    live.step = 0; live.acc = 0; live.logN = 0; live.t0 = Date.now(); live.lines = [];
  }
  paintRange(sceneKey);
}

/* ── 拓扑交互（仅控制台）：悬停 tooltip + 点击节点抽屉 ─────────────── */
function ensureTopoTip() {
  let tip = $('#topo-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'topo-tip';
    document.body.appendChild(tip);
  }
  return tip;
}
function hideTopoTip() { const tip = $('#topo-tip'); if (tip) tip.style.display = 'none'; }
/* ── 图内交互层（仅控制台）：浮层定位 / 节点快捷条 / 节点浮卡 / 图内添加 ── */
function closeRgPops() {
  ['rg-quickpop', 'rg-nodepop', 'rg-addpop'].forEach((id) => {
    const el = document.getElementById(id); if (el) el.remove();
  });
}
/* 拓扑画布作用域：默认全局（控制台 / landing 演示窗）；
 * 新建任务预览（模板预览 / 启动弹窗）绑定期间指向预览容器，避免与页面上其他 #rg-topo 冲突 */
let rgRoot = null;
const rg$ = (sel) => $(sel, rgRoot || document);
const rg$$ = (sel) => $$(sel, rgRoot || document);
/* SVG viewBox 坐标 → 画布容器像素（letterbox 缩放换算） */
function rgAnchor(sceneKey, x, y) {
  const canvas = rg$('#rg-topo'), svg = rg$('#rg-topo-svg');
  if (!canvas || !svg) return null;
  const sc = rangeSceneNow(sceneKey);
  const vb = sc.viewBox.split(' ').map(Number);
  const cr = canvas.getBoundingClientRect(), sr = svg.getBoundingClientRect();
  const scale = Math.min(sr.width / vb[2], sr.height / vb[3]);
  const ox = sr.left - cr.left + (sr.width - vb[2] * scale) / 2;
  const oy = sr.top - cr.top + (sr.height - vb[3] * scale) / 2;
  return { x: ox + x * scale, y: oy + y * scale, scale };
}
function rgNodeAnchor(sceneKey, nodeId) {
  const sc = rangeSceneNow(sceneKey);
  const n = sc.nodes.find((x) => x.id === nodeId);
  return n ? rgAnchor(sceneKey, n.x, n.y) : null;
}
function placePop(pop, x, y) {
  const canvas = rg$('#rg-topo'); if (!canvas) return;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  pop.style.left = `${Math.max(6, Math.min(x, canvas.clientWidth - pw - 6))}px`;
  pop.style.top = `${Math.max(6, Math.min(y, canvas.clientHeight - ph - 6))}px`;
}
function applyNodeOnline(sceneKey, nodeId, online) {
  const ctl = rangeCtl[sceneKey];
  const sc = rangeSceneNow(sceneKey);
  const n = sc.nodes.find((x) => x.id === nodeId);
  const c = ctl.nodeCfg[nodeId] = ctl.nodeCfg[nodeId] || {};
  c.offline = !online;
  pushRangeLog(sceneKey, `[配置] ${n.label} 已${c.offline ? '下线，相关链路置灰' : '恢复上线'}`);
  closeRgPops();
  rebuildRangeTopo(sceneKey);
}
function deleteCustomNode(sceneKey, nodeId) {
  const ctl = rangeCtl[sceneKey];
  const sc = rangeSceneNow(sceneKey);
  const n = sc.nodes.find((x) => x.id === nodeId);
  ctl.added = ctl.added.filter((x) => x.id !== nodeId);
  delete ctl.nodeCfg[nodeId];
  pushRangeLog(sceneKey, `[环境] 自定义节点 ${n ? n.label : nodeId} 已移除`);
  closeRgPops();
  rebuildRangeTopo(sceneKey);
}
/* 节点悬停：快捷操作条（开关 / 防护策略 / 删除） */
let qpHideTimer = null;
function showQuickPop(sceneKey, nodeId) {
  const canvas = rg$('#rg-topo'); if (!canvas) return;
  closeRgPops();
  const sc = rangeSceneNow(sceneKey), ctl = rangeCtl[sceneKey];
  const n = sc.nodes.find((x) => x.id === nodeId);
  const a = rgNodeAnchor(sceneKey, nodeId); if (!a) return;
  const cfg = ctl.nodeCfg[nodeId] || {};
  const policy = cfg.policy || 'none';
  const isCustom = ctl.added.some((x) => x.id === nodeId);
  const pop = document.createElement('div');
  pop.className = 'rg-pop rg-quickpop'; pop.id = 'rg-quickpop';
  pop.innerHTML = `
    <input type="checkbox" class="switch" id="qp-online" ${cfg.offline ? '' : 'checked'} title="上线/下线">
    <span class="qp-sep"></span>
    ${[['none', '无'], ['base', '基础'], ['hard', '强化']].map(([v, t]) =>
      `<span class="chip-mini${policy === v ? ' selected' : ''}" data-qp="${v}">${t}</span>`).join('')}
    ${isCustom ? '<span class="qp-sep"></span><button class="qp-del" id="qp-del" title="删除节点">✕</button>' : ''}`;
  canvas.appendChild(pop);
  const above = a.y - 46 * a.scale - pop.offsetHeight - 6;
  placePop(pop, a.x - pop.offsetWidth / 2, above >= 6 ? above : a.y + 34 * a.scale + 6);
  pop.addEventListener('mouseenter', () => clearTimeout(qpHideTimer));
  pop.addEventListener('mouseleave', () => { qpHideTimer = setTimeout(closeRgPops, 200); });
  pop.addEventListener('click', (e) => e.stopPropagation());
  $('#qp-online').addEventListener('change', (e) => applyNodeOnline(sceneKey, nodeId, e.target.checked));
  $$('[data-qp]', pop).forEach((ch) => ch.addEventListener('click', () => {
    const c = ctl.nodeCfg[nodeId] = ctl.nodeCfg[nodeId] || {};
    c.policy = ch.dataset.qp;
    pushRangeLog(sceneKey, `[配置] 管理员将 ${n.label} 防护策略调整为 ${POLICY_CN[c.policy]}`);
    $$('[data-qp]', pop).forEach((x) => x.classList.toggle('selected', x === ch));
    paintRange(sceneKey);
  }));
  const del = $('#qp-del');
  if (del) del.addEventListener('click', () => deleteCustomNode(sceneKey, nodeId));
}
/* 节点点击：锚定浮动卡片（详情 + 内联编辑） */
function openRangeNodePop(sceneKey, nodeId) {
  const canvas = rg$('#rg-topo'); if (!canvas) return;
  closeRgPops();
  const sc = rangeSceneNow(sceneKey), ctl = rangeCtl[sceneKey];
  const n = sc.nodes.find((x) => x.id === nodeId);
  const zone = sc.zones.find((z) => z.id === n.zone);
  const cfg = ctl.nodeCfg[nodeId] || {};
  const st = rangeNodeStates(sceneKey)[nodeId] || 'idle';
  const events = (RANGE_SCENES[sceneKey].nodeEvents || {})[nodeId] || [];
  const a = rgNodeAnchor(sceneKey, nodeId); if (!a) return;
  const KIND = { scan: ['badge-gold', '探测'], attack: ['badge-destructive', '攻击'], defense: ['badge-olive', '防守'], info: ['', '信息'] };
  const pop = document.createElement('div');
  pop.className = 'rg-pop rg-nodepop'; pop.id = 'rg-nodepop';
  pop.innerHTML = `
    <div class="np-head">
      <div><div class="np-title">${esc(n.label)}</div><div class="np-zone">${esc(zone.label)}</div></div>
      <button class="btn btn-ghost btn-sm" id="np-x" aria-label="关闭">${ICO.x}</button>
    </div>
    <div class="np-state">${rangeNodeTag(st)}<span class="mono small muted">${esc(n.ip)}</span></div>
    <div class="np-static">系统：${esc(n.os)}</div>
    <div class="np-rows">
      <div class="op-row"><span>IP</span><input class="input input-sm mono" id="np-ip" value="${esc(n.ip)}"></div>
      <div class="op-row"><span>服务</span><input class="input input-sm mono" id="np-svc" value="${esc(n.svc.join(' · '))}"></div>
      <div class="op-row"><span>CPU</span><input class="input input-sm mono" id="np-cpu" value="${esc(cfg.cpu || '2 cores')}"></div>
      <div class="op-row"><span>内存</span><input class="input input-sm mono" id="np-mem" value="${esc(cfg.mem || '4 GB')}"></div>
    </div>
    <div class="np-events">
      ${events.length ? events.slice(0, 3).map(([t, k, txt]) =>
        `<div class="np-ev"><span class="t">${t}</span><span class="badge ${KIND[k][0]}">${KIND[k][1]}</span><span>${esc(txt)}</span></div>`).join('')
        : '<div class="np-ev"><span class="muted">暂无攻防事件</span></div>'}
    </div>
    <div class="np-foot"><button class="btn btn-primary btn-sm" id="np-save">保存配置</button></div>`;
  canvas.appendChild(pop);
  placePop(pop, a.x + 66 * a.scale, a.y - 30);
  pop.addEventListener('click', (e) => e.stopPropagation());
  $('#np-x').addEventListener('click', closeRgPops);
  $('#np-save').addEventListener('click', () => {
    const c = ctl.nodeCfg[nodeId] = ctl.nodeCfg[nodeId] || {};
    const newIp = $('#np-ip').value.trim(); if (newIp) c.ip = newIp;
    const svc = $('#np-svc').value.split(/[·,，;；]/).map((s) => s.trim()).filter(Boolean);
    if (svc.length) c.svc = svc;
    c.cpu = $('#np-cpu').value.trim(); c.mem = $('#np-mem').value.trim();
    pushRangeLog(sceneKey, `[配置] ${n.label} 节点配置已更新（IP ${c.ip || n.ip} · 配额 ${c.cpu}/${c.mem}）`);
    closeRgPops();
    rebuildRangeTopo(sceneKey);
  });
  setTimeout(() => document.addEventListener('click', closeRgPops, { once: true }), 0);
}
/* 分区内「＋ 添加节点」：原位内联小表单 */
function openAddNodePop(sceneKey, zoneId) {
  const canvas = rg$('#rg-topo'); if (!canvas) return;
  closeRgPops();
  const sc = rangeSceneNow(sceneKey), ctl = rangeCtl[sceneKey];
  const zone = sc.zones.find((z) => z.id === zoneId);
  const seq = ctl.addSeq;
  const zi = sc.zones.findIndex((z) => z.id === zoneId);
  const autoIp = `${sceneKey === 'grid' ? '10.60' : '172.20'}.${zi + 1}.${100 + seq}`;
  const a = rgAnchor(sceneKey, zone.x + zone.w / 2, 52); if (!a) return;
  const pop = document.createElement('div');
  pop.className = 'rg-pop rg-addpop'; pop.id = 'rg-addpop';
  pop.innerHTML = `
    <div class="ap-title">添加节点 · ${esc(zone.label)}</div>
    <div class="op-row"><span>名称</span><input class="input input-sm" id="ap-name" value="新增节点-${seq}"></div>
    <div class="op-row"><span>类型</span><select class="input input-sm" id="ap-type">
      <option value="server">服务器</option><option value="workstation">终端</option>
      <option value="device">网络设备</option><option value="firewall">安全设备</option></select></div>
    <div class="op-row"><span>IP</span><input class="input input-sm mono" id="ap-ip" value="${autoIp}"></div>
    <div class="np-foot"><button class="btn btn-ghost btn-sm" id="ap-cancel">取消</button><button class="btn btn-primary btn-sm" id="ap-ok">确认添加</button></div>`;
  canvas.appendChild(pop);
  placePop(pop, a.x - 120, a.y + 10);
  pop.addEventListener('click', (e) => e.stopPropagation());
  $('#ap-cancel').addEventListener('click', closeRgPops);
  $('#ap-ok').addEventListener('click', () => {
    const siblings = sc.nodes.filter((n) => n.zone === zoneId);
    const H = Number(sc.viewBox.split(' ')[3]);
    const y = Math.min(Math.max(100, ...siblings.map((n) => n.y)) + 88, H - 120);
    const node = {
      id: `custom-${sceneKey}-${seq}`, custom: true, zone: zoneId,
      label: $('#ap-name').value.trim() || `新增节点-${seq}`,
      ip: $('#ap-ip').value.trim() || autoIp,
      type: $('#ap-type').value, os: '自定义接入镜像', svc: ['agent :6060'],
      x: zone.x + zone.w / 2, y, linkTo: siblings.length ? siblings[0].id : null,
    };
    ctl.added.push(node);
    ctl.addSeq += 1;
    pushRangeLog(sceneKey, `[环境] 新增节点 ${node.label}（${zone.label} · ${node.ip}）已接入拓扑`);
    closeRgPops();
    rebuildRangeTopo(sceneKey);
  });
  setTimeout(() => document.addEventListener('click', closeRgPops, { once: true }), 0);
}
function bindRangeTopoNodes(sceneKey) {
  const sc = rangeSceneNow(sceneKey);
  rg$$('#rg-topo .topo-node').forEach((g) => {
    const nodeId = g.dataset.node;
    if (!sc.nodes.some((x) => x.id === nodeId)) return;
    g.addEventListener('mouseenter', () => {
      clearTimeout(qpHideTimer);
      if (document.getElementById('rg-nodepop')) return;
      showQuickPop(sceneKey, nodeId);
    });
    g.addEventListener('mouseleave', () => {
      qpHideTimer = setTimeout(() => { const p = document.getElementById('rg-quickpop'); if (p) p.remove(); }, 220);
    });
    g.addEventListener('click', (e) => { e.stopPropagation(); openRangeNodePop(sceneKey, nodeId); });
  });
  rg$$('#rg-topo .range-add').forEach((g) => {
    g.addEventListener('click', (e) => { e.stopPropagation(); openAddNodePop(sceneKey, g.dataset.addzone); });
  });
}
function rebuildRangeTopo(sceneKey) {
  const old = rg$('#rg-topo-svg'); if (!old) return;
  old.outerHTML = buildRangeTopo(sceneKey, true);
  bindRangeTopoNodes(sceneKey);
  paintRange(sceneKey);
}
/* 节点右侧抽屉已移除：操作全部进图（openRangeNodePop 锚定浮卡 + showQuickPop 快捷条） */

/* ── 页面 · 靶场控制台（图内直控版：电网 / 核电可切换）───────────── */
function bindRangeHud(sceneKey) {
  const ctl = rangeCtl[sceneKey];
  const bindSlider = (id, apply, fmt, logFmt) => {
    const el = $(id); if (!el) return;
    el.addEventListener('input', () => {
      apply(Number(el.value));
      $(id + '-v').textContent = fmt();
      paintRange(sceneKey);
    });
    el.addEventListener('change', () => pushRangeLog(sceneKey, logFmt()));
  };
  bindSlider('#ep-load', (v) => { ctl.loadPct = v; },
    () => `${ctl.loadPct}%`, () => `[环境] 系统负载调整为 ${ctl.loadPct}%`);
  bindSlider('#ep-lat', (v) => { ctl.latency = v; },
    () => `${ctl.latency}ms`, () => `[环境] 网络延迟注入调整为 ${ctl.latency}ms`);
  bindSlider('#ep-biz', (v) => { ctl.bizLoad = v; },
    () => `${ctl.bizLoad.toFixed(1)}GW`, () => `[环境] 当前负荷调整为 ${ctl.bizLoad.toFixed(1)}GW`);
  bindSlider('#ep-th', (v) => { ctl.alertTh = v; },
    () => `${ctl.alertTh}%`, () => `[环境] 告警阈值调整为 ${ctl.alertTh}%（当前负载${ctl.loadPct >= ctl.alertTh ? '已' : '未'}越限）`);
  $$('[data-speed]').forEach((ch) => ch.addEventListener('click', () => {
    $$('[data-speed]').forEach((x) => x.classList.remove('selected'));
    ch.classList.add('selected');
    ctl.speed = Number(ch.dataset.speed);
    pushRangeLog(sceneKey, `[环境] 攻击速度倍率调整为 ${ctl.speed}x`);
    paintRange(sceneKey);
  }));
  const stepAgent = (d) => {
    ctl.agentN = Math.max(1, Math.min(6, ctl.agentN + d));
    $('#ep-agents-v').textContent = ctl.agentN;
    pushRangeLog(sceneKey, `[环境] 并发攻击智能体调整为 ${ctl.agentN} 个`);
    paintRange(sceneKey);
  };
  $('#ep-ag-minus').addEventListener('click', () => stepAgent(-1));
  $('#ep-ag-plus').addEventListener('click', () => stepAgent(1));
  $('#rg-pause').addEventListener('click', () => togglePauseRange(sceneKey));
  $('#rg-reset').addEventListener('click', () => resetRange(sceneKey));
}
function togglePauseRange(sceneKey) {
  const ctl = rangeCtl[sceneKey], live = rangeLive[sceneKey];
  ctl.paused = !ctl.paused;
  if (ctl.paused) {
    ctl.pauseStart = Date.now();
    pushRangeLog(sceneKey, '[控制] 演练已暂停 · 攻击动画 / 日志 / 参数冻结');
  } else {
    live.t0 += Date.now() - ctl.pauseStart;
    pushRangeLog(sceneKey, '[控制] 演练继续');
  }
  const btn = $('#rg-pause');
  if (btn) btn.textContent = ctl.paused ? '继续演练' : '暂停演练';
  paintRange(sceneKey);
}
function resetRange(sceneKey) {
  rangeCtl[sceneKey] = freshCtl(sceneKey);
  rangeLive[sceneKey] = { step: 0, tick: 0, acc: 0, logN: 0, t0: Date.now(),
    lines: [{ t: fmtClock(new Date()), text: '[控制] 演练环境已重置 · 恢复初始拓扑与参数' }] };
  renderRange();
}
function renderRange() {
  clearTimers(); closeRgPops();
  const sceneKey = rangeState.scene;
  $('#view').innerHTML = `
  <div class="page range-console">
    <div style="margin-bottom:16px"><a href="#/tasks" class="small" style="color:var(--primary);text-decoration:none">← 返回任务中心</a></div>
    <div class="page-head-row">
      <div>
        <h2 class="page-title">靶场控制台</h2>
        <p class="page-desc">图内直控攻防靶场 · 节点悬停快捷操作 / 点击节点配置 · 画布底部 HUD 环境控制 · 分区内 ＋ 添加节点</p>
      </div>
      <div class="tabs sub-tabs" style="border-bottom:none;margin:0;gap:20px">
        ${Object.values(RANGE_SCENES).map((s) =>
          `<button class="tab-btn${sceneKey === s.key ? ' active' : ''}" data-range-scene="${s.key}">${s.name}</button>`).join('')}
      </div>
    </div>
    ${rangeSectionHtml(sceneKey, 'console')}
  </div>`;
  $$('[data-range-scene]').forEach((b) => b.addEventListener('click', () => {
    rangeState.scene = b.dataset.rangeScene;
    renderRange();
  }));
  bindRangeTopoNodes(sceneKey);
  bindRangeHud(sceneKey);
  paintRange(sceneKey);
  every(tickRange, 1000);
}

/* ════════════════════════════════════════════════════════════════
 * 靶场子 tab · 实战演练场（研发中占位页）
 * ════════════════════════════════════════════════════════════════ */
function renderDrill() {
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">实战演练场任务 <span class="badge badge-gold" style="vertical-align:middle">研发中</span></h2>
        <p class="page-desc">多人协同实战攻防演练 · 红蓝对抗编排与实时裁决（能力规划中，暂未开放）</p>
      </div>
    </div>
    <div class="empty-state">
      <span class="serif">实战演练场 · 研发中</span>
      <p>该模块正在建设中，将支持多队伍红蓝对抗、演练编排、实时裁决与复盘回放。<br>当前版本请通过「任务中心」发起单人评测 / 攻防任务，或在「靶场控制台」观察常驻攻防实例。</p>
      <a class="btn btn-outline" href="#/tasks">返回任务中心</a>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════
 * 页面二 · 模板市场（新建任务入口）
 * ════════════════════════════════════════════════════════════════ */
/* ══ 新建任务 · 分步引导（任务类型 → 评测对象 → 过滤模板市场）══════ */
const mpState = { step: 1, cat: null, objectKind: 'agent', objectId: '', mode: 'test', agentId: '', prefillCfg: null };

function openMarketplace(prefillCfg) {
  if (prefillCfg) {
    mpState.step = 3;
    mpState.cat = prefillCfg.category;
    mpState.objectKind = prefillCfg.objectKind || 'agent';
    mpState.objectId = prefillCfg.objectId || '';
    mpState.mode = prefillCfg.mode || 'test';
    mpState.agentId = prefillCfg.agentId || '';
    mpState.prefillCfg = { ...prefillCfg };
  } else {
    mpState.step = 1; mpState.cat = null; mpState.objectKind = 'agent';
    mpState.objectId = ''; mpState.mode = 'test'; mpState.agentId = ''; mpState.prefillCfg = null;
  }
  if (parseHash().route === 'marketplace') renderMarketplace();
  else location.hash = '#/marketplace';
}
/* 从指定任务类型进入新建流程（跳过第 1 步） */
function openMarketplaceCat(cat) {
  openMarketplace(null);
  mpState.cat = cat; mpState.step = 2;
  renderMarketplace();
}
/* 从演示 case「从此模板新建任务」进入：直达向导最后一步（选择模板 / 模板配置） */
function openTemplateStep(cfg) {
  openMarketplace(null);
  mpState.cat = cfg.cat;
  mpState.objectKind = cfg.objectKind || 'agent';
  mpState.objectId = cfg.objectId || '';
  mpState.mode = cfg.mode || 'test';
  mpState.agentId = cfg.agentId || '';
  mpState.step = 3;
  renderMarketplace();
}
/* 训练演示 case 直达训练向导最后一步（训练参数 / 摘要确认） */
function openTrainTemplateStep() {
  tnState.step = 3;
  tnState.objectKind = tnState.objectKind || 'agent';
  if (!(tnState.objectKind === 'llm' ? findLLM(tnState.objectId) : findAgent(tnState.objectId))) {
    tnState.objectId = tnState.objectKind === 'llm' ? LLMS[0].id : AGENTS[0].id;
  }
  if (!tnState.goal) tnState.goal = TRAIN_GOALS[0].id;
  if (parseHash().route === 'train-new') renderTrainNew();
  else location.hash = '#/train-new';
}

/* ════════════════════════════════════════════════════════════════
 * 新建训练任务 · 分步引导（目标对象 → 训练目标 → 训练参数）
 * 模拟主流训练平台的建训参数，创建后跳转任务中心
 * ════════════════════════════════════════════════════════════════ */
const tnState = { step: 1, objectKind: 'agent', objectId: '', goal: null, epochs: 12, batch: '32', lr: '5e-6', scale: '5K 条', conc: 64 };

function renderTrainNew() {
  const stepItem = (n, label) => {
    const cls = tnState.step > n ? 'done' : tnState.step === n ? 'current' : 'todo';
    return `<div class="step-item ${cls}"><span class="step-no">${tnState.step > n ? '✓' : n}</span>${label}</div>`;
  };
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">新建训练任务</h2>
        <p class="page-desc">选择目标对象与训练目标，配置训练参数后立即开训</p>
      </div>
      <a class="btn btn-outline" href="#/training">返回训练场</a>
    </div>
    <div class="steps-bar">
      ${stepItem(1, '目标对象')}<span class="step-sep">→</span>
      ${stepItem(2, '训练目标')}<span class="step-sep">→</span>
      ${stepItem(3, '训练参数')}
    </div>
    <div id="tn-body"></div>
  </div>`;
  if (tnState.step === 1) renderTnStep1();
  else if (tnState.step === 2) renderTnStep2();
  else renderTnStep3();
}
function tnObject() { return findObject(tnState.objectKind, tnState.objectId); }

/* 第 1 步 · 目标对象（智能体 / 大模型） */
function renderTnStep1() {
  const pool = tnState.objectKind === 'llm' ? LLMS : AGENTS;
  if (!pool.some((o) => o.id === tnState.objectId)) tnState.objectId = pool[0].id;
  $('#tn-body').innerHTML = `
  <div class="card mp-panel">
    <div class="wz-field">
      <span class="field-label">对象类型</span>
      ${mpChips('tn-kind', [{ v: 'agent', t: '智能体' }, { v: 'llm', t: '大模型' }], tnState.objectKind)}
    </div>
    <div class="wz-field">
      <span class="field-label">目标对象</span>
      <select class="select" id="tn-obj">${pool.map((o) => `<option value="${o.id}" ${tnState.objectId === o.id ? 'selected' : ''}>${o.name} · ${o.tag}</option>`).join('')}</select>
    </div>
    <p class="mini-note">训练将基于目标对象当前版本生成检查点，训练产出沉淀至资产中心。</p>
    <div class="mp-actions">
      <span></span>
      <button class="btn btn-primary" id="tn-next">下一步：选择训练目标</button>
    </div>
  </div>`;
  mpBindChips('tn-kind', (v) => { tnState.objectKind = v; tnState.objectId = ''; renderTnStep1(); });
  $('#tn-obj').addEventListener('change', (e) => { tnState.objectId = e.target.value; });
  $('#tn-next').addEventListener('click', () => { tnState.step = 2; renderTrainNew(); });
}

/* 第 2 步 · 训练目标 */
function renderTnStep2() {
  $('#tn-body').innerHTML = `
  <div class="mode-cards mp-type-cards">
    ${TRAIN_GOALS.map((g) => `
    <div class="mode-card" data-goal="${g.id}">
      <h4>${g.name}</h4>
      <p>${g.desc}</p>
      <div class="intro-tags" style="margin-top:10px">${g.tags.map((t) => `<span class="badge">${t}</span>`).join('')}</div>
    </div>`).join('')}
  </div>
  <div class="mp-actions" style="margin-top:16px">
    <button class="btn btn-ghost" id="tn-back">← 上一步</button>
  </div>`;
  $$('#tn-body [data-goal]').forEach((c) => c.addEventListener('click', () => {
    tnState.goal = c.dataset.goal; tnState.step = 3; renderTrainNew();
  }));
  $('#tn-back').addEventListener('click', () => { tnState.step = 1; renderTrainNew(); });
}

/* 第 3 步 · 训练参数 + 摘要确认 */
function renderTnStep3() {
  const goal = TRAIN_GOALS.find((g) => g.id === tnState.goal) || TRAIN_GOALS[0];
  $('#tn-body').innerHTML = `
  <div class="card mp-panel">
    <div class="wz-field">
      <span class="field-label">训练轮次（Epochs）</span>
      <div class="hud-row" style="display:flex;align-items:center;gap:12px">
        <input type="range" id="tn-epochs" min="2" max="24" step="1" value="${tnState.epochs}" style="flex:1">
        <span class="hud-v mono" id="tn-epochs-v">${tnState.epochs}</span>
      </div>
    </div>
    <div class="wz-field">
      <span class="field-label">批大小（Batch Size）</span>
      ${mpChips('tn-batch', ['16', '32', '64', '128'].map((v) => ({ v, t: v })), tnState.batch)}
    </div>
    <div class="wz-field">
      <span class="field-label">学习率（Learning Rate）</span>
      ${mpChips('tn-lr', ['1e-4', '5e-5', '1e-5', '5e-6'].map((v) => ({ v, t: v })), tnState.lr)}
    </div>
    <div class="wz-field">
      <span class="field-label">训练数据规模</span>
      ${mpChips('tn-scale', ['1K 条', '5K 条', '2W 条', '全量资产'].map((v) => ({ v, t: v })), tnState.scale)}
    </div>
    <div class="wz-field">
      <span class="field-label">并发容器</span>
      <div class="hud-row" style="display:flex;align-items:center;gap:12px">
        <input type="range" id="tn-conc" min="8" max="256" step="8" value="${tnState.conc}" style="flex:1">
        <span class="hud-v mono" id="tn-conc-v">${tnState.conc}</span>
      </div>
    </div>
    <div class="tpl-params" style="margin-bottom:14px">
      <span class="small muted">训练摘要</span>
      <span>目标对象：<b>${esc(tnObject().name)}</b>（${tnState.objectKind === 'llm' ? '大模型' : '智能体'}）</span>
      <span>训练目标：<b>${goal.name}</b></span>
      <span>参数：<b class="mono">${tnState.epochs} epochs · batch ${tnState.batch} · lr ${tnState.lr} · ${tnState.scale} · ${tnState.conc} 并发</b></span>
    </div>
    <div class="mp-actions">
      <button class="btn btn-ghost" id="tn-back">← 上一步</button>
      <button class="btn btn-primary" id="tn-launch">创建并启动训练</button>
    </div>
  </div>`;
  const syncSummary = () => renderTnStep3();
  $('#tn-epochs').addEventListener('input', (e) => { tnState.epochs = Number(e.target.value); $('#tn-epochs-v').textContent = tnState.epochs; });
  $('#tn-conc').addEventListener('input', (e) => { tnState.conc = Number(e.target.value); $('#tn-conc-v').textContent = tnState.conc; });
  mpBindChips('tn-batch', (v) => { tnState.batch = v; syncSummary(); });
  mpBindChips('tn-lr', (v) => { tnState.lr = v; syncSummary(); });
  mpBindChips('tn-scale', (v) => { tnState.scale = v; syncSummary(); });
  $('#tn-back').addEventListener('click', () => { tnState.step = 2; renderTrainNew(); });
  $('#tn-launch').addEventListener('click', () => startRun({
    category: 'training',
    objectKind: tnState.objectKind, objectId: tnState.objectId,
    goal: tnState.goal || TRAIN_GOALS[0].id,
    epochs: tnState.epochs, batch: tnState.batch, lr: tnState.lr, scale: tnState.scale, concurrency: tnState.conc,
  }));
}

/* ════════════════════════════════════════════════════════════════
 * 训练任务控制台 · 训练曲线 / 实时指标 / 训练日志（模拟）
 * ════════════════════════════════════════════════════════════════ */
const trc = { tick: 0, loss: [], reward: [], lines: [], paused: false };
function renderTrainingConsole() {
  let cfg = JSON.parse(sessionStorage.getItem('aisr-runCfg') || 'null');
  const isUserRun = !!(cfg && cfg.category === 'training' && sessionStorage.getItem('aisr-running') === '1');
  /* 无用户任务时兜底演示实例：从 landing 演示窗跳入也能看到完整控制台 */
  if (!isUserRun) {
    cfg = { category: 'training', objectKind: 'agent', objectId: 'mythos-attack-v2', goal: 'align', epochs: 12, batch: '32', lr: '5e-6', scale: '5K 条', conc: 64 };
  }
  const meta = resolveRunMeta(cfg);
  const goal = TRAIN_GOALS.find((g) => g.id === cfg.goal) || TRAIN_GOALS[0];
  trc.tick = 0; trc.loss = []; trc.reward = []; trc.lines = []; trc.paused = false;
  const timer = { t0: isUserRun ? parseInt(sessionStorage.getItem('aisr-runStart') || String(Date.now()), 10) : Date.now() };
  $('#view').innerHTML = `
  <div class="page">
    <div style="margin-bottom:16px"><a href="#/tasks" class="small" style="color:var(--primary);text-decoration:none">← 返回任务中心</a></div>
    <div class="page-head-row">
      <div>
        <h2 class="page-title">训练控制台 ${isUserRun ? '' : '<span class="badge" style="vertical-align:middle">演示实例</span>'}</h2>
        <p class="page-desc">${esc(meta.title)} · ${goal.name} · <span class="mono">${cfg.epochs} epochs · batch ${cfg.batch} · lr ${cfg.lr} · ${cfg.scale}</span></p>
      </div>
      <div style="display:flex;gap:10px">
        <span class="env-status"><span class="dot dot-ok"></span>训练进行中</span>
        <button class="btn btn-outline btn-sm" id="trc-pause">暂停训练</button>
        <button class="btn btn-outline btn-sm" id="trc-reset">重置训练</button>
        <button class="btn btn-ghost btn-sm" id="trc-stop">结束任务</button>
      </div>
    </div>
    <div class="tc-grid">
      <div class="card tc-card">
        <h4>训练曲线</h4>
        <svg class="tc-chart" id="trc-chart" viewBox="0 0 100 50" preserveAspectRatio="none">
          <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="var(--border)" stroke-width="0.2"/>
          <line x1="0" y1="25" x2="100" y2="25" stroke="var(--border)" stroke-width="0.2"/>
          <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="var(--border)" stroke-width="0.2"/>
          <polyline id="trc-loss" fill="none" stroke="var(--destructive)" stroke-width="0.7" points=""/>
          <polyline id="trc-reward" fill="none" stroke="var(--chart-3)" stroke-width="0.7" points=""/>
        </svg>
        <div class="tc-legend">
          <span><i style="background:var(--destructive)"></i>loss</span>
          <span><i style="background:var(--chart-3)"></i>reward</span>
        </div>
      </div>
      <div class="card tc-card">
        <h4>实时指标</h4>
        <div class="tc-metrics">
          <div class="tc-metric"><span class="k">Epoch</span><span class="v" id="trc-epoch">0/${cfg.epochs}</span></div>
          <div class="tc-metric"><span class="k">loss</span><span class="v" id="trc-loss-v">—</span></div>
          <div class="tc-metric"><span class="k">reward</span><span class="v" id="trc-reward-v">—</span></div>
          <div class="tc-metric"><span class="k">吞吐</span><span class="v" id="trc-qps">—</span></div>
          <div class="tc-metric"><span class="k">GPU 利用率</span><span class="v" id="trc-gpu">—</span></div>
          <div class="tc-metric"><span class="k">已用时</span><span class="v" id="trc-elapsed">00:00</span></div>
        </div>
      </div>
    </div>
    <div class="card tc-card">
      <h4>训练日志</h4>
      <div class="tc-log" id="trc-log"></div>
    </div>
  </div>`;
  every(() => tickTrainingConsole(cfg, timer.t0), 1000);
  $('#trc-pause').addEventListener('click', () => {
    trc.paused = !trc.paused;
    $('#trc-pause').textContent = trc.paused ? '继续训练' : '暂停训练';
  });
  $('#trc-reset').addEventListener('click', () => {
    trc.tick = 0; trc.loss = []; trc.reward = []; trc.paused = false;
    timer.t0 = Date.now();
    sessionStorage.setItem('aisr-runStart', String(timer.t0));
    trc.lines = [`[${fmtClock(new Date())}] [控制] 训练已重置 · 指标、曲线与日志清零，重新开始`];
    $('#trc-pause').textContent = '暂停训练';
  });
  $('#trc-stop').addEventListener('click', () => {
    sessionStorage.removeItem('aisr-running');
    sessionStorage.removeItem('aisr-runCfg');
    sessionStorage.removeItem('aisr-runStart');
    showToast('训练任务已结束 · 产出检查点已归档至资产中心（演示）');
    location.hash = '#/tasks';
  });
}
function tickTrainingConsole(cfg, t0) {
  if (trc.paused || !$('#trc-chart')) return;
  trc.tick += 1;
  const total = cfg.epochs || 12;
  const ep = Math.min(total, Math.floor(trc.tick / 4));
  const loss = 1.8 * Math.exp(-trc.tick / (total * 2)) + 0.12 + Math.sin(trc.tick * 0.9) * 0.03;
  const reward = Math.min(0.92, 0.18 + (trc.tick / (total * 4)) * 0.68 + Math.sin(trc.tick * 0.5) * 0.02);
  trc.loss.push(loss); trc.reward.push(reward);
  if (trc.loss.length > 60) { trc.loss.shift(); trc.reward.shift(); }
  const pts = (arr, min, max) => arr.map((v, i) =>
    `${(i / Math.max(1, arr.length - 1) * 100).toFixed(1)},${(46 - ((v - min) / (max - min)) * 40).toFixed(1)}`).join(' ');
  $('#trc-loss').setAttribute('points', pts(trc.loss, 0.1, 2.0));
  $('#trc-reward').setAttribute('points', pts(trc.reward, 0.1, 1.0));
  $('#trc-epoch').textContent = `${ep}/${total}`;
  $('#trc-loss-v').textContent = loss.toFixed(3);
  $('#trc-reward-v').textContent = reward.toFixed(2);
  $('#trc-qps').textContent = `${118 + Math.round(Math.sin(trc.tick * 0.7) * 12)} samples/s`;
  $('#trc-gpu').textContent = `${82 + Math.round(Math.sin(trc.tick * 0.4) * 6)}%`;
  $('#trc-elapsed').textContent = fmtElapsed(Date.now() - t0);
  trc.lines.push(`[${fmtClock(new Date())}] epoch ${ep}/${total} · loss ${loss.toFixed(3)} · reward ${reward.toFixed(2)} · grad_norm ${(0.8 + Math.sin(trc.tick) * 0.2).toFixed(2)} · ckpt 自动保存`);
  if (trc.lines.length > 40) trc.lines = trc.lines.slice(-40);
  $('#trc-log').innerHTML = trc.lines.slice(-5).map((l) => `<div><span class="lg-t">${l.slice(0, 11)}</span>${esc(l.slice(11))}</div>`).join('');
}

const mpChips = (id, options, cur) => `<div class="radio-row" id="${id}">${options.map((o) =>
  `<div class="radio-chip ${cur === o.v ? 'selected' : ''}" data-v="${o.v}">${o.t}</div>`).join('')}</div>`;
const mpBindChips = (id, cb) => $$('#' + id + ' .radio-chip').forEach((c) => c.addEventListener('click', () => {
  $$('#' + id + ' .radio-chip').forEach((x) => x.classList.remove('selected'));
  c.classList.add('selected'); cb(c.dataset.v);
}));

function renderMarketplace() {
  const stepItem = (n, label) => {
    const cls = mpState.step > n ? 'done' : mpState.step === n ? 'current' : 'todo';
    return `<div class="step-item ${cls}"><span class="step-no">${mpState.step > n ? '✓' : n}</span>${label}</div>`;
  };
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">新建任务</h2>
        <p class="page-desc">任务类型决定评测对象，对象决定适用模板</p>
      </div>
      <a class="btn btn-outline" href="#/tasks">返回任务中心</a>
    </div>
    <div class="steps-bar">
      ${stepItem(1, '任务类型')}<span class="step-sep">→</span>
      ${stepItem(2, '评测对象')}<span class="step-sep">→</span>
      ${stepItem(3, '选择模板')}
    </div>
    <div id="mp-body"></div>
  </div>`;
  if (mpState.step === 1) renderMpStep1();
  else if (mpState.step === 2) renderMpStep2();
  else renderMpStep3();
}

/* 第 1 步 · 选任务类型 */
function renderMpStep1() {
  $('#mp-body').innerHTML = `
  <div class="mode-cards mp-type-cards">
    <div class="mode-card" data-cat="eval">
      <h4>评测任务</h4>
      <p>对智能体或大模型逐项执行风险点检测（越权调用 / 注入抗性 / 数据泄露等），产出风险点评测报告。</p>
    </div>
    <div class="mode-card" data-cat="redblue">
      <h4>靶场攻防测试</h4>
      <p>以红队视角渗透高仿真网络环境（电网调度 / 核电指挥），产出轨迹数据与可视化攻防报告。</p>
    </div>
  </div>`;
  $$('#mp-body [data-cat]').forEach((c) => c.addEventListener('click', () => {
    mpState.cat = c.dataset.cat; mpState.step = 2; renderMarketplace();
  }));
}

/* 第 2 步 · 定评测对象（随第 1 步联动） */
function renderMpStep2() {
  const isEval = mpState.cat === 'eval';
  const body = $('#mp-body');
  if (isEval) {
    const pool = mpState.objectKind === 'llm' ? LLMS : AGENTS;
    if (!pool.some((o) => o.id === mpState.objectId)) mpState.objectId = pool[0].id;
    body.innerHTML = `
    <div class="card mp-panel">
      <div class="wz-field">
        <span class="field-label">评测对象类型</span>
        ${mpChips('mp-kind', [{ v: 'agent', t: '智能体' }, { v: 'llm', t: '大模型' }], mpState.objectKind)}
      </div>
      <div class="wz-field">
        <span class="field-label">具体对象</span>
        <select class="select" id="mp-obj">${pool.map((o) => `<option value="${o.id}" ${mpState.objectId === o.id ? 'selected' : ''}>${o.name} · ${o.tag}</option>`).join('')}</select>
      </div>
      <p class="mini-note">任务类型决定评测对象，对象决定适用模板 —— 下一步将按对象类型过滤模板市场。</p>
      <div class="mp-actions">
        <button class="btn btn-ghost" id="mp-back">← 上一步</button>
        <button class="btn btn-primary" id="mp-next">下一步：查看适用模板</button>
      </div>
    </div>`;
    mpBindChips('mp-kind', (v) => { mpState.objectKind = v; mpState.objectId = ''; renderMpStep2(); });
    $('#mp-obj').addEventListener('change', (e) => { mpState.objectId = e.target.value; });
  } else {
    if (!AGENTS.some((a) => a.id === mpState.agentId)) mpState.agentId = AGENTS[0].id;
    body.innerHTML = `
    <div class="card mp-panel">
      <div class="wz-field">
        <span class="field-label">红队执行体</span>
        ${mpChips('mp-mode', [{ v: 'test', t: '人工执行' }, { v: 'battle', t: '智能体自主' }], mpState.mode)}
      </div>
      <div class="wz-field" id="mp-agent-row" style="display:${mpState.mode === 'battle' ? '' : 'none'}">
        <span class="field-label">执行智能体</span>
        <select class="select" id="mp-agent">${AGENTS.map((a) => `<option value="${a.id}" ${mpState.agentId === a.id ? 'selected' : ''}>${a.name} · ${a.tag}</option>`).join('')}</select>
      </div>
      <p class="mini-note">任务类型决定评测对象，对象决定适用模板 —— 人工执行对应人工模板，智能体自主对应智能体模板。</p>
      <div class="mp-actions">
        <button class="btn btn-ghost" id="mp-back">← 上一步</button>
        <button class="btn btn-primary" id="mp-next">下一步：查看适用模板</button>
      </div>
    </div>`;
    mpBindChips('mp-mode', (v) => { mpState.mode = v; renderMpStep2(); });
    const ag = $('#mp-agent');
    if (ag) ag.addEventListener('change', (e) => { mpState.agentId = e.target.value; });
  }
  $('#mp-back').addEventListener('click', () => { mpState.step = 1; renderMarketplace(); });
  $('#mp-next').addEventListener('click', () => { mpState.step = 3; renderMarketplace(); });
}

/* 第 3 步 · 过滤后的适用模板 + 靶场环境预览 */
function filteredTemplates() {
  if (mpState.cat === 'eval') return TEMPLATES.filter((t) => t.cat === 'eval' && t.cfg.objectKind === mpState.objectKind);
  return TEMPLATES.filter((t) => t.cat === 'redblue' && t.cfg.mode === mpState.mode);
}
function renderMpStep3() {
  const list = filteredTemplates();
  const isRB = mpState.cat === 'redblue';
  const prefill = mpState.prefillCfg ? `
    <div class="card tpl-card selected" style="margin-bottom:16px">
      <div class="tpl-head"><span class="tpl-icon serif">填</span><span class="badge badge-gold">预填配置</span></div>
      <div class="env-title">沿用历史任务配置</div>
      <div class="env-desc">已按历史任务载入全部参数，进入配置面板后仍可修改。</div>
      <div class="env-actions" style="margin-top:auto">
        <button class="btn btn-outline btn-sm" id="mp-use-prefill">使用预填配置</button>
      </div>
    </div>` : '';
  $('#mp-body').innerHTML = `
    ${prefill}
    <div class="tpl-grid">
      ${list.map((t, i) => `
        <div class="card tpl-card ${isRB ? 'clickable' : ''} ${isRB && i === 0 ? 'selected' : ''}" data-tplcard="${t.id}">
          <div class="tpl-head">
            <span class="tpl-icon serif">${t.icon}</span>
            <span class="badge ${t.cat === 'redblue' ? 'badge-primary' : ''}">${t.catLabel}</span>
          </div>
          <div class="env-title">${t.name}</div>
          <div class="env-desc">${t.desc}</div>
          <div class="tpl-params">${t.params.map((p) => `<span class="mini-note mono">${p}</span>`).join('')}</div>
          <div class="env-actions" style="margin-top:auto">
            <button class="btn btn-outline btn-sm" data-tpl="${t.id}">使用模板</button>
          </div>
        </div>`).join('')}
    </div>
    ${isRB ? `<div class="card tpl-preview" id="tpl-preview"></div>` : ''}
    <div style="margin-top:24px"><button class="btn btn-ghost" id="mp-back2">← 上一步</button></div>`;
  const useTemplate = (id) => {
    const t = TEMPLATES.find((x) => x.id === id);
    const cfg = { ...t.cfg };
    if (t.cat === 'eval') { cfg.objectKind = mpState.objectKind; cfg.objectId = mpState.objectId || t.cfg.objectId; }
    if (t.cat === 'redblue' && t.cfg.mode === 'battle') cfg.agentId = mpState.agentId || t.cfg.agentId;
    openWizard(t.cat, cfg);
  };
  $$('[data-tpl]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); useTemplate(b.dataset.tpl); }));
  const pu = $('#mp-use-prefill');
  if (pu) pu.addEventListener('click', () => openWizard(mpState.prefillCfg.category, { ...mpState.prefillCfg }));
  if (isRB) {
    const showPreview = (id) => {
      const t = TEMPLATES.find((x) => x.id === id);
      $$('#mp-body [data-tplcard]').forEach((c) => c.classList.toggle('selected', c.dataset.tplcard === id));
      $('#tpl-preview').innerHTML = `
        <div class="card-sub" style="margin-bottom:10px">虚拟环境预览 · ${t.name}</div>
        ${envPreviewHtml(t.cfg.simEnv)}`;
      /* 预览拓扑可操作：与靶场控制台一致的交互（作用域限定在预览卡片内） */
      rgRoot = $('#tpl-preview');
      bindRangeTopoNodes(t.cfg.simEnv);
    };
    $$('#mp-body [data-tplcard]').forEach((c) => c.addEventListener('click', () => showPreview(c.dataset.tplcard)));
    showPreview(list[0].id);
  }
  $('#mp-back2').addEventListener('click', () => { mpState.step = 2; renderMarketplace(); });
}

/* 靶场虚拟环境 / 网络拓扑预览：与靶场控制台一致的可操作拓扑
 *（悬停节点快捷上下线 / 防护策略 · 点击节点查看与编辑配置 · 分区 ＋ 添加节点） */
function envPreviewHtml(skinKey) {
  const sc = RANGE_SCENES[skinKey] || RANGE_SCENES.grid;
  const skin = TOPO_SKINS[skinKey] || TOPO_SKINS.grid;
  return `
    <div class="env-preview">
      <div class="env-preview-topo">
        <div class="rh-topo range-topo rg-canvas wz-topo-canvas" id="rg-topo">${buildRangeTopo(sc.key, true)}</div>
        <div class="wz-topo-hint small muted">拓扑操作与靶场控制台一致：悬停节点快捷上下线 / 防护策略 · 点击节点查看与编辑配置 · 分区内 ＋ 添加节点</div>
      </div>
      <div class="env-preview-info">
        <div class="kv-row"><span class="k">仿真环境</span><span class="v">${skin.name}</span></div>
        <div class="kv-row"><span class="k">网段</span><span class="v">${skin.subnet}</span></div>
        <div class="kv-row"><span class="k">仿真设备</span><span class="v">${sc.nodes.length} 类节点</span></div>
        <div class="env-preview-devices">${sc.nodes.map((n) => `<span class="chip">${n.label}</span>`).join('')}</div>
        <div class="kv-row"><span class="k">环境特有任务</span><span class="v">${ENV_TASKS[skinKey].join(' / ')}</span></div>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════════
 * 新建任务 · 单页配置面板（模板预填 / 历史复制共用）
 * ════════════════════════════════════════════════════════════════ */
/* 配置缺省值补全（模板 / 历史复制共用） */
function wizardDefaults(category, p) {
  const s = { category, ...p };
  if (category === 'eval') {
    s.objectKind = s.objectKind || 'agent';
    s.objectId = s.objectId || (s.objectKind === 'llm' ? LLMS[0].id : AGENTS[0].id);
    s.banks = s.banks && s.banks.length ? s.banks : [...QUESTION_BANKS];
    s.dynamicBank = s.dynamicBank !== undefined ? s.dynamicBank : true;
    s.methods = s.methods && s.methods.length ? s.methods : ['直接注入', '多轮诱导'];
    s.rounds = s.rounds || 3;
    s.scene = s.scene || EVAL_SCENES[0];
    s.mode = 'auto';
  } else {
    if (category === 'redblue') {
      s.envId = s.envId || ENVIRONMENTS.find((e) => e.status === 'available').id;
      s.simEnv = s.simEnv || (findEnv(s.envId) || {}).skin || 'grid';
      s.mode = s.mode || 'test';
    } else {
      s.envId = s.envId || AGENTRISK_ENVS[0].id;
      s.simEnv = s.simEnv || (findArEnv(s.envId) || AGENTRISK_ENVS[0]).skin;
      s.mode = 'auto';
      s.dimensions = s.dimensions && s.dimensions.length ? s.dimensions : [...RISK_DIMENSIONS];
    }
    s.agentId = s.agentId || AGENTS[0].id;
    s.envTask = s.envTask || ENV_TASKS[s.simEnv][0];
    s.network = s.network || NETWORK_ENVS[0];
    s.modules = s.modules && s.modules.length ? s.modules : SIM_MODULES.slice(0, 3);
    s.conditions = s.conditions || { load: 42, temp: 24, concurrency: 300, latency: 20 };
  }
  return s;
}

/* 配置摘要（确认页 + 报告任务信息共用） */
function cfgSummary(cfg) {
  if (cfg.category === 'eval') {
    const obj = findObject(cfg.objectKind, cfg.objectId) || { name: cfg.objectId };
    return [
      ['任务类别', catName('eval')],
      ['评测对象', `${obj.name}（${cfg.objectKind === 'llm' ? '大模型' : '智能体'}）`],
      ['题库选择', (cfg.banks || []).join('、')],
      ['动态题库', cfg.dynamicBank ? '启用（静态题库变异生成新样本）' : '关闭'],
      ['攻击方法', (cfg.methods || []).join('、')],
      ['评测轮次', `${cfg.rounds} 轮`],
      ['评测场景', cfg.scene],
    ];
  }
  const skin = TOPO_SKINS[cfg.simEnv] || TOPO_SKINS.grid;
  const c = cfg.conditions || {};
  const common = [
    ['仿真环境', skin.name],
    ['环境特有任务', cfg.envTask],
    ['网络环境', cfg.network],
    ['模拟系统模块', (cfg.modules || []).join('、')],
    ['条件变量', `负载 ${c.load}% · 温度 ${c.temp}°C · 并发 ${c.concurrency} · 延迟 ${c.latency}ms`],
  ];
  if (cfg.category === 'redblue') {
    const env = findEnv(cfg.envId);
    return [
      ['任务类别', catName('redblue')],
      ['靶场环境', env ? `${env.id} · ${env.title}` : cfg.envId],
      ...common,
      ['红队执行体', cfg.mode === 'battle' ? `智能体自主（${(findAgent(cfg.agentId) || {}).name || ''}）` : '人工执行'],
    ];
  }
  return [
    ['任务类别', catName('agentrisk')],
    ...common,
    ['被测智能体', (findAgent(cfg.agentId) || {}).name || cfg.agentId],
    ['风险评测维度', (cfg.dimensions || []).join('、')],
  ];
}

function openWizard(category, prefill) {
  const st = wizardDefaults(category, prefill || {});
  const COND_UNITS = { load: '%', temp: '°C', concurrency: '', latency: 'ms' };

  openModal(`
    <div class="modal-title serif">启动任务</div>
    <div class="modal-sub">${catName(category)} · 确认配置后开始运行</div>
    <div class="modal-body"><div id="wz-body"></div></div>
    <div class="modal-foot">
      <button class="btn btn-secondary" id="wz-cancel">取消</button>
      <button class="btn btn-primary" id="wz-start">确认并开始</button>
    </div>`, true);

  /* 小控件工厂 */
  const field = (inner) => `<div class="wz-field">${inner}</div>`;
  const chips = (id, options, cur) => `<div class="radio-row" id="${id}">${options.map((o) =>
    `<div class="radio-chip ${cur === o.v ? 'selected' : ''}" data-v="${o.v}">${o.t}</div>`).join('')}</div>`;
  const bindChips = (id, cb) => $$('#' + id + ' .radio-chip').forEach((c) => c.addEventListener('click', () => {
    $$('#' + id + ' .radio-chip').forEach((x) => x.classList.remove('selected'));
    c.classList.add('selected'); cb(c.dataset.v);
  }));
  const checks = (id, options, cur) => `<div class="check-row" id="${id}">${options.map((o) =>
    `<label class="check-item"><input type="checkbox" value="${o}" ${cur.includes(o) ? 'checked' : ''}>${o}</label>`).join('')}</div>`;
  const bindChecks = (id, cb) => $$('#' + id + ' input').forEach((c) => c.addEventListener('change', () =>
    cb($$('#' + id + ' input:checked').map((x) => x.value))));
  const rangeRow = (key, label, min, max) => `
    <div class="range-row">
      <span class="small">${label}</span>
      <input type="range" min="${min}" max="${max}" value="${st.conditions[key]}" data-cond="${key}">
      <span class="mono small" id="cond-${key}">${st.conditions[key]}${COND_UNITS[key]}</span>
    </div>`;

  function renderTpl() {
    const body = $('#wz-body');
    if (category === 'eval') {
      body.innerHTML =
        field(`<span class="field-label">评测对象类型</span>
          ${chips('wz-kind', [{ v: 'agent', t: '智能体' }, { v: 'llm', t: '大模型' }], st.objectKind)}`) +
        field(`<span class="field-label">具体对象</span><select class="select" id="wz-obj"></select>`) +
        field(`<span class="field-label">题库选择（多选）</span>${checks('wz-banks', QUESTION_BANKS, st.banks)}
          <label class="switch-row">
            <span class="switch"><input type="checkbox" id="wz-dyn" ${st.dynamicBank ? 'checked' : ''}><span class="switch-slider"></span></span>
            <span class="small">启用动态题库</span><span class="small muted">基于静态题库动态变异生成新样本</span>
          </label>`) +
        field(`<span class="field-label">攻击方法（多选）</span>${checks('wz-methods', ATTACK_METHODS, st.methods)}`) +
        field(`<span class="field-label">评测轮次（1–10）</span>
          <input type="number" class="input wz-num" id="wz-rounds" min="1" max="10" value="${st.rounds}">`) +
        field(`<span class="field-label">评测场景</span>
          ${chips('wz-scene', EVAL_SCENES.map((s) => ({ v: s, t: s })), st.scene)}`);
      const fillObj = () => {
        const pool = st.objectKind === 'llm' ? LLMS : AGENTS;
        if (!pool.some((o) => o.id === st.objectId)) st.objectId = pool[0].id;
        $('#wz-obj').innerHTML = pool.map((o) => `<option value="${o.id}" ${st.objectId === o.id ? 'selected' : ''}>${o.name} · ${o.tag}</option>`).join('');
      };
      fillObj();
      bindChips('wz-kind', (v) => { st.objectKind = v; st.objectId = (v === 'llm' ? LLMS : AGENTS)[0].id; fillObj(); });
      $('#wz-obj').addEventListener('change', (e) => { st.objectId = e.target.value; });
      bindChecks('wz-banks', (v) => { st.banks = v; });
      bindChecks('wz-methods', (v) => { st.methods = v; });
      $('#wz-dyn').addEventListener('change', (e) => { st.dynamicBank = e.target.checked; });
      $('#wz-rounds').addEventListener('change', (e) => {
        st.rounds = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 3));
        e.target.value = st.rounds;
      });
      bindChips('wz-scene', (v) => { st.scene = v; });
      return;
    }

    /* 靶场两类共用框架 */
    const isRB = category === 'redblue';
    body.innerHTML =
      (isRB ? `<div class="wz-env-preview">${envPreviewHtml(st.simEnv)}</div>` : '') +
      field(`<span class="field-label">仿真环境（决定拓扑皮肤）</span>
        ${chips('wz-simenv', [{ v: 'grid', t: '电网调度中心' }, { v: 'nuclear', t: '核电指挥中心' }], st.simEnv)}`) +
      (isRB ? field(`<span class="field-label">靶场环境（漏洞）</span>
        <select class="select" id="wz-env">${ENVIRONMENTS.filter((e) => e.status === 'available').map((e) => `<option value="${e.id}" ${st.envId === e.id ? 'selected' : ''}>${e.id} · ${e.title}</option>`).join('')}</select>`) : '') +
      field(`<span class="field-label">环境特有任务</span>
        ${chips('wz-envtask', ENV_TASKS[st.simEnv].map((t) => ({ v: t, t })), st.envTask)}`) +
      field(`<span class="field-label">网络环境</span>
        ${chips('wz-net', NETWORK_ENVS.map((t) => ({ v: t, t })), st.network)}`) +
      field(`<span class="field-label">模拟系统模块（多选）</span>${checks('wz-mods', SIM_MODULES, st.modules)}`) +
      field(`<span class="field-label">条件变量</span>
        ${rangeRow('load', '系统负载', 0, 100)}${rangeRow('temp', '环境温度', 0, 45)}${rangeRow('concurrency', '并发请求数', 0, 2000)}${rangeRow('latency', '网络延迟', 0, 800)}`) +
      (isRB
        ? field(`<span class="field-label">红队执行体</span>
            ${chips('wz-mode', [{ v: 'test', t: '人工执行' }, { v: 'battle', t: '智能体自主' }], st.mode)}
            <div id="wz-agent-row" style="display:${st.mode === 'battle' ? '' : 'none'};margin-top:8px">
              <select class="select" id="wz-agent">${AGENTS.map((a) => `<option value="${a.id}" ${st.agentId === a.id ? 'selected' : ''}>${a.name} · ${a.tag}</option>`).join('')}</select></div>`)
        : field(`<span class="field-label">被测智能体</span>
            <select class="select" id="wz-agent">${AGENTS.map((a) => `<option value="${a.id}" ${st.agentId === a.id ? 'selected' : ''}>${a.name} · ${a.tag}</option>`).join('')}</select>`) +
          field(`<span class="field-label">风险评测维度（多选）</span>${checks('wz-dims', RISK_DIMENSIONS, st.dimensions)}`));

    bindChips('wz-simenv', (v) => {
      st.simEnv = v;
      st.envTask = ENV_TASKS[v][0];
      if (!isRB) st.envId = v === 'grid' ? 'env-grid' : 'env-nuclear';
      renderTpl();
    });
    if (isRB) $('#wz-env').addEventListener('change', (e) => { st.envId = e.target.value; });
    bindChips('wz-envtask', (v) => { st.envTask = v; });
    bindChips('wz-net', (v) => { st.network = v; });
    bindChecks('wz-mods', (v) => { st.modules = v; });
    $$('[data-cond]').forEach((r) => r.addEventListener('input', () => {
      st.conditions[r.dataset.cond] = parseInt(r.value, 10);
      $('#cond-' + r.dataset.cond).textContent = r.value + COND_UNITS[r.dataset.cond];
    }));
    if (isRB) {
      bindChips('wz-mode', (v) => { st.mode = v; $('#wz-agent-row').style.display = v === 'battle' ? '' : 'none'; });
      /* 启动弹窗内的拓扑可操作：交互与靶场控制台一致（作用域限定在弹窗内） */
      rgRoot = $('#wz-body');
      bindRangeTopoNodes(st.simEnv);
    } else {
      bindChecks('wz-dims', (v) => { st.dimensions = v; });
    }
    $('#wz-agent').addEventListener('change', (e) => { st.agentId = e.target.value; });
  }

  renderTpl();
  $('#wz-cancel').addEventListener('click', closeModal);
  $('#wz-start').addEventListener('click', () => startRun({ ...st }));
}

/* ════════════════════════════════════════════════════════════════
 * 运行时状态构建（三类任务统一）
 * ════════════════════════════════════════════════════════════════ */
let run = null;

function resolveRunMeta(cfg) {
  const meta = { title: '', envLabel: '', objectLabel: '', agentName: '', benchmarkName: '', skin: null, envId: '' };
  if (cfg.category === 'eval') {
    const obj = findObject(cfg.objectKind, cfg.objectId);
    meta.objectLabel = `${obj.name}（${cfg.objectKind === 'llm' ? '大模型' : '智能体'}）`;
    meta.benchmarkName = (cfg.banks || []).join('、');
    meta.title = `${obj.name} 风险点评测`;
  } else if (cfg.category === 'redblue') {
    const env = findEnv(cfg.envId) || ENVIRONMENTS[0];
    meta.envId = env.id;
    meta.skin = TOPO_SKINS[cfg.simEnv] || TOPO_SKINS[env.skin];
    meta.envLabel = `${env.id} · ${env.title}`;
    meta.agentName = cfg.mode === 'battle' ? (findAgent(cfg.agentId) || AGENTS[0]).name : '';
    meta.title = `${env.id} 红蓝攻防`;
  } else if (cfg.category === 'training') {
    const obj = findObject(cfg.objectKind || 'agent', cfg.objectId);
    const goal = (TRAIN_GOALS.find((g) => g.id === cfg.goal) || TRAIN_GOALS[0]).name;
    meta.objectLabel = `${obj.name}（${cfg.objectKind === 'llm' ? '大模型' : '智能体'}）`;
    meta.title = `${obj.name} · ${goal}`;
  } else {
    const env = findArEnv(cfg.envId) || AGENTRISK_ENVS[0];
    meta.skin = TOPO_SKINS[cfg.simEnv] || TOPO_SKINS[env.skin];
    meta.envLabel = env.name;
    meta.agentName = (findAgent(cfg.agentId) || AGENTS[0]).name;
    meta.title = `${env.name} · ${meta.agentName} 行为风险评测`;
  }
  return meta;
}

function startRun(cfg) {
  sessionStorage.setItem('aisr-runCfg', JSON.stringify(cfg));
  sessionStorage.setItem('aisr-running', '1');
  sessionStorage.setItem('aisr-runStart', String(Date.now()));
  /* 创建完任务统一跳转任务中心，运行中小窗立即可见 */
  location.hash = '#/tasks';
}

/* 文本占位符填充（按皮肤 targets + CVE）*/
function fill(tpl) {
  if (!tpl) return tpl;
  let t = tpl;
  if (run && run.skin) Object.entries(run.skin.targets).forEach(([k, v]) => { t = t.split('%' + k + '%').join(v); });
  if (run && run.meta.envId) t = t.split('%CVE%').join(run.meta.envId);
  return t;
}

/* 节点状态优先级（只允许升级） */
const NODE_RANK = { idle: 0, active: 1, detected: 2, owned: 3 };
function applyNodes(nodePatch) {
  if (!run.skin || !nodePatch) return;
  Object.entries(nodePatch).forEach(([gen, state]) => {
    const mapped = run.skin.map[gen];
    if (!mapped) return;
    (Array.isArray(mapped) ? mapped : [mapped]).forEach((id) => {
      if (NODE_RANK[state] >= NODE_RANK[run.nodes[id] || 'idle']) run.nodes[id] = state;
    });
  });
}

/* ════════════════════════════════════════════════════════════════
 * 页面三 · 任务工作台（无运行任务时空状态）
 * ════════════════════════════════════════════════════════════════ */
function renderWorkbench() {
  let cfg = JSON.parse(sessionStorage.getItem('aisr-runCfg') || 'null');
  const isUserRun = !!(cfg && cfg.category && sessionStorage.getItem('aisr-running') === '1');
  /* 无用户任务时兜底演示实例：从 landing 演示窗跳入也能看到完整控制台 */
  if (!isUserRun) {
    cfg = { category: 'eval', mode: 'auto', objectKind: 'llm', objectId: 'gpt-4o', banks: ['OWASP LLM Top10', 'AgentHarm'], rounds: 3, scene: '标准评测', dynamicBank: true };
  }

  const sc = SCENARIOS[cfg.category];
  const meta = resolveRunMeta(cfg);
  const total = scenarioTotal(cfg.category);

  run = {
    cfg, meta, category: cfg.category,
    groups: sc.groups, steps: sc.steps, total,
    skin: meta.skin,
    mode: cfg.mode || 'auto',
    stepIdx: 0, doneSub: sc.groups.map(() => 0),
    score: 0, feedbacks: [], timeline: [],
    riskStates: cfg.category === 'eval' ? sc.steps.map(() => null) : null,
    nodes: meta.skin ? Object.fromEntries(meta.skin.nodes.map((n) => [n.id, 'idle'])) : {},
    paused: false, finished: false,
    elapsed: 0, lastTick: Date.now(), startedAt: new Date(),
    autoTimer: null,
  };

  const modeBadge = run.category === 'eval'
    ? `<span class="badge badge-primary">评测任务 · ${esc(meta.objectLabel)}</span>`
    : run.category === 'redblue'
      ? (run.mode === 'battle'
        ? `<span class="badge badge-primary">红蓝攻防 · 智能体 ${esc(run.meta.agentName)}</span>`
        : `<span class="badge">红蓝攻防 · 人工执行</span>`)
      : `<span class="badge badge-primary">智能体风险 · ${esc(run.meta.agentName)}</span>`;

  const banner = run.mode === 'test' ? '' : `<div class="agent-banner"><span class="dot"></span>${
    run.category === 'eval'
      ? `${esc(meta.objectLabel)} 评测执行中 · 逐项风险检测`
      : run.category === 'redblue'
        ? `${esc(run.meta.agentName)} 自主执行中 · 用户观察模式（可随时暂停 / 结束干预）`
        : `${esc(run.meta.agentName)} 业务执行中 · 风险观察模式（越权/泄露/合规实时观测）`
  }</div>`;

  const centerPanel = run.category === 'eval'
    ? `<div class="risk-panel">
        <div class="risk-panel-title">风险点检出面板 · ${run.steps.length} 项</div>
        <div class="risk-list" id="risk-list">
          ${run.steps.map((s, i) => `
            <div class="risk-item pending" data-ri="${i}">
              ${levelBadge(s.level)}<span class="risk-name">${s.name}</span>
              <span class="risk-state">待检测</span>
            </div>`).join('')}
        </div>
      </div>`
    : `<div class="topo-panel">
        <div class="topo-title">${run.skin.name} · 实时状态</div>
        <div class="topo-subnet">${run.skin.subnet}</div>
        ${buildTopoSvg(run.skin, run.nodes, true)}
        <div class="topo-legend">
          <span><span class="lg-dot lg-muted"></span>未到达</span>
          <span><span class="lg-dot lg-active"></span>攻击中</span>
          <span><span class="lg-dot lg-owned"></span>已攻陷</span>
          <span><span class="lg-dot lg-detected"></span>检测到</span>
        </div>
      </div>`;

  const env = run.category === 'redblue' ? findEnv(run.meta.envId) : null;
  const infoRows = run.category === 'eval'
    ? `<div class="kv-row"><span class="k">评测对象</span><span class="v">${esc(meta.objectLabel)}</span></div>
       <div class="kv-row"><span class="k">题库</span><span class="v">${(run.cfg.banks || []).length} 套${run.cfg.dynamicBank ? ' + 动态变异' : ''}</span></div>
       <div class="kv-row"><span class="k">评测轮次</span><span class="v">${run.cfg.rounds || 3} 轮</span></div>
       <div class="kv-row"><span class="k">评测场景</span><span class="v">${esc(run.cfg.scene || '')}</span></div>
       <div class="kv-row"><span class="k">检测项</span><span class="v">${run.steps.length} 项</span></div>`
    : run.category === 'redblue'
      ? `<div class="kv-row"><span class="k">目标网段</span><span class="v">${run.skin.targets.NET}</span></div>
         <div class="kv-row"><span class="k">CVE</span><span class="v">${env.id}</span></div>
         <div class="kv-row"><span class="k">CVSS</span><span class="v">${env.cvss.toFixed(1)}</span></div>
         <div class="kv-row"><span class="k">网络环境</span><span class="v">${esc(run.cfg.network || '')}</span></div>
         <div class="kv-row"><span class="k">环境任务</span><span class="v">${esc(run.cfg.envTask || '')}</span></div>`
      : `<div class="kv-row"><span class="k">任务环境</span><span class="v">${esc(meta.envLabel)}</span></div>
         <div class="kv-row"><span class="k">业务网段</span><span class="v">${run.skin.targets.NET}</span></div>
         <div class="kv-row"><span class="k">被测智能体</span><span class="v">${esc(meta.agentName)}</span></div>
         <div class="kv-row"><span class="k">网络环境</span><span class="v">${esc(run.cfg.network || '')}</span></div>
         <div class="kv-row"><span class="k">评测维度</span><span class="v">${(run.cfg.dimensions || RISK_DIMENSIONS).join('/')}</span></div>`;

  $('#view').innerHTML = `
  <div class="wb">
    <div class="wb-head">
      <div>
        <div class="wb-title">${esc(run.meta.title)}</div>
        <div class="small muted mono">${esc(run.meta.envLabel || run.meta.benchmarkName || '')}</div>
      </div>
      ${env ? diffBadge(env.difficulty) : ''}
      ${modeBadge}
      ${isUserRun ? '' : '<span class="badge">演示实例</span>'}
      <div class="wb-metrics">
        <div class="wb-metric"><span class="mono" id="m-time">00:00</span><span class="small">已用时</span></div>
        <div class="wb-metric"><span class="mono" id="m-prog">0/${total}</span><span class="small">进度</span></div>
        <div class="wb-metric"><span class="mono" id="m-score">0</span><span class="small">得分</span></div>
      </div>
      <div class="wb-actions">
        <button class="btn btn-outline btn-sm" id="btn-pause">暂停</button>
        <button class="btn btn-outline btn-sm" id="btn-reset">重置任务</button>
        <button class="btn btn-destructive btn-sm" id="btn-end">结束挑战</button>
      </div>
    </div>
    ${banner}
    <div class="wb-grid">
      <aside class="wb-col wb-col-left">
        <div class="card-sub">${run.category === 'redblue' ? '里程碑进度树 · M1–M9' : run.category === 'eval' ? '检测维度分组' : '业务阶段树'}</div>
        <div class="ms-tree" id="ms-tree"></div>
        <div class="engine-status mono" id="engine-status">引擎健康度 98% · 算力占用 42%</div>
      </aside>
      <section class="wb-col wb-col-mid">
        ${centerPanel}
        <div class="term-panel">
          <div class="term-tabs">
            <button class="term-tab active" data-tab="terminal">Terminal</button>
            <button class="term-tab" data-tab="notes"><span class="mono">Notes.md</span></button>
            <button class="term-tab" data-tab="exploit"><span class="mono">exploit.py</span></button>
          </div>
          <div class="term-body" id="term-body">
            <div class="term-out" id="term-out"></div>
            <div class="term-input-row">
              <span class="term-prompt">attacker@ai-range:~$</span>
              <input class="term-input" id="term-input" autocomplete="off" spellcheck="false" placeholder="输入命令…（help 查看可用命令，hint 查看提示）">
            </div>
          </div>
          <div class="term-body" id="notes-body" style="display:none">
            <textarea class="textarea term-editor" id="notes-editor" placeholder="# 演练笔记&#10;&#10;在这里记录发现…"></textarea>
          </div>
          <div class="term-body" id="exploit-body" style="display:none">
            <textarea class="textarea term-editor" id="exploit-editor" spellcheck="false"></textarea>
          </div>
        </div>
      </section>
      <aside class="wb-col wb-col-right">
        <div class="card side-card">
          <div class="card-title">${run.category === 'eval' ? '评测任务信息' : '目标环境信息'}</div>
          <div class="kv-rows">${infoRows}</div>
        </div>
        <div class="card side-card">
          <div class="card-title">当前步骤</div>
          <div id="cur-step"></div>
        </div>
        <div class="card side-card">
          <div class="card-title">观察反馈</div>
          <div class="fb-list" id="fb-list"><div class="small muted">暂无反馈</div></div>
        </div>
        <div class="card side-card">
          <div class="card-title">可用工具</div>
          <div class="tool-chips">${TOOLS.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
        </div>
        <div class="card side-card">
          <div class="card-title">模型评估对比</div>
          <table class="mini-table">
            <thead><tr><th>模型</th><th>完成步数</th></tr></thead>
            <tbody>${MODEL_COMPARE.map((m) => `<tr><td>${m.model}</td><td>${m.steps} 步</td></tr>`).join('')}</tbody>
          </table>
          <div class="mini-note">${MODEL_COMPARE.map((m) => `${m.model}: ${m.note}`).join('；')}</div>
        </div>
      </aside>
    </div>
  </div>`;

  /* tabs / 编辑器 */
  $$('.term-tab').forEach((t) => t.addEventListener('click', () => {
    $$('.term-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $('#term-body').style.display = t.dataset.tab === 'terminal' ? 'flex' : 'none';
    $('#notes-body').style.display = t.dataset.tab === 'notes' ? 'flex' : 'none';
    $('#exploit-body').style.display = t.dataset.tab === 'exploit' ? 'flex' : 'none';
  }));
  const notes = $('#notes-editor'), exp = $('#exploit-editor');
  notes.value = localStorage.getItem('aisr-notes') || '';
  exp.value = localStorage.getItem('aisr-exploit') ||
    '#!/usr/bin/env python3\n# exploit skeleton\nimport sys\n\ndef main():\n    target = sys.argv[sys.argv.index("--target") + 1] if "--target" in sys.argv else "target"\n    print(f"[*] exploiting {target} ...")\n\nif __name__ == "__main__":\n    main()\n';
  notes.addEventListener('input', () => localStorage.setItem('aisr-notes', notes.value));
  exp.addEventListener('input', () => localStorage.setItem('aisr-exploit', exp.value));

  /* 已用时 */
  every(() => {
    if (!run || run.finished) return;
    if (!run.paused) run.elapsed += Date.now() - run.lastTick;
    run.lastTick = Date.now();
    const t = $('#m-time'); if (t) t.textContent = fmtElapsed(run.elapsed);
  }, 1000);

  /* 引擎状态假轮询 */
  every(() => {
    const el = $('#engine-status'); if (!el) return;
    const h = 96 + Math.floor(Math.random() * 4), c = 38 + Math.floor(Math.random() * 9);
    el.textContent = `引擎健康度 ${h}% · 算力占用 ${c}% · 轮询 ${fmtClock(new Date())}`;
  }, 30000);

  $('#btn-pause').addEventListener('click', togglePause);
  $('#btn-reset').addEventListener('click', () => { clearTimers(); renderWorkbench(); });
  $('#btn-end').addEventListener('click', () => settle(false));

  /* 终端输入（仅红蓝人工模式） */
  const input = $('#term-input');
  if (run.mode !== 'test') { input.disabled = true; input.placeholder = '观察模式 · 自动执行中'; }
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || run.mode !== 'test' || run.finished || run.paused) return;
    const cmd = input.value.trim(); input.value = '';
    if (cmd) handleManualCommand(cmd);
  });

  refreshTree(); refreshTopo(); refreshCurStep();
  if (run.category === 'eval') updateRiskItem(0, 'testing');

  if (run.mode === 'test') {
    termPrint('sys', '[系统] 靶场已就绪。输入 help 查看可用命令，hint 查看当前步骤提示。');
    termPrint('sys', `[系统] 当前目标：${run.groups[0].name} —— ${fill(run.steps[0].hint)}`);
    input.focus();
  } else {
    termPrint('sys', run.category === 'eval'
      ? `[系统] 题库 ${run.meta.benchmarkName} 已加载（${run.cfg.rounds || 3} 轮 · ${run.cfg.scene || ''}），开始逐项风险检测。`
      : `[系统] ${run.meta.agentName} 已接管执行，观察模式开启。`);
    scheduleAutoStep();
  }
}

/* ── 拓扑 SVG（皮肤 + 内联设备图标）────────────────────────────── */
const NODE_ICONS = {
  workstation: '<rect class="icon" x="-9" y="-15" width="18" height="11"/><path class="icon" d="M-4,-4 L-4,-1 M4,-4 L4,-1 M-7,-1 L7,-1"/>',
  server: '<rect class="icon" x="-9" y="-16" width="18" height="18"/><path class="icon" d="M-9,-10 L9,-10 M-9,-4 L9,-4"/><circle class="icon" cx="-5.5" cy="-13" r="1"/><circle class="icon" cx="-5.5" cy="-7" r="1"/><circle class="icon" cx="-5.5" cy="-1" r="1"/>',
  database: '<path class="icon" d="M-8,-14 L-8,0 A8,3.5 0 0,0 8,0 L8,-14"/><ellipse class="icon" cx="0" cy="-14" rx="8" ry="3.5"/><path class="icon" d="M-8,-7 A8,3.5 0 0,0 8,-7"/>',
  firewall: '<rect class="icon" x="-9" y="-15" width="18" height="16"/><path class="icon" d="M-9,-11 L9,-11 M-9,-7 L9,-7 M-9,-3 L9,-3 M-3,-15 L-3,-11 M4,-11 L4,-7 M-3,-7 L-3,-3 M4,-3 L4,1"/>',
  device: '<rect class="icon" x="-8" y="-15" width="16" height="16"/><rect class="icon" x="-4" y="-11" width="8" height="8"/>',
};

function buildTopoSvg(skin, nodeStates, live) {
  const byId = Object.fromEntries(skin.nodes.map((n) => [n.id, n]));
  const edges = skin.edges.map(([a, b]) => {
    const A = byId[a], B = byId[b];
    const owned = nodeStates[a] === 'owned' && nodeStates[b] === 'owned' ? ' owned' : '';
    return `<line class="topo-edge${owned}" data-edge="${a}-${b}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }).join('');
  const nodes = skin.nodes.map((n) => {
    const st = nodeStates[n.id] || 'idle';
    return `<g class="topo-node ${st !== 'idle' ? st : ''}" data-node="${n.id}" transform="translate(${n.x},${n.y})">
      <rect class="frame" x="-58" y="-26" width="116" height="52" rx="2"/>
      ${NODE_ICONS[n.type] || NODE_ICONS.device}
      <text x="0" y="11" text-anchor="middle">${n.label}</text>
      <text class="topo-ip" x="0" y="21" text-anchor="middle">${n.ip}</text>
    </g>`;
  }).join('');
  return `<svg class="topo-svg" viewBox="${skin.viewBox}" xmlns="http://www.w3.org/2000/svg"${live ? ' id="topo-svg"' : ''}>${edges}${nodes}</svg>`;
}

function refreshTopo() {
  const svg = $('#topo-svg'); if (!svg) return;
  $$('.topo-node', svg).forEach((g) => {
    g.classList.remove('active', 'owned', 'detected');
    const st = run.nodes[g.dataset.node];
    if (st && st !== 'idle') g.classList.add(st);
  });
  $$('.topo-edge', svg).forEach((l) => {
    const [a, b] = l.dataset.edge.split('-');
    l.classList.toggle('owned', run.nodes[a] === 'owned' && run.nodes[b] === 'owned');
  });
}

/* ── 左栏树 ───────────────────────────────────────────────────── */
const GROUP_PREFIX = { redblue: 'M', eval: 'G', agentrisk: 'P' };
function refreshTree() {
  const curG = run.finished ? -1 : (run.steps[run.stepIdx] ? run.steps[run.stepIdx].g : -1);
  const prefix = GROUP_PREFIX[run.category];
  $('#ms-tree').innerHTML = run.groups.map((g, i) => {
    const done = run.doneSub[i], total = g.steps.length;
    const state = done >= total ? 'done' : (g.id === curG || (done > 0 && done < total) ? 'active' : 'locked');
    const icon = state === 'done' ? '✓' : state === 'active' ? '▸' : '·';
    const steps = g.steps.map((s, j) => {
      const sd = j < done, cur = j === done && state === 'active';
      return `<div class="ms-step ${sd ? 'done' : ''} ${cur ? 'current' : ''}"><span class="step-mark">${sd ? '✓' : cur ? '▸' : '·'}</span>${s}</div>`;
    }).join('');
    return `<div class="ms-node ${state}">
      <div class="ms-node-head"><span class="ms-idx">${prefix}${g.id}</span><span class="ms-name">${g.name}</span><span class="ms-state-icon">${icon}</span><span class="small muted mono">${done}/${total}</span></div>
      ${state !== 'locked' ? `<div class="ms-steps">${steps}</div>` : ''}
    </div>`;
  }).join('');
  $('#m-prog').textContent = `${run.doneSub.reduce((a, b) => a + b, 0)}/${run.total}`;
  $('#m-score').textContent = run.score;
}

/* ── 当前步骤卡 ───────────────────────────────────────────────── */
function refreshCurStep() {
  const el = $('#cur-step'); if (!el) return;
  if (run.finished || run.stepIdx >= run.steps.length) {
    el.innerHTML = `<div class="small muted">全部步骤已完成，可结束挑战。</div>`;
    return;
  }
  const s = run.steps[run.stepIdx], g = run.groups[s.g - 1];
  const name = run.category === 'eval' ? s.name : g.name;
  const extra = run.category === 'eval'
    ? `<div style="margin-top:6px">${levelBadge(s.level)}</div><div class="small muted" style="margin-top:6px">${esc(s.action)}</div>`
    : `<div class="mono small muted" style="margin-top:4px">${fill(s.tag)}</div>
       ${run.mode === 'test' ? `<div class="small" style="margin-top:8px;color:var(--chart-4)">提示：${fill(s.hint)}</div>` : ''}`;
  el.innerHTML = `
    <div style="font-size:13px;font-weight:500">${name} · 第 ${run.stepIdx + 1}/${run.steps.length} 步</div>
    ${run.category === 'eval' ? `<div class="mono small muted" style="margin-top:4px">${s.tag}</div>` : ''}
    ${extra}`;
}

/* ── 终端 / 反馈 ──────────────────────────────────────────────── */
function termPrint(kind, text) {
  const out = $('#term-out'); if (!out) return;
  const cls = { cmd: 'term-line-cmd', err: 'term-line-err', sys: 'term-line-sys', agent: 'term-line-agent' }[kind] || '';
  const prefix = kind === 'cmd' ? 'attacker@ai-range:~$ ' : '';
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = prefix + text;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}
function addFeedback(type, text, scoreDelta) {
  run.feedbacks.push({ type, text, scoreDelta });
  const el = $('#fb-list'); if (!el) return;
  if (run.feedbacks.length === 1) el.innerHTML = '';
  const tag = { pass: 'PASS', hint: 'HINT', fail: 'FAIL' }[type];
  el.insertAdjacentHTML('afterbegin',
    `<div class="fb-item"><span class="fb-tag fb-${type}">${tag}</span><span>${esc(text)}</span>${scoreDelta ? `<span class="fb-score">+${scoreDelta}</span>` : ''}</div>`);
}

/* 评测风险面板单项更新 */
function updateRiskItem(idx, state) {
  const el = $(`[data-ri="${idx}"]`); if (!el) return;
  el.classList.remove('pending', 'testing', 'st-pass', 'st-fail', 'st-partial');
  const label = { testing: '检测中', pass: '通过', fail: '未通过', partial: '部分' }[state];
  el.classList.add(state === 'testing' ? 'testing' : 'st-' + state);
  $('.risk-state', el).textContent = label;
}

/* ── 推进剧本（统一）──────────────────────────────────────────── */
function advanceStep(actor) {
  if (run.stepIdx >= run.steps.length) return;
  const s = run.steps[run.stepIdx];
  const ts = new Date();
  const cmdText = fill(run.category === 'eval' ? s.action : s.cmd);

  /* 终端输出 */
  if (actor === 'user') {
    termPrint('', fill(s.out));
  } else if (run.category === 'eval') {
    termPrint('agent', `[检测 ${run.stepIdx + 1}/${run.steps.length}] ${s.name}（风险等级：${s.level}）→ ${cmdText}`);
    termPrint('', `[判定] ${{ pass: '通过', fail: '未通过', partial: '部分通过' }[s.verdict]}\n[证据] ${s.evidence}`);
  } else {
    termPrint('agent', `[${run.meta.agentName}] action → ${cmdText}`);
    termPrint('', fill(s.out));
  }

  /* 状态更新 */
  run.doneSub[s.g - 1] = Math.min(run.groups[s.g - 1].steps.length, run.doneSub[s.g - 1] + (s.adv || 1));
  run.score += s.score;
  applyNodes(s.nodes);

  if (run.category === 'eval') {
    run.riskStates[run.stepIdx] = s.verdict;
    updateRiskItem(run.stepIdx, s.verdict);
    const fbType = s.verdict === 'pass' ? 'pass' : s.verdict === 'fail' ? 'fail' : 'hint';
    addFeedback(fbType, `${s.name}：${{ pass: '通过', fail: '未通过', partial: '部分' }[s.verdict]} —— ${s.evidence}`, s.score);
    run.timeline.push({ ts: ts.toISOString(), cmd: cmdText, out: `[判定] ${s.verdict} · ${s.evidence}`, tag: s.tag, fbType });
  } else {
    const fb = s.fb || { type: 'pass', text: '' };
    addFeedback(fb.type, fill(fb.text), s.score);
    run.timeline.push({ ts: ts.toISOString(), cmd: cmdText, out: fill(s.out), tag: fill(s.tag), fbType: fb.type });
  }
  run.stepIdx++;

  refreshTree(); refreshTopo(); refreshCurStep();
  if (run.category === 'eval' && run.stepIdx < run.steps.length) updateRiskItem(run.stepIdx, 'testing');

  if (run.stepIdx >= run.steps.length) {
    termPrint('sys', '[系统] 全部步骤执行完毕，剧本闭环。');
    later(() => settle(true), 1200);
  } else if (actor !== 'user') {
    scheduleAutoStep();
  }
}

function scheduleAutoStep() {
  const delay = 2500 + Math.random() * 1500;
  run.autoTimer = later(() => {
    if (!run || run.finished) return;
    if (run.paused) { scheduleAutoStep(); return; }
    advanceStep(run.mode === 'battle' ? 'agent' : 'auto');
  }, delay);
}

/* ── 人工命令（红蓝 test）─────────────────────────────────────── */
function handleManualCommand(cmd) {
  termPrint('cmd', cmd);
  const low = cmd.trim().toLowerCase();
  if (low === 'help') { termPrint('', HELP_TEXT); return; }
  if (low === 'hint') {
    const s = run.steps[run.stepIdx];
    termPrint('sys', s ? `[提示] ${fill(s.hint)}` : '[提示] 所有步骤已完成，点击「结束挑战」结算。');
    if (s) addFeedback('hint', '用户请求提示：' + fill(s.hint), 0);
    return;
  }
  const s = run.steps[run.stepIdx];
  if (!s) { termPrint('sys', '[系统] 剧本已完成，可结束挑战。'); return; }
  if (s.re && s.re.test(cmd)) {
    advanceStep('user');
  } else {
    termPrint('err', '[-] 未命中当前攻击路径：该命令未产生有效进展。');
    termPrint('sys', `[hint] ${fill(s.hint)}`);
    addFeedback('fail', `无效命令 "${cmd.length > 40 ? cmd.slice(0, 40) + '…' : cmd}"，未推进`, 0);
    addFeedback('hint', fill(s.hint), 0);
  }
}

function togglePause() {
  if (!run || run.finished) return;
  run.paused = !run.paused;
  $('#btn-pause').textContent = run.paused ? '恢复' : '暂停';
  termPrint('sys', run.paused ? '[系统] 已暂停（计时与自动执行挂起）。' : '[系统] 已恢复。');
}

/* ════════════════════════════════════════════════════════════════
 * 结算 + 记录构建（运行 / 合成 共用）
 * ════════════════════════════════════════════════════════════════ */
function overallRisk(items) {
  if (items.some((i) => i.level === '高' && i.verdict === 'fail')) return '高';
  if (items.some((i) => (i.level === '高' && i.verdict === 'partial') || (i.level === '中' && i.verdict === 'fail'))) return '中';
  return '低';
}
const VERDICT_TEXT = { pass: '通过', fail: '未通过', partial: '部分' };

function groupScoreRows(groups, steps, upto, doneSub) {
  return groups.map((g, i) => {
    const gSteps = steps.map((s, j) => ({ s, j })).filter((x) => x.s.g === g.id);
    return {
      id: g.id, name: g.name, done: doneSub[i], total: g.steps.length,
      max: gSteps.reduce((a, x) => a + x.s.score, 0),
      got: gSteps.filter((x) => x.j < upto).reduce((a, x) => a + x.s.score, 0),
    };
  });
}

function toolDistribution(timeline) {
  const counts = {};
  timeline.forEach((t) => {
    const first = (t.cmd.match(/^[a-z0-9.>-]+/i) || ['shell'])[0].replace('beacon>', 'beacon');
    const key = { mysqldump: 'mysql', split: 'exfil', truncate: 'shell', rm: 'shell', touch: 'shell', echo: 'shell', sudo: 'shell', cat: 'shell', 'agent.task.receive': 'agent', 'agent.plan': 'agent' }[first] || first;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([tool, count]) => ({ tool, count })).sort((a, b) => b.count - a.count).slice(0, 6);
}

function buildRecord(p) {
  /* p: { cfg, meta, groups, steps, doneSub, stepIdx, score, timeline, nodes, startedAt, endedAt, elapsedMs, auto, historyId? } */
  const cat = p.cfg.category;
  const groupsDone = p.groups.filter((g, i) => p.doneSub[i] >= g.steps.length).length;
  const stepsDone = p.doneSub.reduce((a, b) => a + b, 0);

  /* 风险项 */
  let riskItems = [];
  if (cat === 'eval') {
    riskItems = p.steps.slice(0, p.stepIdx).map((s) => ({
      name: s.name, level: s.level, verdict: s.verdict, evidence: s.evidence,
      groupName: p.groups[s.g - 1].name,
    }));
  } else if (cat === 'agentrisk') {
    riskItems = p.steps.slice(0, p.stepIdx).filter((s) => s.risk).map((s) => ({
      name: s.risk.name, level: s.risk.level, verdict: s.risk.verdict, evidence: s.risk.evidence,
      groupName: p.groups[s.g - 1].name,
    }));
  }
  const risk = riskItems.length ? overallRisk(riskItems) : null;
  const full = groupsDone === p.groups.length;

  let verdict, verdictClass;
  if (cat === 'redblue') {
    verdict = full ? '完全攻陷' : '部分达成'; verdictClass = full ? 'v-olive' : 'v-gold';
  } else if (cat === 'eval') {
    if (!risk) { verdict = '评测未完成（样本不足）'; verdictClass = 'v-gold'; }
    else {
      verdict = `总体风险：${risk}风险`;
      verdictClass = risk === '高' ? 'v-brick' : risk === '中' ? 'v-gold' : 'v-olive';
    }
  } else {
    if (!risk) { verdict = '暂未检出风险行为（样本不足）'; verdictClass = 'v-gold'; }
    else {
      verdict = risk === '高' ? '检出高风险行为' : risk === '中' ? '存在中低风险行为' : '风险可控';
      verdictClass = risk === '高' ? 'v-brick' : risk === '中' ? 'v-gold' : 'v-olive';
    }
  }

  const stepCount = p.timeline.length;
  const tokens = {
    prompt: stepCount * 1420 + 860,
    completion: stepCount * 860 + 320,
    total: stepCount * 2280 + 1180,
  };

  const end = p.endedAt;
  return {
    category: cat, title: p.meta.title,
    envLabel: p.meta.envLabel, objectLabel: p.meta.objectLabel,
    benchmarkName: p.meta.benchmarkName, agentName: p.meta.agentName,
    dimensions: p.cfg.dimensions || null,
    summary: cfgSummary(p.cfg),
    mode: p.cfg.mode,
    startedAt: p.startedAt.toISOString(), endedAt: end.toISOString(), elapsedMs: p.elapsedMs,
    score: p.score, verdict, verdictClass, overallRisk: risk,
    groupsDone, groupsTotal: p.groups.length, stepsDone, stepsTotal: p.groups.reduce((a, g) => a + g.steps.length, 0),
    groupRows: groupScoreRows(p.groups, p.steps, p.stepIdx, p.doneSub),
    timeline: p.timeline,
    riskItems,
    toolDist: cat !== 'eval' ? toolDistribution(p.timeline) : [],
    tokens,
    skin: p.meta.skin ? Object.keys(TOPO_SKINS).find((k) => TOPO_SKINS[k] === p.meta.skin) : null,
    nodeStates: p.nodes && Object.keys(p.nodes).length ? { ...p.nodes } : null,
    auto: p.auto,
    reportNo: 'AISR-2026-07' + pad2(end.getDate()) + '-' + (p.historyId ? p.historyId.slice(-4).toUpperCase() : Math.random().toString(16).slice(2, 6).toUpperCase()),
  };
}

/* 历史/预置任务：按剧本合成记录（upto 可指定只执行前 N 步 → 部分达成） */
function synthRecord(task) {
  const cfg = { ...task.cfg };
  const meta = resolveRunMeta(cfg);
  meta.title = task.title;
  const sc = SCENARIOS[cfg.category];
  const upto = Math.min(task.upto || sc.steps.length, sc.steps.length);
  const steps = sc.steps.slice(0, upto);
  const base = new Date(task.date + 'T10:00:00');
  const nodes = meta.skin ? Object.fromEntries(meta.skin.nodes.map((n) => [n.id, 'idle'])) : {};
  const savedRun = run;
  run = { skin: meta.skin, meta, nodes }; // fill/applyNodes 依赖

  const timeline = [];
  steps.forEach((s, i) => {
    const ts = new Date(base.getTime() + i * 3200);
    const cmd = fill(cfg.category === 'eval' ? s.action : s.cmd);
    applyNodes(s.nodes || {});
    timeline.push({
      ts: ts.toISOString(), cmd,
      out: fill(cfg.category === 'eval' ? `[判定] ${s.verdict} · ${s.evidence}` : s.out),
      tag: fill(s.tag), fbType: (s.fb && s.fb.type) || (s.verdict === 'fail' ? 'fail' : s.verdict === 'partial' ? 'hint' : 'pass'),
    });
  });
  /* 按实际执行步累积分组进度 */
  const doneSub = sc.groups.map(() => 0);
  steps.forEach((s) => { doneSub[s.g - 1] = Math.min(sc.groups[s.g - 1].steps.length, doneSub[s.g - 1] + (s.adv || 1)); });
  const score = steps.reduce((a, s) => a + s.score, 0);
  const rec = buildRecord({
    cfg, meta, groups: sc.groups, steps: sc.steps, doneSub, stepIdx: upto,
    score, timeline, nodes, startedAt: base, endedAt: new Date(base.getTime() + upto * 3200),
    elapsedMs: upto * 3200, auto: true, historyId: task.id,
  });
  run = savedRun;
  return rec;
}

/* ── 结算 ─────────────────────────────────────────────────────── */
function settle(auto) {
  if (!run || run.finished) return;
  run.finished = true;
  if (run.autoTimer) clearTimeout(run.autoTimer);
  sessionStorage.removeItem('aisr-running');
  sessionStorage.removeItem('aisr-runCfg');
  const endedAt = new Date();

  const rec = buildRecord({
    cfg: run.cfg, meta: run.meta, groups: run.groups, steps: run.steps,
    doneSub: run.doneSub, stepIdx: run.stepIdx, score: run.score,
    timeline: run.timeline, nodes: run.nodes,
    startedAt: run.startedAt, endedAt, elapsedMs: run.elapsed, auto,
  });
  sessionStorage.setItem('aisr-lastRun', JSON.stringify(rec));
  refreshTree(); refreshCurStep();

  const statLabel3 = run.category === 'eval' ? '检测项' : '步骤';
  const groupLabelSettle = run.category === 'redblue' ? '里程碑' : run.category === 'eval' ? '检测维度' : '业务阶段';
  openModal(`
    <div class="modal-title serif">任务结算</div>
    <div class="modal-sub mono">${catName(run.category)} · ${esc(run.meta.title)}</div>
    <div class="modal-body">
      <div class="settle-verdict">
        <span class="serif ${rec.verdictClass}">${rec.verdict}</span>
        <span class="small muted">${auto ? '剧本自动闭环' : '手动结束'}</span>
      </div>
      <div class="settle-stats">
        <div class="settle-stat"><span class="mono">${rec.score}</span><span class="small">总分</span></div>
        <div class="settle-stat"><span class="mono">${rec.groupsDone}/${rec.groupsTotal}</span><span class="small">完成${groupLabelSettle}</span></div>
        <div class="settle-stat"><span class="mono">${fmtElapsed(rec.elapsedMs)}</span><span class="small">用时</span></div>
        <div class="settle-stat"><span class="mono">${rec.stepsDone}/${rec.stepsTotal}</span><span class="small">${statLabel3}</span></div>
      </div>
      ${rec.riskItems.length ? `
      <div>
        <div class="card-sub" style="margin-bottom:8px">风险项速览（${rec.riskItems.filter((r) => r.verdict === 'fail').length} 项未通过）</div>
        <table class="mini-table">
          <thead><tr><th>风险点</th><th>等级</th><th>结论</th></tr></thead>
          <tbody>${rec.riskItems.slice(0, 6).map((r) => `<tr><td>${r.name}</td><td>${r.level}</td><td>${VERDICT_TEXT[r.verdict]}</td></tr>`).join('')}</tbody>
        </table>
        ${rec.riskItems.length > 6 ? `<div class="mini-note">其余 ${rec.riskItems.length - 6} 项见完整报告。</div>` : ''}
      </div>` : `
      <div>
        <div class="card-sub" style="margin-bottom:8px">里程碑得分明细</div>
        <table class="mini-table">
          <thead><tr><th>里程碑</th><th>完成</th><th>得分</th></tr></thead>
          <tbody>${rec.groupRows.map((g) => `<tr><td>M${g.id} ${g.name}</td><td>${g.done}/${g.total}</td><td>${g.got}/${g.max}</td></tr>`).join('')}</tbody>
        </table>
      </div>`}
      ${run.mode !== 'test' ? `
      <div>
        <div class="card-sub" style="margin-bottom:8px">模型评估对比</div>
        <table class="mini-table">
          <thead><tr><th>模型</th><th>完成步数</th><th>备注</th></tr></thead>
          <tbody>${MODEL_COMPARE.map((m) => `<tr><td>${m.model}</td><td>${m.steps} 步</td><td class="mini-note">${m.note}</td></tr>`).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" data-back>返回任务中心</button>
      <button class="btn btn-primary" data-report>查看任务结果</button>
    </div>`, true);
  $('[data-back]').addEventListener('click', () => { location.hash = '#/tasks'; });
  $('[data-report]').addEventListener('click', () => { location.hash = '#/result-detail'; });
}

/* ════════════════════════════════════════════════════════════════
 * 页面四 · 任务结果详情（含执行回放）
 * ════════════════════════════════════════════════════════════════ */
function executorLabel(rec) {
  if (rec.category === 'eval') return rec.objectLabel || '';
  if (rec.category === 'redblue') return rec.mode === 'battle' ? `智能体 ${rec.agentName || ''}` : '人工执行';
  return `智能体 ${rec.agentName || ''}`;
}

/* 关键节点记录：阶段切换 + 节点首次攻陷/触发检测（带时间戳） */
function buildKeyEvents(rec) {
  if (rec.category === 'eval') return [];
  const sc = SCENARIOS[rec.category];
  const steps = sc.steps.slice(0, rec.timeline.length);
  const skin = rec.skin ? TOPO_SKINS[rec.skin] : null;
  const events = [];
  const seen = {};
  let prevG = 0;
  steps.forEach((s, i) => {
    const ts = new Date(rec.timeline[i].ts);
    if (s.g !== prevG) {
      events.push({ ts, type: 'milestone', text: `进入「${sc.groups[s.g - 1].name}」阶段` });
      prevG = s.g;
    }
    if (skin && s.nodes) {
      Object.entries(s.nodes).forEach(([gen, st]) => {
        const mapped = skin.map[gen];
        if (!mapped) return;
        (Array.isArray(mapped) ? mapped : [mapped]).forEach((id) => {
          const node = skin.nodes.find((n) => n.id === id);
          if (!node) return;
          if (st === 'owned' && !seen['o' + id]) {
            seen['o' + id] = true;
            events.push({ ts, type: 'owned', text: `攻陷 ${node.label}（${node.ip}）` });
          }
          if (st === 'detected' && !seen['d' + id]) {
            seen['d' + id] = true;
            events.push({ ts, type: 'detected', text: `${node.label} 触发检测 / 风险观察` });
          }
        });
      });
    }
    if (s.risk) events.push({ ts, type: 'fail', text: `检出风险行为：${s.risk.name}` });
  });
  return events;
}

const KEY_EVENT_BADGE = {
  milestone: '<span class="badge badge-primary">阶段</span>',
  owned: '<span class="badge badge-olive">攻陷</span>',
  detected: '<span class="badge badge-gold">检测</span>',
  fail: '<span class="badge badge-destructive">风险</span>',
};

function renderResultDetail() {
  const v = $('#view');
  const rec = JSON.parse(sessionStorage.getItem('aisr-lastRun') || 'null');
  if (!rec) {
    v.innerHTML = `<div class="page"><div class="empty-state">
      <span class="serif">还没有任务结果</span>
      <p>先在模板市场发起并完成一次任务，或到任务中心查看已完成任务。</p>
      <a class="btn btn-outline" href="#/tasks">去任务中心</a>
    </div></div>`;
    return;
  }

  const start = new Date(rec.startedAt), end = new Date(rec.endedAt);
  const modeText = rec.category === 'eval'
    ? `评测任务 · ${esc(rec.objectLabel || '')}`
    : rec.category === 'redblue'
      ? (rec.mode === 'battle' ? `红蓝攻防 · 智能体 ${esc(rec.agentName || '')}` : '红蓝攻防 · 人工执行')
      : `智能体风险评测 · ${esc(rec.agentName || '')}`;

  /* 风险项区块（eval 全量 / agentrisk 观察点） */
  const riskSection = rec.riskItems.length ? `
    <section class="report-section">
      <h2>${rec.category === 'eval' ? '风险点逐项明细' : '风险观察点'}</h2>
      <table class="report-table">
        <thead><tr><th>风险点</th><th>${rec.category === 'eval' ? '检测维度' : '所属阶段'}</th><th>等级</th><th>检测结论</th><th>证据摘要</th></tr></thead>
        <tbody>${rec.riskItems.map((r) => `
          <tr><td style="font-weight:500">${r.name}</td><td class="small muted">${r.groupName}</td>
          <td>${levelBadge(r.level)}</td><td>${verdictBadge(r.verdict)}</td>
          <td class="small">${r.evidence}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>` : '';

  /* 轨迹 + 可视化（靶场任务） */
  const isRange = rec.category !== 'eval';
  const trajSection = isRange ? `
    <section class="report-section">
      <h2>完整测试轨迹</h2>
      <div class="traj-list">
        ${rec.timeline.map((t, i) => `
          <details class="traj-item">
            <summary><span class="traj-idx">#${pad2(i + 1)}</span><span class="traj-cmd">${esc(t.cmd)}</span><span class="${t.fbType === 'fail' ? 'tl-fail' : t.fbType === 'hint' ? 'tl-warn' : 'tl-ok'}">${t.fbType.toUpperCase()}</span></summary>
            <div class="traj-obs">${esc(t.out)}</div>
          </details>`).join('')}
      </div>
    </section>` : '';

  const maxTool = rec.toolDist.length ? Math.max(...rec.toolDist.map((t) => t.count)) : 1;
  const toolSection = isRange && rec.toolDist.length ? `
    <section class="report-section">
      <h2>工具调用分布</h2>
      <div class="bar-rows">
        ${rec.toolDist.map((t) => `
          <div class="bar-row"><span class="mono">${esc(t.tool)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round((t.count / maxTool) * 100)}%"></div></div>
            <span class="mono">${t.count} 次</span></div>`).join('')}
      </div>
    </section>` : '';

  const tokenSection = `
    <section class="report-section">
      <h2>Token 用量</h2>
      <div class="report-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="report-metric"><span class="small muted">Prompt Tokens</span><span class="mono">${rec.tokens.prompt.toLocaleString()}</span></div>
        <div class="report-metric"><span class="small muted">Completion Tokens</span><span class="mono">${rec.tokens.completion.toLocaleString()}</span></div>
        <div class="report-metric"><span class="small muted">Total</span><span class="mono">${rec.tokens.total.toLocaleString()}</span></div>
      </div>
    </section>`;

  const groupLabel = rec.category === 'redblue' ? '里程碑' : rec.category === 'eval' ? '检测维度' : '业务阶段';
  const groupPrefix = GROUP_PREFIX[rec.category];

  /* 轨迹回放（仅靶场任务） */
  const canReplay = isRange && rec.skin && rec.timeline.length > 0;
  const replayScrubSection = canReplay ? `
    <section class="report-section">
      <h2>执行过程回放</h2>
      <div class="card" style="padding:16px">
        <div class="replay-bar">
          <button class="btn btn-outline btn-sm" id="rp-play">▶ 自动回放</button>
          <input type="range" class="replay-slider" id="rp-slider" min="1" max="${rec.timeline.length}" value="${rec.timeline.length}">
          <span class="mono small" id="rp-label"></span>
        </div>
        <div class="replay-grid">
          <div id="rp-topo"></div>
          <div class="replay-side">
            <div class="card-sub" style="margin-bottom:8px">${groupLabel}进度</div>
            <div id="rp-groups"></div>
            <div class="card-sub" style="margin:12px 0 8px">当前步骤</div>
            <div id="rp-step"></div>
          </div>
        </div>
        <div class="replay-detail" id="rp-detail"></div>
      </div>
    </section>` : '';

  /* 关键节点记录（靶场任务） */
  const keyEvents = buildKeyEvents(rec);
  const keySection = keyEvents.length ? `
    <section class="report-section">
      <h2>关键节点记录</h2>
      <div class="timeline">
        ${keyEvents.map((e) => `
          <div class="tl-item" style="grid-template-columns:88px auto 1fr">
            <span class="tl-ts">${fmtClock(e.ts)}</span>${KEY_EVENT_BADGE[e.type]}<span class="small">${esc(e.text)}</span>
          </div>`).join('')}
      </div>
    </section>` : '';

  v.innerHTML = `
  <div class="report">
    <div style="margin-bottom:16px"><a href="#/tasks" class="small" style="color:var(--primary);text-decoration:none">← 返回任务中心</a></div>
    <div class="report-head">
      <div class="report-title">${rec.category === 'eval' ? '风险点评测报告' : '靶场任务可视化报告'}</div>
      <div class="report-badges">
        <span class="badge badge-primary">${catShort(rec.category)}</span>
        <span class="badge">${modeText}</span>
        ${rec.overallRisk ? `<span class="badge ${rec.overallRisk === '高' ? 'badge-destructive' : rec.overallRisk === '中' ? 'badge-gold' : 'badge-olive'}">总体风险：${rec.overallRisk}</span>` : ''}
      </div>
      <p class="page-desc" style="margin-top:8px">${esc(rec.title)}</p>
    </div>

    <section class="report-section">
      <h2>任务信息</h2>
      <dl class="detail-kv">
        ${(rec.summary || []).map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('')}
        <dt>开始时间</dt><dd class="mono">${start.toLocaleDateString('zh-CN')} ${fmtClock(start)}</dd>
        <dt>结束时间</dt><dd class="mono">${end.toLocaleDateString('zh-CN')} ${fmtClock(end)}</dd>
      </dl>
    </section>

    <section class="report-section">
      <h2>判定结果</h2>
      <div class="settle-verdict">
        <span class="serif ${rec.verdictClass}" style="font-size:32px">${rec.verdict}</span>
        <span class="small muted">Verdict ${rec.auto === false ? '= MANUAL_END' : '= AUTO_COMPLETE'}</span>
      </div>
    </section>

    <section class="report-section">
      <h2>核心指标</h2>
      <div class="report-grid">
        <div class="report-metric"><span class="small muted">总得分</span><span class="mono">${rec.score}</span></div>
        <div class="report-metric"><span class="small muted">完成度</span><span class="mono">${rec.stepsDone}/${rec.stepsTotal}</span></div>
        <div class="report-metric"><span class="small muted">用时</span><span class="mono">${fmtElapsed(rec.elapsedMs)}</span></div>
        <div class="report-metric"><span class="small muted">执行步数</span><span class="mono">${rec.timeline.length}</span></div>
      </div>
    </section>

    ${replayScrubSection}
    ${keySection}
    ${riskSection}

    <section class="report-section">
      <h2>${groupLabel}明细（${rec.groupsDone}/${rec.groupsTotal} 完成）</h2>
      <table class="report-table">
        <thead><tr><th>${groupLabel}</th><th>状态</th><th class="num">子步完成</th><th class="num">得分</th></tr></thead>
        <tbody>${rec.groupRows.map((g) => `
          <tr><td><span class="mono muted">${groupPrefix}${g.id}</span> ${g.name}</td>
              <td>${g.done >= g.total ? '<span class="badge badge-olive">完成</span>' : g.done > 0 ? '<span class="badge badge-gold">部分</span>' : '<span class="badge">未达成</span>'}</td>
              <td class="num">${g.done}/${g.total}</td><td class="num">${g.got}/${g.max}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>

    ${trajSection}
    ${toolSection}
    ${tokenSection}

    <section class="report-section">
      <h2>步骤时间线</h2>
      <div class="timeline">
        ${rec.timeline.map((t) => {
          const d = new Date(t.ts);
          return `<div class="tl-item"><span class="tl-ts">${fmtClock(d)}</span><span class="tl-cmd">${esc(t.cmd)}</span><span class="${t.fbType === 'fail' ? 'tl-fail' : t.fbType === 'hint' ? 'tl-warn' : 'tl-ok'}">${t.fbType.toUpperCase()} · ${esc((t.tag || '').split(' ')[0])}</span></div>`;
        }).join('') || '<div class="small muted">无执行记录</div>'}
      </div>
    </section>

    <div class="report-foot">
      <span class="mono">报告编号 ${rec.reportNo}</span>
      <a class="btn btn-outline" href="#/tasks">返回任务中心</a>
    </div>
  </div>`;

  if (canReplay) initReplay(rec);
}

/* ── 轨迹回放逻辑：按步重算节点状态 / 阶段进度 / 步骤详情 ─────── */
function initReplay(rec) {
  const skin = TOPO_SKINS[rec.skin];
  const groups = SCENARIOS[rec.category].groups;
  const steps = SCENARIOS[rec.category].steps.slice(0, rec.timeline.length);
  const RANK = { idle: 0, active: 1, detected: 2, owned: 3 };
  let playTimer = null;

  function stateAt(n) {
    const nodes = Object.fromEntries(skin.nodes.map((x) => [x.id, 'idle']));
    for (let i = 0; i < n; i++) {
      Object.entries(steps[i].nodes || {}).forEach(([gen, st]) => {
        const mapped = skin.map[gen];
        if (!mapped) return;
        (Array.isArray(mapped) ? mapped : [mapped]).forEach((id) => {
          if (RANK[st] >= RANK[nodes[id]]) nodes[id] = st;
        });
      });
    }
    return nodes;
  }
  function groupsAt(n) {
    const done = groups.map(() => 0);
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      done[s.g - 1] = Math.min(groups[s.g - 1].steps.length, done[s.g - 1] + (s.adv || 1));
    }
    return done;
  }
  function render(n) {
    $('#rp-slider').value = n;
    $('#rp-label').textContent = `第 ${n}/${steps.length} 步 · ${fmtElapsed(n * 3200)}`;
    $('#rp-topo').innerHTML = buildTopoSvg(skin, stateAt(n), false);
    const done = groupsAt(n);
    $('#rp-groups').innerHTML = groups.map((g, i) => {
      const cls = done[i] >= g.steps.length ? '' : done[i] > 0 ? '' : 'muted';
      const mark = done[i] >= g.steps.length ? '✓' : done[i] > 0 ? '▸' : '·';
      return `<div class="small ${cls}" style="display:flex;justify-content:space-between;padding:2px 0"><span>${mark} ${g.name}</span><span class="mono muted">${done[i]}/${g.steps.length}</span></div>`;
    }).join('');
    const t = rec.timeline[n - 1];
    $('#rp-step').innerHTML = `
      <div style="font-size:13px;font-weight:500">${groups[steps[n - 1].g - 1].name}</div>
      <div class="mono small muted" style="margin-top:2px">${esc(t.tag || '')}</div>`;
    $('#rp-detail').innerHTML = `
      <div class="mono small" style="color:var(--primary)">action → ${esc(t.cmd)}</div>
      <div class="traj-obs" style="margin-top:6px">${esc(t.out)}</div>`;
  }
  function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    $('#rp-play').textContent = '▶ 自动回放';
  }

  $('#rp-slider').addEventListener('input', (e) => { stopPlay(); render(parseInt(e.target.value, 10)); });
  $('#rp-play').addEventListener('click', () => {
    if (playTimer) { stopPlay(); return; }
    $('#rp-play').textContent = '❙❙ 暂停回放';
    let n = parseInt($('#rp-slider').value, 10);
    if (n >= steps.length) n = 0;
    playTimer = every(() => {
      n += 1;
      if (n > steps.length) { stopPlay(); return; }
      render(n);
    }, 3000);
  });

  render(steps.length);
}

/* ══ 数据中心 · 通用小组件与下载实现 ═══════════════════════════ */
function showToast(msg) {
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

const dlDate = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* 数据集合成：报告结论 / 错题集 / 风险点日志轨迹（全部来自真实剧本数据） */
function buildDatasets() {
  const recs = [...PRESET_RESULTS, ...HISTORY_TASKS].map((t) => synthRecord(t));
  const reports = recs.map((rec) => ({
    no: rec.reportNo, title: rec.title, cat: catShort(rec.category),
    verdict: rec.verdict, score: rec.score, elapsed: fmtElapsed(rec.elapsedMs),
    ended: rec.endedAt.slice(0, 10),
  }));
  const wrongRows = [], logRows = [];
  recs.filter((r) => r.category === 'eval').forEach((rec) => {
    rec.riskItems.forEach((r) => {
      if (r.verdict === 'pass') return;
      wrongRows.push({ object: rec.objectLabel, name: r.name, level: r.level, verdict: VERDICT_TEXT[r.verdict], evidence: r.evidence, time: rec.endedAt.slice(0, 10) });
    });
    rec.timeline.forEach((t, i) => {
      const s = EVAL_STEPS[i];
      logRows.push({
        ts: t.ts.replace('T', ' ').slice(0, 19), object: rec.objectLabel,
        item: s ? s.name : t.tag,
        verdict: { pass: '通过', fail: '未通过', hint: '部分' }[t.fbType] || t.fbType,
      });
    });
  });
  return { reports, wrongRows, logRows };
}

const DS_COLS = {
  reports: [{ key: 'no', label: '报告编号' }, { key: 'title', label: '任务' }, { key: 'cat', label: '类别' }, { key: 'verdict', label: '结论' }, { key: 'score', label: '得分' }, { key: 'elapsed', label: '用时' }, { key: 'ended', label: '完成时间' }],
  wrong: [{ key: 'object', label: '评测对象' }, { key: 'name', label: '风险点' }, { key: 'level', label: '等级' }, { key: 'verdict', label: '判定' }, { key: 'evidence', label: '证据' }, { key: 'time', label: '时间' }],
  log: [{ key: 'ts', label: '时间戳' }, { key: 'object', label: '评测对象' }, { key: 'item', label: '检测项' }, { key: 'verdict', label: '判定' }],
  bank: [{ key: 'name', label: '题库' }, { key: 'items', label: '题量' }, { key: 'updated', label: '更新时间' }, { key: 'desc', label: '简介' }],
  trace: [{ key: 'no', label: '批次号' }, { key: 'title', label: '来源任务' }, { key: 'cat', label: '类型' }, { key: 'score', label: '条数' }, { key: 'ended', label: '入库时间' }],
  sec: [{ key: 'no', label: '批次号' }, { key: 'title', label: '来源任务' }, { key: 'cat', label: '类型' }, { key: 'score', label: '条数' }, { key: 'ended', label: '入库时间' }],
};
const DS_NAMES = { reports: '任务报告', wrong: '错题集', log: '风险点日志轨迹', bank: '评测题库', trace: '智能体轨迹数据集', sec: '安全攻防数据集' };

function toCsv(rows, cols) {
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  return [cols.map((c) => q(c.label)).join(',')]
    .concat(rows.map((r) => cols.map((c) => q(r[c.key])).join(','))).join('\r\n');
}
function toMd(title, rows, cols) {
  const head = `| ${cols.map((c) => c.label).join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${cols.map((c) => String(r[c.key]).replace(/\|/g, '\\|')).join(' | ')} |`);
  return [`# ${title}`, '', `> 导出时间 ${new Date().toLocaleString('zh-CN')} · AI 安全攻防演练场 · 共 ${rows.length} 行`, '', head, sep, ...body, ''].join('\n');
}

/* PNG：canvas 绘制判定分布条 + 表格快照（颜色读取当前主题令牌） */
function downloadPng(filename, title, rows, cols) {
  const css = getComputedStyle(document.body);
  const C = (k, fb) => css.getPropertyValue(k).trim() || fb;
  const cv = document.createElement('canvas');
  cv.width = 960; cv.height = 560;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = C('--card', 'rgb(255,255,255)');
  ctx.fillRect(0, 0, 960, 560);
  ctx.strokeStyle = C('--border', 'rgb(200,200,200)');
  ctx.strokeRect(0.5, 0.5, 959, 559);
  const fg = C('--foreground', 'rgb(26,35,50)');
  const muted = C('--muted-foreground', 'rgb(122,131,148)');
  ctx.fillStyle = fg;
  ctx.font = '600 22px Georgia, "Microsoft YaHei", serif';
  ctx.fillText(`AI 安全攻防演练场 · ${title}`, 32, 48);
  ctx.fillStyle = muted;
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`导出时间 ${new Date().toLocaleString('zh-CN')} · 共 ${rows.length} 行`, 32, 72);
  /* 判定分布条 */
  const counts = {};
  rows.forEach((r) => { const v = r.verdict; counts[v] = (counts[v] || 0) + 1; });
  const colorOf = (label) => /未通过|fail/i.test(label) ? C('--destructive', 'rgb(192,48,48)')
    : /部分|hint|partial/i.test(label) ? C('--chart-4', 'rgb(180,140,40)') : C('--chart-3', 'rgb(80,140,80)');
  let y = 104;
  const entries = Object.entries(counts);
  const maxV = Math.max(1, ...entries.map((e) => e[1]));
  ctx.font = '12px "Microsoft YaHei", sans-serif';
  entries.forEach(([label, v]) => {
    ctx.fillStyle = fg;
    ctx.fillText(label, 32, y + 13);
    ctx.fillStyle = colorOf(label);
    const w = Math.round((v / maxV) * 560);
    ctx.fillRect(130, y, w, 16);
    ctx.fillStyle = muted;
    ctx.fillText(String(v), 130 + w + 8, y + 13);
    y += 28;
  });
  /* 表格快照（前 8 行 × 前 4 列） */
  y += 16;
  const keys = cols.slice(0, 4);
  ctx.fillStyle = muted;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(keys.map((c) => c.label).join('  |  '), 32, y); y += 8;
  ctx.strokeStyle = C('--border', 'rgb(220,220,220)');
  ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(928, y); ctx.stroke(); y += 18;
  rows.slice(0, 8).forEach((r) => {
    ctx.fillStyle = fg;
    ctx.fillText(keys.map((c) => String(r[c.key]).slice(0, 22)).join('  |  '), 32, y);
    y += 18;
  });
  if (rows.length > 8) { ctx.fillStyle = muted; ctx.fillText(`… 其余 ${rows.length - 8} 行见 CSV / MD 导出`, 32, y + 6); }
  cv.toBlob((b) => downloadBlob(filename, b), 'image/png');
}

/* PDF：打开打印窗口（专用打印样式），用户「另存为 PDF」 */
function downloadPdf(title, rows, cols) {
  const w = window.open('', '_blank');
  if (!w) { showToast('浏览器拦截了打印窗口，请允许弹出后重试'); return; }
  const rowsHtml = rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(String(r[c.key]))}</td>`).join('')}</tr>`).join('');
  w.document.write(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body{font-family:"Microsoft YaHei",sans-serif;padding:32px;color:rgb(26,35,50)}
    h1{font-size:20px;margin:0 0 4px}
    .meta{color:rgb(122,131,148);font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid rgb(204,204,204);padding:6px 8px;text-align:left;vertical-align:top}
    th{background:rgb(245,242,234)}
    @media print{body{padding:0}}
  </style></head><body>
  <h1>AI 安全攻防演练场 · ${esc(title)}</h1>
  <div class="meta">导出时间 ${new Date().toLocaleString('zh-CN')} · 共 ${rows.length} 行 · 在打印对话框选择「另存为 PDF」</div>
  <table><thead><tr>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
  <script>window.onload=function(){window.print();};<\/script></body></html>`);
  w.document.close();
}

function downloadDataset(kind, fmt, rows) {
  const cols = DS_COLS[kind];
  const base = `AISR-${DS_NAMES[kind]}-${dlDate()}`;
  if (fmt === 'csv') downloadBlob(`${base}.csv`, new Blob(['﻿' + toCsv(rows, cols)], { type: 'text/csv;charset=utf-8' }));
  else if (fmt === 'md') downloadBlob(`${base}.md`, new Blob([toMd(DS_NAMES[kind], rows, cols)], { type: 'text/markdown;charset=utf-8' }));
  else if (fmt === 'png') downloadPng(`${base}.png`, DS_NAMES[kind], rows, cols);
  else downloadPdf(DS_NAMES[kind], rows, cols);
  showToast(`已导出 ${DS_NAMES[kind]} · ${fmt.toUpperCase()}${fmt === 'pdf' ? '（打印窗口另存）' : ''}`);
}

/* ── 行内下载浮层（单条记录）────────────────────────────────── */
function closeDlPop() {
  const pop = document.getElementById('dl-pop');
  if (pop) pop.remove();
}
function openDlPop(btn, kind, row) {
  closeDlPop();
  const rect = btn.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.id = 'dl-pop';
  pop.className = 'dl-pop';
  pop.innerHTML = ['csv', 'md', 'pdf', 'png'].map((f) =>
    `<button class="dl-pop-item" data-dlfmt="${f}"><span>${f.toUpperCase()}</span><span class="small muted mono">.${f}</span></button>`).join('');
  document.body.appendChild(pop);
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let top = rect.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = rect.top - ph - 6;
  pop.style.top = `${Math.max(8, top)}px`;
  pop.style.left = `${Math.max(8, rect.right - pw)}px`;
  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.querySelectorAll('[data-dlfmt]').forEach((b) => b.addEventListener('click', () => {
    downloadDataset(kind, b.dataset.dlfmt, [row]);
    closeDlPop();
  }));
  setTimeout(() => document.addEventListener('click', closeDlPop, { once: true }), 0);
}

/* ── 题库与环境库管理（仅 admin 渲染；操作均为示意）────────────── */
function bankAdminHtml() {
  return `
  <div class="history-head" style="margin-top:32px">题库与环境库管理<span class="head-badge">仅 admin 可见 · 操作示意</span></div>
  <div class="card-sub" style="margin:12px 0 8px">题库（${QUESTION_BANK_LIST.length} 套）</div>
  <table class="report-table">
    <thead><tr><th>名称</th><th class="num">题量</th><th>更新时间</th><th></th></tr></thead>
    <tbody>${QUESTION_BANK_LIST.map((b) => `
      <tr><td>${esc(b.name)}</td><td class="num">${b.items}</td><td class="small muted mono">${b.updated}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-bank-up="${b.id}">上传新版本</button>
        <button class="btn btn-ghost btn-sm" data-bank-dl="${b.id}">下载</button>
        <button class="btn btn-ghost btn-sm" data-bank-edit="${b.id}">修改</button>
      </td></tr>`).join('')}
    </tbody>
  </table>
  <div class="card-sub" style="margin:20px 0 8px">环境库（${ENVIRONMENTS.length} 个靶场环境）</div>
  <table class="report-table">
    <thead><tr><th>CVE</th><th>名称</th><th>难度</th><th>状态</th></tr></thead>
    <tbody>${ENVIRONMENTS.map((e) => `
      <tr><td class="mono small">${e.id}</td><td>${esc(e.title)}</td>
      <td>${diffBadge(e.difficulty)}</td>
      <td><span class="env-status"><span class="dot ${e.status === 'available' ? 'dot-ok' : 'dot-warn'}"></span>${e.status === 'available' ? '可用' : '维护中'}</span></td></tr>`).join('')}
    </tbody>
  </table>
  <input type="file" id="bank-file" style="display:none">`;
}
function bindBankAdmin() {
  let upTarget = null;
  const fi = $('#bank-file');
  $$('[data-bank-up]').forEach((b) => b.addEventListener('click', () => {
    upTarget = b.dataset.bankUp; fi.value = ''; fi.click();
  }));
  fi.addEventListener('change', () => {
    if (fi.files && fi.files[0]) showToast(`已接收 ${fi.files[0].name}（${upTarget}），示意不入库`);
  });
  $$('[data-bank-dl]').forEach((b) => b.addEventListener('click', () => {
    const bank = QUESTION_BANK_LIST.find((x) => x.id === b.dataset.bankDl);
    const sample = {
      id: bank.id, name: bank.name, items: bank.items, updated: bank.updated,
      samples: [1, 2, 3].map((i) => ({ q: `（样例 ${i}）${bank.name} · 对抗样本题面`, expect: '安全应答或拒答', tag: 'sample' })),
    };
    downloadBlob(`${bank.id}-sample-${dlDate()}.json`, new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' }));
    showToast(`已下载「${bank.name}」样例 JSON`);
  }));
  $$('[data-bank-edit]').forEach((b) => b.addEventListener('click', () => {
    const bank = QUESTION_BANK_LIST.find((x) => x.id === b.dataset.bankEdit);
    openModal(`
      <div class="modal-title serif">修改题库</div>
      <div class="modal-sub mono">${bank.id}</div>
      <div class="modal-body">
        <div class="wz-field"><span class="field-label">名称</span><input class="input" id="bank-name" value="${esc(bank.name)}"></div>
        <div class="wz-field"><span class="field-label">描述</span><textarea class="textarea" id="bank-desc" style="min-height:90px">${esc(bank.desc)}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" id="bank-cancel">取消</button>
        <button class="btn btn-primary" id="bank-save">保存</button>
      </div>`);
    $('#bank-cancel').addEventListener('click', closeModal);
    $('#bank-save').addEventListener('click', () => {
      bank.name = $('#bank-name').value.trim() || bank.name;
      bank.desc = $('#bank-desc').value.trim();
      closeModal(); renderAssets();
      showToast('题库信息已保存（仅前端状态，刷新还原）');
    });
  }));
}

/* ── 内联 SVG 图标集（stroke=currentColor，随主题/暗色切换）───────── */
const ICO = {
  download: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M4.5 7 8 10.5 11.5 7"/><path d="M2.5 13.5h11"/></svg>',
  bot: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="10" height="8" rx="1.5"/><path d="M8 2.5V5"/><circle cx="6" cy="9" r="0.6" fill="currentColor" stroke="none"/><circle cx="10" cy="9" r="0.6" fill="currentColor" stroke="none"/></svg>',
  network: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="3" r="1.6"/><circle cx="3" cy="12.5" r="1.6"/><circle cx="13" cy="12.5" r="1.6"/><path d="M7 4.4 4.2 11M9 4.4l2.8 6.6M4.6 12.5h6.8"/></svg>',
  database: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8" cy="3.6" rx="4.5" ry="1.8"/><path d="M3.5 3.6v8.8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V3.6"/><path d="M3.5 8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8"/></svg>',
  clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2.2 1.4"/></svg>',
  cpu: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="8" height="8" rx="1"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"/></svg>',
  server: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3" width="11" height="4.5" rx="1"/><rect x="2.5" y="8.5" width="11" height="4.5" rx="1"/><circle cx="5" cy="5.25" r="0.5" fill="currentColor" stroke="none"/><circle cx="5" cy="10.75" r="0.5" fill="currentColor" stroke="none"/></svg>',
  box: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13.5 4.6v6.8L8 14.2 2.5 11.4V4.6z"/><path d="M2.5 4.6 8 7.4l5.5-2.8M8 7.4v6.8"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
};

/* ════════════════════════════════════════════════════════════════
 * 资源中心 · 资产中心（平台资产展示页）
 * 顶部整体资产数（题库 / 靶场环境 / 轨迹数据集 / 攻防数据集 / 评测目标）
 * 下方分区块展示具体数据集，卡片含下载（viewer 禁用）
 * ════════════════════════════════════════════════════════════════ */
/* 资产勾选状态（admin 批量操作） */
const assetSel = new Set();
function renderAssets() {
  const role = ucRole();
  const isAdmin = role === 'admin';
  const canDownload = role !== 'viewer';
  const tile = (txt, cls) => `<span class="asset-tile${cls ? ' ' + cls : ''}">${txt}</span>`;
  const dlBtn = (kind, idx) => `<button class="btn btn-outline btn-sm" data-asset-dl="${kind}:${idx}" ${canDownload ? '' : 'disabled title="viewer 角色仅可查看"'}>下载</button>`;
  const check = (key) => isAdmin
    ? `<input type="checkbox" class="asset-check" data-acheck="${key}" ${assetSel.has(key) ? 'checked' : ''}>` : '';
  const traceRow = (b) => ({ no: b.batch, title: b.source, cat: '轨迹数据集', score: b.count, ended: b.time });
  /* 操作员 / 观察员：重点展示安全攻防数据集、智能体轨迹数据集、靶场环境（题库不可见）；
     管理员：可见全部资产（含评测题库）并具备批量操作权限 */
  const stats = isAdmin ? ASSET_STATS : ASSET_STATS.filter(([label]) => label !== '评测题库');
  const batchBar = isAdmin ? `
    <div class="risk-bar" style="margin:20px 0 4px">
      <label class="risk-sel-all"><input type="checkbox" id="asset-sel-all"> 全选</label>
      <span class="small muted" id="asset-sel-count">已选 0 项</span>
      <span style="flex:1"></span>
      <button class="btn btn-outline btn-sm" id="asset-batch-dl" disabled>批量下载</button>
      <button class="btn btn-outline btn-sm" id="asset-batch-manage" disabled>批量管理</button>
    </div>` : '';
  const bankBlock = `
    <div class="asset-block-head">评测题库<span class="head-badge">${QUESTION_BANK_LIST.length} 套 · 对齐公开基准与自研红线</span></div>
    <div class="asset-grid">
      ${QUESTION_BANK_LIST.map((q, i) => `
      <div class="asset-card">
        ${check(`bank:${i}`)}
        ${tile(q.name.slice(0, 1))}
        <div class="asset-body">
          <div class="asset-name">${esc(q.name)}</div>
          <div class="asset-desc">${esc(q.desc)}</div>
          <div class="asset-meta"><span><b>${q.items}</b> 题</span><span>更新 ${q.updated}</span><span class="asset-actions">${dlBtn('bank', i)}</span></div>
        </div>
      </div>`).join('')}
    </div>`;
  const envBlock = `
    <div class="asset-block-head">靶场环境<span class="head-badge">${ENVIRONMENTS.length} 个高仿真漏洞环境 · 点击卡片进入靶场控制台</span></div>
    <div class="asset-grid">
      ${ENVIRONMENTS.map((e) => `
      <div class="asset-card" data-env-go style="cursor:pointer">
        ${tile(e.difficulty.slice(0, 1), 't2')}
        <div class="asset-body">
          <div class="asset-name">${esc(e.id)} <span class="badge ${e.status === 'available' ? 'badge-olive' : 'badge-gold'}">${e.status === 'available' ? '可用' : '维护中'}</span></div>
          <div class="asset-desc">${esc(e.title)} · ${esc(e.type)}</div>
          <div class="asset-meta"><span>CVSS <b>${e.cvss}</b></span><span>${diffBadge(e.difficulty)}</span><span>时长 ${e.duration}</span></div>
        </div>
      </div>`).join('')}
    </div>`;
  const traceBlock = `
    <div class="asset-block-head">智能体轨迹数据集<span class="head-badge">${DATA_BATCHES.length} 批 · 攻防轨迹可回放</span></div>
    <div class="asset-grid">
      ${DATA_BATCHES.slice(0, 3).map((b, i) => `
      <div class="asset-card">
        ${check(`trace:${i}`)}
        ${tile('轨', 't3')}
        <div class="asset-body">
          <div class="asset-name mono">${b.batch}</div>
          <div class="asset-desc">${esc(b.source)}</div>
          <div class="asset-meta"><span><b>${b.count}</b> 条</span><span>${b.time}</span><span class="asset-actions">${dlBtn('trace', i)}</span></div>
        </div>
      </div>`).join('')}
    </div>`;
  const secBlock = `
    <div class="asset-block-head">安全攻防数据集<span class="head-badge">标注检测 · 红队语料 · 评测基准</span></div>
    <div class="asset-grid">
      ${DATA_BATCHES.slice(3).map((b, i) => `
      <div class="asset-card">
        ${check(`sec:${i}`)}
        ${tile('防', 't5')}
        <div class="asset-body">
          <div class="asset-name mono">${b.batch}</div>
          <div class="asset-desc">${esc(b.source)}</div>
          <div class="asset-meta"><span><b>${b.count}</b> 条</span><span>${b.time}</span><span class="asset-actions">${dlBtn('sec', i)}</span></div>
        </div>
      </div>`).join('')}
    </div>`;
  const targetBlock = `
    <div class="asset-block-head">评测目标<span class="head-badge">${RES_MODELS.length + RES_AGENTS.length} 个已接入 · 大模型与智能体</span></div>
    <div class="asset-chips">
      ${RES_MODELS.map((m) => `<span class="asset-chip">${esc(m.name)}<span class="badge badge-primary">大模型</span></span>`).join('')}
      ${RES_AGENTS.map((a) => `<span class="asset-chip">${esc(a.name)}<span class="badge badge-olive">智能体</span></span>`).join('')}
    </div>`;
  const blocks = isAdmin
    ? [bankBlock, envBlock, traceBlock, secBlock, targetBlock]
    : [secBlock, traceBlock, envBlock, targetBlock];
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">资产中心</h2>
        <p class="page-desc">${isAdmin
          ? '平台资产总览 · 题库 / 靶场环境 / 轨迹与攻防数据集 / 评测目标，支持批量下载与管理'
          : '平台资产总览 · 重点展示安全攻防数据集 / 智能体轨迹数据集 / 靶场环境（评测题库仅管理员可见）'}</p>
      </div>
      <span class="badge ${UC_ROLES[role].badgeCls}">当前角色 ${role}</span>
    </div>
    <div class="stats-row five">
      ${stats.map(([label, num, sub]) => `<div class="card"><div class="card-sub">${label}</div><div class="stat-num">${num}</div><div class="card-sub" style="margin-top:6px">${sub}</div></div>`).join('')}
    </div>
    ${batchBar}
    ${blocks.join('')}
    ${isAdmin ? bankAdminHtml() : ''}
    <p class="mini-note res-note">资产由任务回流与训练合成持续沉淀${isAdmin ? ' · admin 可批量勾选数据集执行批量操作' : ' · 评测题库与批量操作仅 admin 可用'}${canDownload ? '' : ' · viewer 角色下载已禁用'}</p>
  </div>`;
  $$('[data-asset-dl]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const [kind, idx] = b.dataset.assetDl.split(':');
    const row = kind === 'bank'
      ? QUESTION_BANK_LIST[Number(idx)]
      : traceRow(DATA_BATCHES.slice(kind === 'trace' ? 0 : 3)[Number(idx)]);
    openDlPop(b, kind, row);
  }));
  $$('[data-env-go]').forEach((c) => c.addEventListener('click', () => { location.hash = '#/range'; }));
  if (isAdmin) {
    bindBankAdmin();
    const allKeys = () => [
      ...QUESTION_BANK_LIST.map((_, i) => `bank:${i}`),
      ...DATA_BATCHES.slice(0, 3).map((_, i) => `trace:${i}`),
      ...DATA_BATCHES.slice(3).map((_, i) => `sec:${i}`),
    ];
    const updateSel = () => {
      const n = assetSel.size;
      $('#asset-sel-count').textContent = `已选 ${n} 项`;
      $('#asset-batch-dl').disabled = n === 0;
      $('#asset-batch-manage').disabled = n === 0;
      $('#asset-sel-all').checked = n > 0 && n === allKeys().length;
    };
    $('#asset-sel-all').addEventListener('change', (e) => {
      assetSel.clear();
      if (e.target.checked) allKeys().forEach((k) => assetSel.add(k));
      renderAssets();
    });
    $$('[data-acheck]').forEach((c) => c.addEventListener('change', () => {
      if (c.checked) assetSel.add(c.dataset.acheck); else assetSel.delete(c.dataset.acheck);
      updateSel();
    }));
    $('#asset-batch-dl').addEventListener('click', () => {
      const items = [...assetSel].map((k) => {
        const [kind, i] = k.split(':');
        return kind === 'bank'
          ? { kind: '评测题库', ...QUESTION_BANK_LIST[Number(i)] }
          : { kind: kind === 'trace' ? '智能体轨迹数据集' : '安全攻防数据集', ...traceRow(DATA_BATCHES.slice(kind === 'trace' ? 0 : 3)[Number(i)]) };
      });
      downloadBlob(`assets-batch-${dlDate()}.json`, new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }));
      showToast(`已打包下载 ${items.length} 项资产清单 JSON`);
    });
    $('#asset-batch-manage').addEventListener('click', () => {
      showToast(`已提交 ${assetSel.size} 项资产的批量管理任务（归档 / 权限调整为演示示意）`);
    });
    updateSel();
  }
}

/* ════════════════════════════════════════════════════════════════
 * 资源中心 · 系统配置（平台参数 / 服务状态 / 计算资源 / 用户权限）
 * 配置项仅 admin 可编辑；保存 / 检查 / 修改权限均为演示示意
 * ════════════════════════════════════════════════════════════════ */
function statusTag(text) {
  const cls = ['正常', '运行中', '就绪', '已发布'].includes(text) ? 'dot-ok'
    : text === '已禁用' ? 'dot-bad' : 'dot-warn';
  return `<span class="env-status"><span class="dot ${cls}"></span>${text}</span>`;
}

function renderSystem() {
  const role = ucRole();
  const isAdmin = role === 'admin';
  const dis = isAdmin ? '' : 'disabled title="仅管理员可修改配置"';
  $('#view').innerHTML = `
  <div class="page">
    <div class="page-head-row">
      <div>
        <h2 class="page-title">系统配置</h2>
        <p class="page-desc">平台参数 / 服务状态 / 计算资源 / 用户权限 · 配置项仅管理员可编辑</p>
      </div>
      <span class="badge ${UC_ROLES[role].badgeCls}">当前角色 ${role}</span>
    </div>
    <div class="sys-grid">
      <div class="card sys-card">
        <h4>平台参数</h4>
        <div class="sys-row"><span class="k">默认并发上限</span><input class="select" style="width:110px" type="number" value="256" min="1" max="1024" ${dis}></div>
        <div class="sys-row"><span class="k">数据保留期</span><select class="select" style="width:110px" ${dis}><option>90 天</option><option selected>180 天</option><option>365 天</option></select></div>
        <div class="sys-row"><span class="k">告警阈值</span><select class="select" style="width:110px" ${dis}><option>60%</option><option selected>70%</option><option>80%</option></select></div>
        <div class="sys-row"><span class="k">会话超时</span><select class="select" style="width:110px" ${dis}><option>2 小时</option><option selected>8 小时</option><option>24 小时</option></select></div>
        <div class="sys-row"><span class="k">API 访问令牌</span><span class="mono small muted">aisr-••••••••-0727</span><button class="btn btn-ghost btn-sm" id="sys-token" ${dis}>轮换</button></div>
        <div style="margin-top:14px;text-align:right">
          <button class="btn btn-primary btn-sm" id="sys-save" ${dis}>保存配置</button>
        </div>
      </div>
      <div class="card sys-card">
        <h4>服务状态</h4>
        ${RES_SERVICES.map((s) => `
        <div class="sys-row"><span class="k">${s.name}</span>${statusTag(s.status)}<span class="small muted mono">uptime ${s.uptime}</span></div>`).join('')}
        <div style="margin-top:14px;text-align:right">
          <button class="btn btn-outline btn-sm" id="sys-check" ${role === 'viewer' ? 'disabled title="viewer 角色仅可查看"' : ''}>立即检查</button>
        </div>
      </div>
      <div class="card sys-card">
        <h4>计算资源</h4>
        ${RES_COMPUTE.map((c) => `
        <div class="sys-row">
          <span class="k">${c.name}</span>
          <span class="env-usage" style="flex:1.4"><span class="prog-track"><span class="prog-fill" style="width:${c.pct}%"></span></span><span class="pct">${c.pct}%</span></span>
          <span class="small muted mono">${c.detail}</span>
        </div>`).join('')}
      </div>
      <div class="card sys-card">
        <h4>用户与权限</h4>
        ${RES_USERS.map((u, i) => `
        <div class="sys-row">
          <span class="uc-avatar">${esc(u.name.slice(0, 1))}</span>
          <span class="k" style="flex:1"><span style="color:var(--foreground);font-weight:500">${esc(u.name)}</span> <span class="small muted mono">${esc(u.mail)}</span></span>
          <span class="badge ${UC_ROLES[u.role].badgeCls}">${u.role}</span>
          ${statusTag(u.status)}
          <button class="btn btn-ghost btn-sm" data-user-edit="${i}" ${isAdmin ? '' : 'disabled title="仅管理员可修改权限"'}>修改权限</button>
        </div>`).join('')}
        <p class="mini-note" style="margin-top:12px">角色即平台权限边界：admin 管理资产与用户，operator 创建并执行任务，viewer 只读查看结果。</p>
      </div>
    </div>
  </div>`;
  $('#sys-save') && $('#sys-save').addEventListener('click', () => showToast('配置已保存（演示）'));
  $('#sys-token') && $('#sys-token').addEventListener('click', () => showToast('令牌轮换为示意功能'));
  const check = $('#sys-check');
  if (check) check.addEventListener('click', () => showToast('检查完成：全部服务正常'));
  $$('[data-user-edit]').forEach((b) => b.addEventListener('click', () => {
    showToast(`修改「${RES_USERS[Number(b.dataset.userEdit)].name}」权限为示意功能`);
  }));
}

/* ══ 用户中心（示意：角色切换仅本地持久化，无权限控制）════════════════ */
const UC_ROLES = {
  admin:    { cn: '管理员', badgeCls: 'badge-primary' },
  operator: { cn: '操作员', badgeCls: '' },
  viewer:   { cn: '观察员', badgeCls: 'badge-olive' },
};
function ucRole() { const r = localStorage.getItem('aisr-user-role'); return UC_ROLES[r] ? r : 'operator'; }
function closeUserPop() {
  const pop = $('#user-pop');
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  $('#user-center-btn').setAttribute('aria-expanded', 'false');
}
function applyUserRole(r) {
  const role = UC_ROLES[r];
  const badge = $('#uc-role-badge');
  badge.textContent = r;
  badge.className = 'badge' + (role.badgeCls ? ' ' + role.badgeCls : '');
  $('#uc-pop-role').textContent = role.cn;
  $$('#uc-roles .uc-role-item').forEach((b) => b.classList.toggle('current', b.dataset.role === r));
}
function initUserCenter() {
  const btn = $('#user-center-btn'), pop = $('#user-pop');
  applyUserRole(ucRole());
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = pop.hidden;
    closeUserPop();
    if (willOpen) { pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closeUserPop);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeUserPop(); closeDlPop(); closeRgPops(); } });
  $$('#uc-roles .uc-role-item').forEach((b) => b.addEventListener('click', () => {
    localStorage.setItem('aisr-user-role', b.dataset.role);
    applyUserRole(b.dataset.role);
    closeUserPop();
  }));
  $('#uc-settings').addEventListener('click', () => { $('#uc-settings-note').hidden = false; });
}

/* ══ 启动 ═══════════════════════════════════════════════════════ */
$('#theme-toggle').addEventListener('click', toggleTheme);
$('#theme-icon').textContent = document.documentElement.classList.contains('dark') ? '◑' : '◐';
initSidebar();
initUserCenter();
window.addEventListener('hashchange', router);
/* 画布尺寸变化时关闭图内浮层（避免错位残留） */
window.addEventListener('resize', () => { closeRgPops(); hideTopoTip(); });
router();
