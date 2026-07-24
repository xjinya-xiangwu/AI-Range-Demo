/* ── 训练任务 · 合成流水线（独立功能胶囊）──────────────────────── */
'use strict';

(function initTrainingPipeline() {
  const formatter = new Intl.NumberFormat('en-US');
  const MAX_TOTAL = 8238;
  const OUTPUT_TARGETS = [3216, 1420, 2847, 487, 268];
  const INITIAL_OUTPUTS = [3162, 1390, 2810, 477, 261];
  const LANES = [
    {
      id: 'vulnerability', number: '01', name: '漏洞攻防全链', color: 'var(--chart-1)', seed: 187, concurrent: 128, flow: 1.05, cadence: 2, offset: 0, step: 1, bottleneck: 1, outputLabel: '已产出任务', outputType: '漏洞任务环境', shortOutput: '漏洞任务环境', detailKind: 'cve', detailTitle: '当前 CVE 变异队列',
      stages: [{ name: '漏洞采集', icon: '↓', base: 12 }, { name: '变异扩展', icon: '◇', base: 34 }, { name: 'PoC 生成', icon: '⚡', base: 18 }, { name: 'Exploit 构造', icon: '▶', base: 16 }, { name: 'Patch 合成', icon: '⌁', base: 15 }, { name: '验证绑定', icon: '□', base: 13 }],
      seeds: [{ name: 'CVE-2021-4034 · PwnKit', meta: '变体 × 28' }, { name: 'CVE-2023-32784 · KeePass', meta: '变体 × 19' }, { name: 'CVE-2022-22965 · Spring4Shell', meta: '变体 × 24' }, { name: 'CVE-2021-44228 · Log4Shell', meta: '变体 × 31' }], history: '2,48 14,42 26,47 38,31 50,36 62,24 74,29 86,14 98,19'
    },
    {
      id: 'enterprise', number: '02', name: '企业攻防链路', color: 'var(--chart-4)', seed: 98, concurrent: 64, flow: 1.75, cadence: 4, offset: 1, step: 1, bottleneck: 1, outputLabel: '已产出场景', outputType: '多主机攻击场景 · 多主机', shortOutput: '多主机攻击场景', detailKind: 'topology', detailTitle: '正在编排的网络拓扑',
      stages: [{ name: '攻击模板', icon: '↓', base: 11 }, { name: '拓扑编排', icon: '◈', base: 28 }, { name: '漏洞植入', icon: '▲', base: 13 }, { name: '路径规划', icon: '↗', base: 12 }, { name: '验证绑定', icon: '□', base: 10 }], history: '2,47 14,41 26,38 38,32 50,35 62,28 74,31 86,25 98,22'
    },
    {
      id: 'defense', number: '03', name: '蓝队安全运营', color: 'var(--chart-3)', seed: 312, concurrent: 256, flow: .88, cadence: 2, offset: 1, step: 2, bottleneck: 2, outputLabel: '已产出数据集', outputType: '标注检测数据集 · 高吞吐', shortOutput: '标注检测数据集', detailKind: 'ratio', detailTitle: '当前数据集流量分布',
      stages: [{ name: '流量采集', icon: '↓', base: 22 }, { name: '攻击注入', icon: '▶', base: 19 }, { name: '噪声混合', icon: '◎', base: 21 }, { name: '标签标注', icon: '⊞', base: 17 }, { name: '规则绑定', icon: '□', base: 15 }], history: '2,52 14,48 26,53 38,37 50,42 62,25 74,31 86,17 98,22'
    },
    {
      id: 'response', number: '04', name: '事件响应与修复', color: 'var(--chart-4)', seed: 64, concurrent: 32, flow: 2.45, cadence: 7, offset: 2, step: 1, bottleneck: 2, outputLabel: '已产出现场', outputType: '事故现场 · 高复杂度 · 12 步/任务', shortOutput: '事故现场快照', detailKind: 'evidence', detailTitle: '最复杂现场的证据层分布',
      stages: [{ name: '现场模板', icon: '↓', base: 8 }, { name: '攻击模拟', icon: '▶', base: 11 }, { name: '证据植入', icon: '◆', base: 18 }, { name: '快照生成', icon: '⊞', base: 9 }, { name: '验证绑定', icon: '□', base: 7 }], history: '2,53 14,45 26,38 38,34 50,29 62,22 74,17 86,14 98,9'
    },
    {
      id: 'ai', number: '05', name: 'AI 业务链安全', color: 'var(--chart-2)', seed: 42, concurrent: 24, flow: 2.15, cadence: 5, offset: 3, step: 1, bottleneck: 0, outputLabel: '已产出靶场', outputType: 'AI 靶场 · NEW · AI 原生', shortOutput: 'AI 原生靶场 · NEW', detailKind: 'decision', detailTitle: '正在构建的 AI 决策链',
      stages: [{ name: '业务建模', icon: '◈', base: 15 }, { name: '决策链构建', icon: '↗', base: 11 }, { name: '攻击面配置', icon: '▲', base: 9 }, { name: '防护层设置', icon: '⊕', base: 8 }, { name: '边界定义', icon: '□', base: 7 }], history: '2,54 14,48 26,42 38,38 50,29 62,25 74,19 86,15 98,11'
    }
  ];

  const state = { total: 8100, outputs: INITIAL_OUTPUTS.slice(), tick: 0, cursor: 0, flash: 0, lastLane: -1, speed: 2, paused: false, expanded: null };
  let root = null;
  let timer = null;

  function format(value) { return typeof value === 'number' ? formatter.format(value) : String(value); }
  function stageLoad(lane, stage, stageIndex) { return Math.max(3, stage.base + ((state.tick * (stageIndex + 2) + lane.seed) % 7) - 3); }
  function stageProgress(lane, stageIndex) {
    if (lane.bottleneck === stageIndex) return Math.min(97, 86 + ((state.tick + lane.seed) % 10));
    return Math.min(96, 58 + ((state.tick * 7 + stageIndex * 11 + lane.seed) % 30));
  }
  function rateBars(laneIndex) { return [7, 12, 9, 15, 11, 16, 8, 14].map((base, index) => Math.max(3, Math.min(17, base + ((state.tick * (laneIndex + 1) + index * 3) % 5) - 2))); }
  function flowMarkup(lane, stageIndex) {
    const duration = lane.flow / state.speed;
    const dotCount = stageIndex === lane.bottleneck - 1 ? 4 : stageIndex === lane.bottleneck ? 2 : 3;
    const cls = 'tp-flow' + (stageIndex === lane.bottleneck ? ' is-after-backlog' : '') + (state.paused ? ' is-paused' : '');
    return `<div class="${cls}" style="--lane:${lane.color};--flow-duration:${duration.toFixed(2)}s" aria-hidden="true">${Array.from({ length: dotCount }, (_, index) => `<i class="tp-flow-dot" style="animation-delay:${(-duration * index / dotCount).toFixed(2)}s;opacity:${1 - index * .16}"></i>`).join('')}</div>`;
  }
  function stageMarkup(lane, stage, index) {
    const backlog = lane.bottleneck === index;
    return `<div class="tp-stage${backlog ? ' is-backlog' : ''}"><div class="tp-stage-head"><span class="tp-stage-icon">${stage.icon}</span><span class="tp-stage-name">${stage.name}</span></div><span class="tp-stage-count">处理中 ${stageLoad(lane, stage, index)}</span><span class="tp-stage-progress"><i style="width:${stageProgress(lane, index)}%"></i></span></div>`;
  }
  function detailContent(lane) {
    if (lane.detailKind === 'cve') return `<div class="tp-seeds">${lane.seeds.map((seed, index) => { const progress = 32 + ((state.tick * 9 + index * 17 + lane.seed) % 61); return `<div class="tp-seed"><div><span class="tp-seed-name">${seed.name}</span><span class="tp-seed-stage">${seed.meta}</span></div><span class="tp-seed-progress"><i style="width:${progress}%"></i></span></div>`; }).join('')}</div>`;
    if (lane.detailKind === 'topology') return `<div class="tp-detail-flow">${['入口', 'DMZ', 'Web ×2', '域控', '数据库', '目标'].map((item, index) => `<span>${item}</span>${index < 5 ? '<i>→</i>' : ''}`).join('')}</div>`;
    if (lane.detailKind === 'ratio') return `<div class="tp-ratio"><svg viewBox="0 0 42 42" aria-label="攻击与正常流量比例"><circle class="tp-ratio-rest" cx="21" cy="21" r="15.9"></circle><circle class="tp-ratio-active" cx="21" cy="21" r="15.9"></circle></svg><div><b>攻击流量 18%</b><span>正常流量 82% · 分布校验中</span></div></div>`;
    if (lane.detailKind === 'evidence') return `<div class="tp-evidence">${[['日志', '32%'], ['文件', '26%'], ['网络', '24%'], ['内存', '18%']].map(([name, value]) => `<div><b>${name}</b><span>${value}</span></div>`).join('')}</div>`;
    return `<div class="tp-detail-flow">${['LLM', '规划 Agent', 'API / 数据库', '业务执行'].map((item, index) => `<span>${item}</span>${index < 3 ? '<i>→</i>' : ''}`).join('')}</div>`;
  }
  function laneMarkup(lane, index) {
    const process = lane.stages.map((stage, stageIndex) => `${stageMarkup(lane, stage, stageIndex)}${stageIndex < lane.stages.length - 1 ? flowMarkup(lane, stageIndex) : ''}`).join('');
    const output = state.outputs[index];
    const outputProgress = Math.round(output / OUTPUT_TARGETS[index] * 100);
    const detail = state.expanded === index ? `<div class="tp-lane-detail" style="--lane:${lane.color}"><div><p class="tp-detail-title">${lane.detailTitle}</p>${detailContent(lane)}</div><div class="tp-history"><div class="tp-history-head"><span>最近 30 分钟吞吐</span><span>产出 / min</span></div><svg viewBox="0 0 100 62" preserveAspectRatio="none" aria-label="${lane.name}吞吐曲线"><line class="tp-history-grid" x1="0" y1="15" x2="100" y2="15"></line><line class="tp-history-grid" x1="0" y1="39" x2="100" y2="39"></line><polyline class="tp-history-line" points="${lane.history}"></polyline></svg><span class="tp-history-note">${lane.stages[lane.bottleneck].name} 是当前工程瓶颈</span></div></div>` : '';
    return `<article class="tp-lane is-${lane.stages.length}${lane.stages.length === 6 ? ' is-six' : ''}${state.expanded === index ? ' is-expanded' : ''}${state.paused ? ' is-paused' : ''}" style="--lane:${lane.color};--lane-pulse:${(lane.flow * 1.8).toFixed(2)}s"><button class="tp-lane-label" type="button" data-tp-lane="${index}" aria-expanded="${state.expanded === index}"><span class="tp-lane-number">${lane.number}</span><span><b class="tp-lane-name">${lane.name}</b><small class="tp-lane-output-type">${lane.shortOutput}</small><span class="tp-lane-meta"><i class="tp-lane-status"></i><span>种子 ${lane.seed}</span><span>× ${lane.concurrent} 并发</span></span></span><span class="tp-lane-toggle" aria-hidden="true">+</span></button><div class="tp-process">${process}</div><div class="tp-output"><span class="tp-output-label">${lane.outputLabel}</span><b class="tp-output-value${state.lastLane === index ? ' is-bumping' : ''}">${format(output)}</b><div class="tp-rate-bars">${rateBars(index).map((height) => `<i style="height:${height}px"></i>`).join('')}</div><span class="tp-output-queue">${lane.outputType} · ${outputProgress}%</span></div>${detail}</article>`;
  }
  function metricMarkup(label, value, note, live, bump) { return `<section class="tp-metric${live ? ' is-live' : ''}"><div class="tp-metric-label">${label}</div><div class="tp-metric-value${live ? ' is-live' : ''}${bump ? ' is-bumping' : ''}">${value}</div><p class="tp-metric-note">${note}</p></section>`; }
  function render() {
    if (!root) return;
    const concurrent = 504 + Math.round(Math.sin(state.tick * .9) * 14 + Math.cos(state.tick * .43) * 6);
    root.innerHTML = `<main class="training-pipeline" aria-label="攻防训练任务合成流水线"><div class="tp-frame"><header class="tp-header"><div><p class="tp-eyebrow"><i class="tp-live-dot"></i>training synthesis fabric · demo live</p><h1 class="tp-title">训练任务 · 合成流水线</h1></div><div class="tp-controls"><span class="tp-control-label">演示速度</span><div class="tp-speed-control">${[1, 2, 5].map((speed) => `<button type="button" class="tp-speed${state.speed === speed ? ' is-active' : ''}" data-tp-speed="${speed}">${speed}×</button>`).join('')}</div><button type="button" class="tp-pause${state.paused ? ' is-paused' : ''}" data-tp-pause>${state.paused ? '▶ 恢复流水线' : 'Ⅱ 暂停流水线'}</button></div></header><section class="tp-metrics" aria-label="全局产能指标">${metricMarkup('种子总量', '703', '5 类训练资产的原始种子')}${metricMarkup('合成任务（累计）', format(state.total), `持续增长 · 目标 ${format(MAX_TOTAL)}`, true, state.flash > 0)}${metricMarkup('活跃线路', '5 / 5', '5 条异构生产链并发运行')}${metricMarkup('当前并发容器', `${concurrent} / 1,024`, '5 类任务按重量弹性调度')}${metricMarkup('靶场类型', '5 类', '23 种子任务 · 从环境到数据集')}</section><section class="tp-pipeline-section" aria-labelledby="pipeline-title"><div class="tp-section-heading"><h2 id="pipeline-title">多靶场数据生产</h2><p>${state.paused ? '所有流动动画已暂停 · 可展开线路查看细节' : '实时运转中 · 每条线路使用独立的生产逻辑'}</p></div><div class="tp-pipeline-scroll"><div class="tp-pipeline">${LANES.map(laneMarkup).join('')}</div></div></section><section class="tp-bottom" aria-labelledby="output-title"><div class="tp-bottom-heading"><h2 id="output-title">实时产出汇总</h2><span>5 类训练资产 · 按生产逻辑独立归档</span></div><div class="tp-output-summary">${LANES.map((lane, index) => `<article class="tp-summary-card" style="--lane:${lane.color}"><span class="tp-summary-name">${lane.name}</span><b class="tp-summary-value${state.lastLane === index ? ' is-bumping' : ''}">${format(state.outputs[index])}</b><div class="tp-summary-bar"><i style="width:${Math.round(state.outputs[index] / OUTPUT_TARGETS[index] * 100)}%"></i></div><span class="tp-summary-note">${lane.outputType}</span></article>`).join('')}</div><div class="tp-total"><strong>合计: ${format(state.total)} 个差异化训练资产</strong><span class="tp-amplify">703 种子 → 8,238 产出 · 环境 / 场景 / 数据 / 靶场</span></div><div class="tp-trajectory"><b>轨迹沉淀</b><i></i><span>214,720 条</span><i></i><span>23 个行为维度</span><i></i><span>8.4 步 / 条</span><i></i><span>可用于 SFT / RL 训练</span></div><p class="tp-boundary"><b>预置演示态势。</b> 展示合成能力与运行节奏，不连接真实集群、训练调度或攻击环境。</p></section></div></main>`;
    bind();
  }
  function bind() {
    root.querySelectorAll('[data-tp-speed]').forEach((button) => button.addEventListener('click', () => { state.speed = Number(button.dataset.tpSpeed); render(); start(); }));
    root.querySelector('[data-tp-pause]').addEventListener('click', () => { state.paused = !state.paused; render(); start(); });
    root.querySelectorAll('[data-tp-lane]').forEach((button) => button.addEventListener('click', () => { const index = Number(button.dataset.tpLane); state.expanded = state.expanded === index ? null : index; render(); }));
  }
  function advance() {
    state.tick += 1;
    if (state.total >= MAX_TOTAL) { state.lastLane = -1; render(); return; }
    const eligible = LANES.map((lane, index) => ({ lane, index })).filter(({ lane, index }) => state.outputs[index] < OUTPUT_TARGETS[index] && (state.tick + lane.offset) % lane.cadence === 0);
    if (!eligible.length) { state.lastLane = -1; render(); return; }
    const picked = eligible.find(({ index }) => index >= state.cursor) || eligible[0];
    const { lane, index } = picked;
    const increment = Math.min(lane.step + (lane.id === 'defense' && state.tick % 5 === 0 ? 1 : 0), OUTPUT_TARGETS[index] - state.outputs[index], MAX_TOTAL - state.total);
    state.outputs[index] += increment; state.total += increment; state.cursor = (index + 1) % LANES.length; state.flash += 1; state.lastLane = index;
    render();
  }
  function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
  function start() { stop(); if (!state.paused && state.total < MAX_TOTAL) timer = window.setInterval(advance, Math.max(520, Math.round(2200 / state.speed))); }
  function mount(element) { stop(); root = element; render(); start(); }
  function unmount() { stop(); root = null; }

  window.TrainingPipeline = Object.freeze({ mount, unmount });
}());
