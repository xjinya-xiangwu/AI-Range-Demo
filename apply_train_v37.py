# -*- coding: utf-8 -*-
"""训练模块改造：创建向导 6 步重构 + 监控页数值真实化 + RL 真实日志（依据 训练模块.md 与 wandb 截图）"""
import io, sys

ROOT = r"C:\Users\xujinya\Documents\AI LAB\AI攻防平台\文档\AI-Range-Demo"

def load(p):
    with io.open(p, encoding="utf-8", newline="") as f:
        return f.read()

def save(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)

def rep(s, old, new, tag, count=1):
    n = s.count(old)
    if n == 0 and "\r\n" in s:  # 文件为 CRLF，检索串转为 CRLF 再试
        old, new = old.replace("\n", "\r\n"), new.replace("\n", "\r\n")
        n = s.count(old)
    assert n == count, f"[{tag}] 期望 {count} 处，实际 {n} 处"
    print(f"[OK] {tag} ({n})")
    return s.replace(old, new)

# ════════════════════════════ data.js ════════════════════════════
dp = ROOT + r"\data.js"
d = load(dp)

if "rollout/raw_reward" in d:
    print("[SKIP] data.js 已应用过改造")
else:
    d = rep(d, """const TRN_SCALARS = [
  { group: '训练效果',   name: 'raw_reward',       base: 0.42, drift: 0.004, jitter: 0.05, digits: 3 },
  { group: '训练效果',   name: 'truncated_ratio',  base: 0.18, drift: -0.002, jitter: 0.02, digits: 3 },
  { group: '训练效果',   name: 'response_len',     base: 486,  drift: 1.2,   jitter: 26,  digits: 0 },
  { group: '数据质量',   name: 'fetched/reward',   base: 1204, drift: 3.1,   jitter: 60,  digits: 0 },
  { group: '数据质量',   name: 'used/reward',      base: 862,  drift: 2.4,   jitter: 44,  digits: 0 },
  { group: '训练稳定性', name: 'ppo_kl',           base: 0.045, drift: -0.0004, jitter: 0.012, digits: 4 },
  { group: '训练稳定性', name: 'pg_clipfrac',      base: 0.12, drift: -0.001, jitter: 0.03, digits: 3 },
  { group: '训练稳定性', name: 'entropy_loss',     base: 0.68, drift: -0.003, jitter: 0.06, digits: 3 },
  { group: '训练效率',   name: 'wait_time_ratio',  base: 0.09, drift: -0.0008, jitter: 0.02, digits: 3 },
  { group: '训练效率',   name: 'train_wait_time',  base: 2.4,  drift: -0.01, jitter: 0.5, digits: 2 },
  { group: '训练效率',   name: 'train_time',       base: 8.6,  drift: 0.005, jitter: 0.4, digits: 2 },
  { group: '训练效率',   name: 'step_time',        base: 11.0, drift: -0.004, jitter: 0.6, digits: 2 },
];""",
"""const TRN_SCALARS = [
  { group: '训练效果',   name: 'rollout/raw_reward',      base: 0.31,  drift: 0.006,   jitter: 0.09,  digits: 3 },
  { group: '训练效果',   name: 'rollout/truncated_ratio', base: 0.17,  drift: -0.0018, jitter: 0.035, digits: 3 },
  { group: '训练效果',   name: 'rollout/response_len',    base: 496,   drift: 0.6,     jitter: 58,   digits: 0 },
  { group: '数据质量',   name: 'fetched/reward',          base: 0.44,  drift: 0.002,   jitter: 0.12,  digits: 3 },
  { group: '数据质量',   name: 'used/reward',             base: 0.51,  drift: 0.003,   jitter: 0.15,  digits: 3 },
  { group: '训练稳定性', name: 'train/ppo_kl',            base: 0.032, drift: -0.0002, jitter: 0.011, digits: 4 },
  { group: '训练稳定性', name: 'train/pg_clipfrac',       base: 0.11,  drift: -0.0006, jitter: 0.04,  digits: 3 },
  { group: '训练稳定性', name: 'train/entropy_loss',      base: 0.71,  drift: -0.004,  jitter: 0.05,  digits: 3 },
  { group: '训练效率',   name: 'perf/wait_time_ratio',    base: 0.11,  drift: -0.0006, jitter: 0.03,  digits: 3 },
  { group: '训练效率',   name: 'perf/train_wait_time',    base: 2.6,   drift: -0.008,  jitter: 0.6,   digits: 2 },
  { group: '训练效率',   name: 'perf/train_time',         base: 8.9,   drift: 0.004,   jitter: 0.5,   digits: 2 },
  { group: '训练效率',   name: 'perf/step_time',          base: 11.5,  drift: -0.003,  jitter: 0.7,   digits: 2 },
];""", "TRN_SCALARS 真实化")

    d = rep(d, """const TRN_HPARAMS = [
  ['基座模型', '自研 v2.2'], ['算法框架', '自研 RL 框架'], ['训练类型', 'RL 强化学习'],
  ['数据集', 'ExploitGym 轨迹 3.6 万'], ['并行策略', '8×H100 · DP4/TP2'], ['精度', 'bf16'],
  ['梯度裁剪', 'max_norm 1.0'], ['保存策略', '每 2h · SHA256 校验'],
];""",
"""const TRN_HPARAMS = [
  ['基座模型', '自研 v2.2'], ['算法框架', '自研 RL 框架'], ['RL 算法', 'GRPO'],
  ['训练类型', 'RL 强化学习'], ['数据集', 'ExploitGym 轨迹 3.6 万'], ['精度', 'bf16'],
  ['LR', '1e-6'], ['EPS_CLIP', '0.2'], ['RL_EPOCH', '1000'],
  ['GLOBAL_BATCH_SIZE', '512'], ['GROUP_SIZE', '8'], ['MAX_TOKENS_PER_GPU', '5000'],
  ['SGLANG_MEM_STATIC', '0.45'], ['ROLLOUT_NUM_GPUS', '3'], ['ACTOR_GPUS_PER_NODE', '1'],
  ['保存策略', '每 2h · SHA256 校验'],
];""", "TRN_HPARAMS 重构")

    d = rep(d, """const TRN_LOG_POOL = [
  '[rollout] step {s} · batch 256 · raw_reward {r}',
  '[train] ppo_epoch 4/4 · kl {k} · clipfrac {c}',
  '[fetch] ExploitGym 轨迹回流 +128 条 · 已去重',
  '[ckpt] 自动保存 checkpoint-step-{s} · SHA256 校验通过',
  '[eval] 在线探测 Cybench 子集 · pass@1 0.61',
  '[sched] GPU 资源组 H100-Pool-A 心跳正常 · 利用率 {u}%',
];""",
"""const TRN_LOG_POOL = [
  'step:{s} | rollout/raw_reward:{r} | rollout/truncated_ratio:0.142 | rollout/response_len/mean:498 | rollout/response_len/max:1204',
  'step:{s} | train/ppo_kl:{k} | train/pg_clipfrac:{c} | train/entropy_loss:0.612 | train/grad_norm:0.87',
  'step:{s} | perf/step_time:11.42s | perf/train_time:8.76s | perf/train_wait_time:2.31s | perf/wait_time_ratio:0.203',
  '[rollout] global_batch_size 512 · group_size 8 · max_tokens_per_gpu 5000 · sglang mem_fraction_static 0.45',
  '[train] actor update · algo GRPO · lr 1e-6 · eps_clip 0.2 · advantage estimator GAE',
  '[ckpt] save checkpoint step {s} → /mnt/shared-storage/checkpoints/qwen3.5-9b-grpo/step_{s} · SHA256 ok',
  '[fetch] trajectory buffer +512 · dedup done · fetched/reward mean 0.47',
  '[sched] H100-Pool-A heartbeat ok · rollout 3 GPUs · actor 1 GPU/node · util {u}%',
];""", "TRN_LOG_POOL 真实RL日志")

    d = rep(d, "{ name: '训练配置', desc: '5 步向导完成基座 / 算法 / 超参 / 资源配置，提交后进入调度队列。' },",
                "{ name: '训练配置', desc: '6 步向导完成基座 / 算法 / 资源 / 超参配置，提交后进入调度队列。' },", "流水线·6步")

    d = rep(d, "{ name: '训练执行', desc: '调度器分配 8×H100 资源组执行训练，过程仅可暂停 / 终止，不可修改。' },",
                "{ name: '训练执行', desc: '调度器分配 8×H100 资源组执行训练，过程仅可终止，不可修改。' },", "流水线·去暂停")

    save(dp, d)

