/* QA 训练模块改造（训练模块.md + wandb 真实数值）：向导 6 步 / RL 算法联动 / 9 超参数 / 监控页数值与日志 */
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  const check = (name, ok) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);

  /* 登录进入训练任务 */
  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(600);
  await page.click('#lg-go');
  await sleep(800);
  await page.goto('http://127.0.0.1:7132/index.html#/training', { waitUntil: 'networkidle0' });
  await sleep(800);

  /* ① 打开新建训练任务向导 */
  await page.click('#trn-new');
  await sleep(500);
  const stepLabels = await page.$$eval('#tw-steps .step-item', (els) => els.map((e) => e.textContent.replace(/^[✓\d]+/, '')));
  check('向导为 6 步: ' + JSON.stringify(stepLabels),
    stepLabels.length === 6 && stepLabels[3] === '资源' && stepLabels[4] === '超参数' && stepLabels[5] === '确认提交');
  const modalSub = await page.$eval('.modal-sub', (e) => e.textContent);
  check('modal-sub 为 6 步创建向导', /6 步创建向导/.test(modalSub));

  /* ② 数据与基准：无自动补强开关 */
  await page.click('#tw-next'); await sleep(300);
  const step2Text = await page.$eval('#tw-body', (e) => e.textContent);
  check('数据与基准无自动补强开关', !/自动补强/.test(step2Text));

  /* ③ 模型与算法：自研 RL 框架出现 RL 算法，默认 GRPO */
  await page.click('#tw-next'); await sleep(300);
  let algoChips = await page.$$eval('#tw-algo .radio-chip', (els) => els.map((e) => ({ v: e.dataset.v, sel: e.classList.contains('selected') })));
  check('RL 算法选项出现: ' + JSON.stringify(algoChips.map((c) => c.v)),
    algoChips.length >= 3 && algoChips.some((c) => c.v === 'GRPO' && c.sel));
  /* 切到 SFT 框架应隐藏 RL 算法 */
  await page.evaluate(() => { [...document.querySelectorAll('#tw-fw .radio-chip')].find((c) => c.dataset.v === '自研 SFT 框架').click(); });
  await sleep(300);
  const algoHidden = await page.$('#tw-algo') === null;
  check('SFT 框架下 RL 算法隐藏', algoHidden);
  /* 切回 RL 框架 */
  await page.evaluate(() => { [...document.querySelectorAll('#tw-fw .radio-chip')].find((c) => c.dataset.v === '自研 RL 框架').click(); });
  await sleep(300);

  /* ④ 资源步骤在超参数之前 */
  await page.click('#tw-next'); await sleep(300);
  const step4Text = await page.$eval('#tw-body', (e) => e.textContent);
  check('第 4 步为资源（GPU/时长）', /GPU 资源/.test(step4Text) && /最长训练时长/.test(step4Text));

  /* ⑤ 超参数：9 个参数 + 默认值 + 调优方向 */
  await page.click('#tw-next'); await sleep(300);
  const hpKeys = await page.$$eval('[data-hp]', (els) => els.map((e) => ({ k: e.dataset.hp, v: e.value })));
  const expectHp = { LR: '1e-6', EPS_CLIP: '0.2', RL_EPOCH: '1000', RL_GLOBAL_BATCH_SIZE: '512', RL_GROUP_SIZE: '8', MAX_TOKENS_PER_GPU: '5000', SGLANG_MEM_FRACTION_STATIC: '0.45', ROLLOUT_NUM_GPUS: '3', ACTOR_NUM_GPUS_PER_NODE: '1' };
  const hpOk = hpKeys.length === 9 && hpKeys.every((h) => expectHp[h.k] === h.v);
  check('9 个超参数及默认值: ' + JSON.stringify(hpKeys.map((h) => h.k + '=' + h.v)), hpOk);
  const hintText = await page.$eval('#tw-body', (e) => e.textContent);
  check('调优方向说明可见', /调优|显存不足|OOM|降至/.test(hintText));

  /* ⑥ 确认页摘要含 RL 算法与超参数 */
  await page.click('#tw-next'); await sleep(300);
  const summary = await page.$eval('#tw-body', (e) => e.textContent);
  check('摘要含 GRPO 与超参数', /GRPO/.test(summary) && /RL_EPOCH=1000/.test(summary) && !/补强/.test(summary));

  /* ⑦ 提交 */
  await page.click('#tw-next'); await sleep(600);
  const toast = await page.$eval('body', (e) => e.textContent);
  check('提交成功 toast', /已提交，进入调度队列/.test(toast));

  /* ⑧ 实时监控页：指标名 wandb 化 + 数值区间 + RL 日志 */
  await page.goto('http://127.0.0.1:7132/index.html#/training-live', { waitUntil: 'networkidle0' });
  await sleep(2500);
  const scalarNames = await page.$$eval('.sc-name', (els) => els.map((e) => e.textContent));
  check('12 项指标 wandb 命名: ' + scalarNames.slice(0, 3).join(','),
    scalarNames.length === 12 && scalarNames.includes('rollout/raw_reward') && scalarNames.includes('used/reward') && scalarNames.includes('perf/step_time'));
  const usedRewardIdx = scalarNames.indexOf('used/reward');
  const usedRewardVal = parseFloat(await page.$eval('#tl-val-' + usedRewardIdx, (e) => e.textContent));
  check('used/reward 数值真实（0~1 区间）: ' + usedRewardVal, usedRewardVal > 0 && usedRewardVal < 1.2);
  const hpPanel = await page.$eval('.hp-grid', (e) => e.textContent);
  check('hparams 面板含新参数', /GRPO/.test(hpPanel) && /RL_EPOCH/.test(hpPanel) && /GROUP_SIZE/.test(hpPanel));
  const logs = await page.$eval('#tl-logs', (e) => e.textContent);
  check('RL 风格日志', /rollout\/raw_reward|ppo_kl|global_batch_size/.test(logs));
  const pipeText = await page.evaluate(() => document.body.textContent);
  check('页面 JS 无报错', errors.length === 0);
  if (errors.length) console.log('ERRORS: ' + errors.join(' | '));

  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
