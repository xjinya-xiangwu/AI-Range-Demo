/* QA V3.9：结果确认融入任务中心 / 训练向导去微调方式 / 超参数?悬停提示 */
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

  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await page.click('#lg-go'); await sleep(700);

  /* ① 导航无「结果确认」，judge-dot 挂在任务中心项 */
  const navText = await page.$eval('#sidenav', (e) => e.textContent);
  const confirmNav = await page.$('#sidenav a[data-route="confirm"]');
  const dotInTasks = await page.$('#sidenav a[data-route="tasks"] #judge-dot') !== null;
  check('导航栏无「结果确认」入口', confirmNav === null && !/结果确认/.test(navText));
  check('待确认小圆点挂在任务中心导航项', dotInTasks);
  const dotVisible = await page.$eval('#judge-dot', (e) => e.style.display !== 'none');
  check('任务中心导航项显示待确认小圆点', dotVisible);

  /* ② 任务中心含结果确认区块 + 恰好 2 项待确认 */
  await page.goto('http://127.0.0.1:7132/index.html#/tasks', { waitUntil: 'networkidle0' });
  await sleep(800);
  const tasksText = await page.$eval('#view', (e) => e.textContent);
  check('任务中心含「结果确认」区块', /结果确认/.test(tasksText));
  const pendingBtns = await page.$$('[data-judge^="confirm:"]');
  check('恰好 2 项待确认风险点', pendingBtns.length === 2);
  check('提示文案为「待确认 2 项」', /待确认 2 项/.test(tasksText));

  /* ③ 闸门：已完成列表初始锁定 + 生成报告按钮禁用 */
  const gateInfo = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.gate-bar button')].find((x) => /生成评测报告/.test(x.textContent));
    return b ? { found: true, disabled: b.disabled, text: b.textContent } : { found: false };
  });
  check('未办结时「生成评测报告」按钮禁用', gateInfo.found && gateInfo.disabled && /剩余 2 条/.test(gateInfo.text));
  check('已完成任务列表初始锁定', /报告与结果未解锁/.test(tasksText) && !(await page.$('[data-report2]')));

  /* ④ 办结 2 项 → 按钮置亮 → 生成报告 → 列表解锁 → 查看报告弹窗 */
  await pendingBtns[0].click(); await sleep(500);
  const remain = await page.$$('[data-judge^="confirm:"]');
  check('办结 1 项后剩 1 项待确认', remain.length === 1);
  await remain[0].click(); await sleep(500);
  const gateNow = await page.$eval('#jg-report', (e) => !e.disabled);
  check('全部办结后「生成评测报告」置亮', gateNow);
  await page.click('#jg-report'); await sleep(600);
  const unlocked = await page.$$('[data-report2]');
  check('生成报告后已完成任务列表解锁', unlocked.length >= 1);
  const toastText = await page.$eval('body', (e) => e.textContent);
  check('生成报告 toast 提示', /评测报告已生成/.test(toastText));
  await unlocked[0].click(); await sleep(600);
  const modalText = await page.$eval('.modal', (e) => e.textContent).catch(() => '');
  check('查看报告直接弹窗（不跳转）', /评测报告/.test(modalText) && /综合得分/.test(modalText));
  await page.click('#rp-close'); await sleep(400);

  /* ⑤ 路由兼容：#/confirm → 任务中心 */
  await page.goto('http://127.0.0.1:7132/index.html#/confirm', { waitUntil: 'networkidle0' });
  await sleep(700);
  const aliasView = await page.$eval('#view', (e) => e.textContent);
  const aliasNav = await page.$eval('#sidenav a.active', (e) => e.dataset.route);
  check('#/confirm 路由兼容到任务中心', /任务中心/.test(aliasView) && /结果确认/.test(aliasView) && aliasNav === 'tasks');

  /* ⑥ 训练向导第 3 步无微调方式板块 */
  await page.goto('http://127.0.0.1:7132/index.html#/training', { waitUntil: 'networkidle0' });
  await sleep(800);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /新建训练任务/.test(b.textContent)).click(); });
  await sleep(600);
  for (let i = 0; i < 2; i++) { await page.click('#tw-next'); await sleep(400); }
  const step3 = await page.$eval('#tw-body', (e) => e.textContent);
  check('向导第3步无 LoRA / 全参数 / 微调方式', !/LoRA|全参数|微调方式/.test(step3));
  check('向导第3步保留基座模型与 RL 算法', /基座模型/.test(step3) && /RL 算法/.test(step3) && /GRPO/.test(step3));

  /* ⑦ 第 5 步：hint 改为 ? 悬停提示，输入框下方无文案 */
  await page.click('#tw-next'); await sleep(300); /* step4 */
  await page.click('#tw-next'); await sleep(400); /* step5 */
  const hpInputs = await page.$$('[data-hp]');
  const hintDivs = await page.$$('#tw-body .wz-field input + .small.muted');
  const hpTips = await page.$$('#tw-body .wz-field .help-tip');
  check('第5步 9 个超参数输入框', hpInputs.length === 9);
  check('输入框下方无调优方向文案', hintDivs.length === 0);
  check('每项参数有 ? 说明按钮', hpTips.length === 9);
  const tipText = await page.$eval('#tw-body', (e) => e.textContent);
  check('调优方向内容仍在（悬停可见）', /显存不足|OOM|调优|降至/.test(tipText));
  const miniNote = await page.$('#tw-body .mini-note');
  const topRow = await page.evaluate(() => {
    const first = document.querySelector('#tw-body').firstElementChild;
    return { isField: first.classList.contains('wz-field'), tips: first.querySelectorAll('.help-tip').length };
  });
  check('顶部说明文字已移除，改为单个 ? 按钮', miniNote === null && !topRow.isField && topRow.tips === 1);

  /* ⑧ 确认页摘要无微调方式 */
  await page.click('#tw-next'); await sleep(400);
  const summary = await page.$eval('#tw-body', (e) => e.textContent);
  check('确认页摘要无 LoRA / 微调方式', !/LoRA|微调方式/.test(summary));
  check('确认页摘要含基座与 RL 算法', /自研 v2.2/.test(summary) && /GRPO/.test(summary));
  await page.click('#tw-cancel'); await sleep(400);

  check('页面 JS 无报错', errors.length === 0);
  if (errors.length) console.log('ERRORS: ' + errors.join(' | '));
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