# ════════════════════════════ app.js ════════════════════════════
ap = ROOT + r"\app.js"
a = load(ap)

# --- A1. 向导整体重写（openTrainingWizard + renderTwiz） ---
old_start = "/* ── TR-01 · 5 步创建向导（全 Mock 可提交）────────────────────── */"
old_end = "/* ════════════════════════════════════════════════════════════════\n * 页面 · 训练场 · 实时监控"
if old_start not in a:
    old_start = old_start.replace("\n", "\r\n")
if old_end not in a:
    old_end = old_end.replace("\n", "\r\n")
i1 = a.find(old_start)
i2 = a.find(old_end)
assert i1 > 0 and i2 > i1, "向导代码段定位失败"
print("[OK] 向导代码段定位", i1, i2)

NEW_WIZARD = '''/* ── TR-01 · 6 步创建向导（全 Mock 可提交）────────────────────── */
/* 用户可感知 RL 超参数（变量名 / 中文名 / 默认值 / 调优方向），依据资源设置 */
const TRN_HP_DEFS = [
  ['LR', '学习率', '1e-6', 'RL 学习率通常极小；训练不稳定（loss 爆炸）降至 5e-7，收敛太慢升至 2e-6'],
  ['EPS_CLIP', '梯度裁剪', '0.2', '标准值；策略更新太激进导致崩坏，可降至 0.1'],
  ['RL_EPOCH', '训练轮次', '1000', '总训练轮数；第一次测试可以先跑 50 轮看效果，再改回去'],
  ['RL_GLOBAL_BATCH_SIZE', '全局训练样本总数', '512', '默认 512；显存不足改为 256 或 128'],
  ['RL_GROUP_SIZE', 'group size', '8', '默认 8；显存不足改为 4'],
  ['MAX_TOKENS_PER_GPU', '单卡最大 Token 数', '5000', '默认 5000；24G 卡建议改为 3000 甚至 2048'],
  ['SGLANG_MEM_FRACTION_STATIC', '推理引擎显存占用比例', '0.45', '默认 0.45（45%）；采样时频繁 OOM，降至 0.35'],
  ['ROLLOUT_NUM_GPUS', 'rollout GPU 数量', '3', '用来 rollout 的 GPU 数量'],
  ['ACTOR_NUM_GPUS_PER_NODE', '训练 GPU 数量', '1', '用来训练的 GPU 数量（每节点）'],
];
const TRN_RL_ALGOS = ['GRPO', 'PPO', 'GSPO'];
let trnWiz = null;
function openTrainingWizard() {
  trnWiz = {
    step: 1,
    cfg: {
      name: 'TRN-2026-0415 渗透链智能体 RL 训练', priority: 'P1 高', type: 'RL 强化学习', desc: '',
      dataset: TRN_DATASETS[0], benchmarks: ['ExploitGym'], split: '8 : 2',
      base: '自研 v2.2', framework: '自研 RL 框架', rlAlgo: 'GRPO', finetune: 'LoRA（推荐）',
      gpu: '8×H100', duration: '24 小时',
      hp: Object.fromEntries(TRN_HP_DEFS.map(([k, , dft]) => [k, dft])),
    },
  };
  openModal(`
    <div class="modal-title serif">新建训练任务</div>
    <div class="modal-sub">6 步创建向导 · 提交后进入调度队列</div>
    <div class="modal-body">
      <div class="steps-bar" id="tw-steps" style="margin-bottom:16px"></div>
      <div id="tw-body"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-secondary" id="tw-cancel">取消</button>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" id="tw-back">← 上一步</button>
      <button class="btn btn-primary" id="tw-next">下一步</button>
    </div>`, true);
  $('#tw-cancel').addEventListener('click', closeModal);
  $('#tw-back').addEventListener('click', () => { if (trnWiz.step > 1) { trnWiz.step -= 1; renderTwiz(); } });
  $('#tw-next').addEventListener('click', () => {
    if (trnWiz.step < 6) { trnWiz.step += 1; renderTwiz(); return;
    }
    /* 提交（Mock） */
    const c = trnWiz.cfg;
    trnState.tasks.unshift({
      id: 'TRN-2026-0415', name: c.name.replace(/^TRN-2026-0415\\s*/, ''), type: c.type, status: 'queued',
      dataset: c.dataset.split('（')[0],
      goal: c.desc || `基座 ${c.base} · ${c.framework === '自研 RL 框架' ? c.rlAlgo : c.framework} · ${c.benchmarks.join(' / ')} 门禁回归`,
      gpu: c.gpu, progress: 0, step: 0,
      totalStep: (parseInt(c.hp.RL_EPOCH, 10) || 1000) * 60,
      created: '2026-08-04 ' + fmtClock(new Date()).slice(0, 5), pinned: false,
    });
    closeModal();
    showToast('✓ 训练任务已提交，进入调度队列');
    if (parseHash().route === 'training') renderTraining();
  });
  renderTwiz();
}
function renderTwiz() {
  const c = trnWiz.cfg, s = trnWiz.step;
  $('#tw-steps').innerHTML = ['基本信息', '数据与基准', '模型与算法', '资源', '超参数', '确认提交'].map((l, i) =>
    `<div class="step-item ${s > i + 1 ? 'done' : s === i + 1 ? 'current' : 'todo'}"><span class="step-no">${s > i + 1 ? '✓' : i + 1}</span>${l}</div>`).join('<span class="step-sep">→</span>');
  $('#tw-back').style.visibility = s === 1 ? 'hidden' : '';
  $('#tw-next').textContent = s === 6 ? '确认提交' : '下一步';
  const field = (label, inner) => `<div class="wz-field"><span class="field-label">${label}</span>${inner}</div>`;
  const chips = (id, options, cur) => `<div class="radio-row" id="${id}">${options.map((o) =>
    `<div class="radio-chip ${cur === o ? 'selected' : ''}" data-v="${o}">${o}</div>`).join('')}</div>`;
  const bindChips = (id, cb) => $$('#' + id + ' .radio-chip').forEach((x) => x.addEventListener('click', () => {
    $$('#' + id + ' .radio-chip').forEach((y) => y.classList.remove('selected'));
    x.classList.add('selected'); cb(x.dataset.v);
  }));
  const body = $('#tw-body');
  if (s === 1) {
    body.innerHTML =
      field('任务名称', `<input class="input" id="tw-name" value="${esc(c.name)}">`) +
      field('优先级', chips('tw-prio', ['P0 紧急', 'P1 高', 'P2 常规'], c.priority)) +
      field('任务类型', chips('tw-type', TRN_TYPES, c.type)) +
      field('任务描述', `<textarea class="textarea" id="tw-desc" style="min-height:70px" placeholder="一句话目标，如：基于 SCN-01/02 实战回流轨迹强化利用链规划能力">${esc(c.desc)}</textarea>`);
    $('#tw-name').addEventListener('input', (e) => { c.name = e.target.value; });
    $('#tw-desc').addEventListener('input', (e) => { c.desc = e.target.value; });
    bindChips('tw-prio', (v) => { c.priority = v; });
    bindChips('tw-type', (v) => { c.type = v; });
  } else if (s === 2) {
    body.innerHTML =
      field('训练数据集（单选，含规模）', `<select class="select" id="tw-ds">${TRN_DATASETS.map((d) => `<option ${c.dataset === d ? 'selected' : ''}>${d}</option>`).join('')}</select>`) +
      field('评测基准（多选）', `<div class="check-row" id="tw-bm">${TRN_BENCHMARKS.map((b) =>
        `<label class="check-item"><input type="checkbox" value="${b}" ${c.benchmarks.includes(b) ? 'checked' : ''}>${b}</label>`).join('')}</div>`) +
      field('训练 / 验证集比例', chips('tw-split', ['9 : 1', '8 : 2', '7 : 3'], c.split));
    $('#tw-ds').addEventListener('change', (e) => { c.dataset = e.target.value; });
    $$('#tw-bm input').forEach((x) => x.addEventListener('change', () => {
      c.benchmarks = $$('#tw-bm input:checked').map((y) => y.value);
    }));
    bindChips('tw-split', (v) => { c.split = v; });
  } else if (s === 3) {
    body.innerHTML =
      field('基座模型', chips('tw-base', ['自研 v2.2', '自研 v2.1', '自研 v2.0'], c.base)) +
      field('算法框架', chips('tw-fw', ['自研 RL 框架', '自研 SFT 框架'], c.framework)) +
      (c.framework === '自研 RL 框架'
        ? field('RL 算法', chips('tw-algo', TRN_RL_ALGOS, c.rlAlgo) +
            `<div class="small muted" style="margin-top:4px">自研 RL 框架支持 GRPO / PPO / GSPO 等算法，默认 GRPO</div>`)
        : '') +
      field('微调方式', chips('tw-ft', ['LoRA（推荐）', '全参数'], c.finetune));
    bindChips('tw-base', (v) => { c.base = v; });
    bindChips('tw-fw', (v) => { c.framework = v; renderTwiz(); });
    bindChips('tw-algo', (v) => { c.rlAlgo = v; });
    bindChips('tw-ft', (v) => { c.finetune = v; });
  } else if (s === 4) {
    body.innerHTML =
      `<p class="mini-note" style="margin:0 0 12px">先确定训练资源，下一步的超参数将依据资源规模设置</p>` +
      field('GPU 资源', chips('tw-gpu', ['4×H100', '8×H100'], c.gpu)) +
      field('最长训练时长', chips('tw-dur', ['12 小时', '24 小时', '48 小时', '不限'], c.duration));
    bindChips('tw-gpu', (v) => { c.gpu = v; });
    bindChips('tw-dur', (v) => { c.duration = v; });
  } else if (s === 5) {
    body.innerHTML =
      `<p class="mini-note" style="margin:0 0 12px">依据资源（${c.gpu}）设置 RL 训练超参数 · 每项附调优方向</p>` +
      TRN_HP_DEFS.map(([k, cn, , hint]) =>
        field(`${k}（${cn}）`, `<input class="input mono" data-hp="${k}" value="${esc(c.hp[k])}"><div class="small muted" style="margin-top:2px">${hint}</div>`)).join('');
    $$('[data-hp]').forEach((x) => x.addEventListener('input', () => { c.hp[x.dataset.hp] = x.value; }));
  } else {
    body.innerHTML =
      `<div class="wz-field"><span class="field-label">配置摘要</span>
        <dl class="detail-kv">
          <dt>任务</dt><dd>${esc(c.name)} · ${c.priority} · ${c.type}</dd>
          <dt>数据</dt><dd>${esc(c.dataset)} · 基准 ${c.benchmarks.join(' / ') || '—'} · ${c.split}</dd>
          <dt>模型</dt><dd>${c.base} · ${c.framework}${c.framework === '自研 RL 框架' ? ' · ' + c.rlAlgo : ''} · ${c.finetune}</dd>
          <dt>资源</dt><dd>${c.gpu} · ${c.duration}</dd>
          <dt>超参</dt><dd class="mono">${TRN_HP_DEFS.map(([k]) => `${k}=${c.hp[k]}`).join(' · ')}</dd>
        </dl></div>`;
  }
}

'''
a = a[:i1] + NEW_WIZARD + a[i2:]

# --- A2. 曲线密度提升（40 → 90 点，贴近 wandb 原生曲线观感） ---
a = rep(a, "return Array.from({ length: 40 }, () => { v += s.drift + (Math.random() - 0.5) * 2 * s.jitter; return v; });",
           "return Array.from({ length: 90 }, () => { v += s.drift + (Math.random() - 0.5) * 2 * s.jitter; return v; });", "曲线点数")
a = rep(a, "if (arr.length > 40) arr.shift();", "if (arr.length > 90) arr.shift();", "滚动窗口")

# --- A3. 日志 reward 取值真实化 ---
a = rep(a, ".replace('{r}', (0.4 + Math.random() * 0.3).toFixed(3))",
           ".replace('{r}', (0.32 + Math.random() * 0.42).toFixed(3))", "日志reward区间")

# --- A4. 任务中心 helpTip 6 步 ---
a = rep(a, "模型训练任务的创建与管理：5 步向导创建训练任务", "模型训练任务的创建与管理：6 步向导创建训练任务", "helpTip·6步")

save(ap, a)
print("\n全部替换完成")
