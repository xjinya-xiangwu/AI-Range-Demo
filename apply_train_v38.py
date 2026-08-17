# -*- coding: utf-8 -*-
"""训练模块 V3.8：实时监控改为任务详情弹窗；去导航入口；去 Checkpoint 条；任务信息+hparams 合并；已完成任务加导出按钮"""
import io

def load(p):
    with io.open(p, encoding="utf-8", newline="") as f: return f.read()
def save(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f: f.write(s)
def rep(s, old, new, tag, count=1):
    n = s.count(old)
    if n == 0 and "\r\n" in s:
        old, new = old.replace("\n", "\r\n"), new.replace("\n", "\r\n")
        n = s.count(old)
    assert n == count, f"[{tag}] 期望 {count} 处，实际 {n} 处"
    print(f"[OK] {tag} ({n})")
    return s.replace(old, new)

# ════════════ index.html：去导航「实时监控」 ════════════
ip = "index.html"; h = load(ip)
if "training-live" in h:
    h = rep(h, """            <a href="#/training-live" data-route="training-live"><span class="sb-label">实时监控</span></a>\n""", "", "导航去实时监控")
    save(ip, h)
else:
    print("[SKIP] 导航已是新版")

# ════════════ styles.css：超宽弹窗 ════════════
cp = "styles.css"; c = load(cp)
if ".modal.xwide" not in c:
    c = rep(c, ".modal.wide { width: min(760px, calc(100vw - 48px)); }",
               ".modal.wide { width: min(760px, calc(100vw - 48px)); }\n.modal.xwide { width: min(1400px, calc(100vw - 48px)); }", "xwide弹窗样式")
    save(cp, c)
else:
    print("[SKIP] xwide 样式已存在")

# ════════════ app.js ════════════
ap = "app.js"; a = load(ap)

# 1. openModal 支持自定义宽度类
a = rep(a, """  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal${wide ? ' wide' : ''}" role="dialog"><button class="modal-x" data-x aria-label="关闭">✕</button>${html}</div>`;""",
"""  const wcls = wide === true ? ' wide' : wide ? ' ' + wide : '';
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal${wcls}" role="dialog"><button class="modal-x" data-x aria-label="关闭">✕</button>${html}</div>`;""", "openModal宽度类")

# 2. NAV_OF：training-live 高亮任务中心
a = rep(a, "training: 'training', 'training-live': 'training-live', models: 'models',",
           "training: 'training', 'training-live': 'training', models: 'models',", "NAV_OF高亮")

# 3. 重写 renderTrainingLive → 任务中心 + 任务详情弹窗
m_start = "/* ════════════════════════════════════════════════════════════════\n * 页面 · 训练场 · 实时监控"
m_end = "/* ════════════════════════════════════════════════════════════════\n * 页面 · 实战演练场"
if m_start not in a: m_start = m_start.replace("\n", "\r\n")
if m_end not in a: m_end = m_end.replace("\n", "\r\n")
i1, i2 = a.find(m_start), a.find(m_end)
assert 0 < i1 < i2, "实时监控代码段定位失败"
print("[OK] 实时监控代码段定位")

NEW_LIVE = '''/* ════════════════════════════════════════════════════════════════
 * 训练场 · 任务详情（实时监控弹窗 · TR-03~06 · wandb 风，全 Mock）
 * 不作为独立导航页：#/training-live = 训练任务中心 + 详情弹窗
 * ════════════════════════════════════════════════════════════════ */
let tlModalIv = null;
function stopTlModal() { if (tlModalIv) { clearInterval(tlModalIv); tlModalIv = null; } }
function renderTrainingLive() {
  renderTraining();
  openTrainingLiveModal();
}
function openTrainingLiveModal() {
  let lastGroup = '';
  const t = trnState.tasks.find((x) => x.id === 'TRN-2026-0413') || trnState.tasks[0];
  const infoRows = [
    ['TRN_ID', t.id], ['任务类型', t.type], ['训练数据集', t.dataset],
    ['GPU 资源', t.gpu], ['创建时间', t.created],
    ['当前进度', `${t.progress}% · step ${t.step.toLocaleString()} / ${t.totalStep.toLocaleString()}`],
  ];
  openModal(`
    <div class="modal-title serif">任务详情 · ${t.id} ${esc(t.name)} ${helpTip('运行中训练任务的详情与实时面板：任务详情信息（含超参数）、12 项标量曲线（训练效果 / 数据质量 / 稳定性 / 效率四类）、终端日志流与 GPU 集群监控，数据约 2 秒刷新一次。')}</div>
    <div class="modal-sub">${t.type} · ${TRN_STATUS_CN[t.status] || ''} · <span style="color:var(--chart-3)"><span class="live-dot"></span> 数据流实时推送中 · 2s</span></div>
    <div class="modal-body">
      <div class="card" style="margin:0">
        <div class="card-sub" style="margin-bottom:10px">任务详情信息</div>
        <div class="hp-grid">${infoRows.concat(TRN_HPARAMS).map(([k, v]) => `<div class="dc-kv"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}</div>
      </div>
      <div class="scalar-grid">
        ${TRN_SCALARS.map((s, i) => {
          const head = s.group !== lastGroup ? `<div class="scalar-group">${s.group}</div>` : '';
          lastGroup = s.group;
          const vals = tlState.series[i];
          return head + `<div class="card scalar-card">
            <div class="sc-name">${s.name}</div>
            <div class="sc-val" id="tl-val-${i}">${vals[vals.length - 1].toFixed(s.digits)}</div>
            <span id="tl-chart-${i}">${tlSpark(vals, 'var(--chart-1)')}</span>
          </div>`;
        }).join('')}
      </div>
      <div>
        <div class="history-head">GPU 集群监控 · 8×H100<span class="head-badge">秒级刷新样式</span></div>
        <div class="gpu-grid">
          ${tlState.gpu.map((g, i) => `
          <div class="card gpu-cell" id="tlgpu-${i}">
            <div class="g-name">H100-${i} · 利用率</div><div class="g-val">${Math.round(g.util)}%</div>
            <div class="g-track"><div class="g-fill" style="width:${g.util}%"></div></div>
            <div class="g-name" style="margin-top:4px">温度 <span class="gt">${Math.round(56 + g.util / 5)}°C</span> · 功耗 <span class="gw">${Math.round(380 + g.util * 3.2)}W</span></div>
          </div>`).join('')}
        </div>
        <p class="mini-note" style="margin:8px 0 0">磁盘 IO <b class="mono" id="tl-io">2.8 GB/s</b> · 网络吞吐 <b class="mono">1.6 GB/s</b> · 资源组 H100-Pool-A</p>
      </div>
      <div>
        <div class="history-head">终端日志流</div>
        <div class="log-stream" id="tl-logs"></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-primary" id="tl-back">← 返回任务中心</button>
    </div>`, 'xwide');

  if (!tlState.logs.length) for (let i = 0; i < 8; i++) { tlState.logs.push(tlLogLine()); }
  $('#tl-logs').innerHTML = tlState.logs.map((l) => `<div>${esc(l)}</div>`).join('');

  $('#tl-back').addEventListener('click', () => { stopTlModal(); closeModal(); });
  $('[data-close]').addEventListener('click', stopTlModal);
  $('[data-x]').addEventListener('click', stopTlModal);

  stopTlModal();
  tlModalIv = every(() => {
    tlState.step += 40 + Math.floor(Math.random() * 30);
    TRN_SCALARS.forEach((s, i) => {
      const arr = tlState.series[i];
      let nv = arr[arr.length - 1] + s.drift + (Math.random() - 0.5) * 2 * s.jitter;
      if (s.min !== undefined) nv = Math.max(s.min, nv);
      if (s.max !== undefined) nv = Math.min(s.max, nv);
      arr.push(nv);
      if (arr.length > 90) arr.shift();
      const v = $('#tl-val-' + i); if (v) v.textContent = arr[arr.length - 1].toFixed(s.digits);
      const c = $('#tl-chart-' + i); if (c) c.innerHTML = tlSpark(arr, 'var(--chart-1)');
    });
    tlState.gpu.forEach((g, i) => {
      g.util = Math.max(30, Math.min(97, g.util + (Math.random() - 0.5) * 8));
      const cell = $('#tlgpu-' + i);
      if (cell) {
        cell.querySelector('.g-val').textContent = Math.round(g.util) + '%';
        cell.querySelector('.g-fill').style.width = g.util + '%';
        cell.querySelector('.gt').textContent = Math.round(56 + g.util / 5) + '°C';
        cell.querySelector('.gw').textContent = Math.round(380 + g.util * 3.2) + 'W';
      }
    });
    const io = $('#tl-io'); if (io) io.textContent = (2 + Math.random() * 1.8).toFixed(1) + ' GB/s';
    tlState.logs.push(tlLogLine());
    if (tlState.logs.length > 10) tlState.logs.shift();
    const lg = $('#tl-logs'); if (lg) lg.innerHTML = tlState.logs.map((l) => `<div>${esc(l)}</div>`).join('');
  }, 2000);
}

'''
a = a[:i1] + NEW_LIVE + a[i2:]

# 4. 运行中任务「实时监控」按钮改开弹窗（活跃版 renderTraining）
a = rep(a, """    if (act === 'stop') { t.status = 'done'; t.pinned = false; showToast(`${t.id} 已终止废弃`); renderTraining(); }
    else if (act === 'live') location.hash = '#/training-live';""",
"""    if (act === 'stop') { t.status = 'done'; t.pinned = false; showToast(`${t.id} 已终止废弃`); renderTraining(); }
    else if (act === 'live') openTrainingLiveModal();
    else if (act === 'expd' || act === 'expm') showToast('数据导出功能开发中');""", "任务操作分发", count=2)

# 5. 已完成任务：导出数据集 / 导出模型 按钮
a = rep(a, """          <td style="text-align:right;white-space:nowrap">
            <span class="mini-note" style="margin:0">已归档</span>
          </td>""",
"""          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-outline btn-sm" data-trn="expd:${i}">导出数据集</button>
            <button class="btn btn-outline btn-sm" data-trn="expm:${i}">导出模型</button>
          </td>""", "已完成任务导出按钮")

# 6. helpTip 更新
a = rep(a, "置顶的演示任务与态势感知首页的训练面板同源，点击「实时监控」可查看训练大屏；",
           "置顶的演示任务与态势感知首页的训练面板同源，点击运行中任务的「实时监控」弹出任务详情与训练大屏；", "helpTip更新")

save(ap, a)
print("\nV3.8 改造完成")
