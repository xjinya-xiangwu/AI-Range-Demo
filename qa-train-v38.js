/* QA V3.8：实时监控弹窗化 / 导航去除 / 任务详情合并 / 已完成任务导出 */
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
  page.on('requestfailed', (r) => console.log('REQFAIL: ' + r.url()));
  page.on('response', (r) => { if (r.status() === 404) console.log('404: ' + r.url()); });
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  const check = (name, ok) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);

  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await page.click('#lg-go'); await sleep(700);

  /* ① 导航无实时监控入口 */
  const navText = await page.$eval('#sidenav', (e) => e.textContent);
  const navHasLive = await page.$('#sidenav a[data-route="training-live"]') !== null;
  check('导航栏无「实时监控」入口', !navHasLive && !/实时监控/.test(navText.replace('训练实时监控摘要', '')));

  /* ② 训练任务中心：运行中任务点「实时监控」开弹窗 */
  await page.goto('http://127.0.0.1:7132/index.html#/training', { waitUntil: 'networkidle0' });
  await sleep(800);
  await page.evaluate(() => { [...document.querySelectorAll('[data-trn]')].find((b) => b.dataset.trn.startsWith('live:')).click(); });
  await sleep(1200);
  const modal = await page.$('.modal.xwide');
  check('弹窗以 xwide 打开', modal !== null);
  const modalText = await page.$eval('.modal', (e) => e.textContent);
  check('弹窗标题为任务详情', /任务详情 · TRN-2026-0413/.test(modalText));
  check('无 Checkpoint 版本管理条', !/Checkpoint 版本管理/.test(modalText));
  check('任务详情信息卡含任务信息与超参数', /任务详情信息/.test(modalText) && /TRN_ID/.test(modalText) && /RL_EPOCH/.test(modalText) && /GRPO/.test(modalText));
  const scalarCount = await page.$$eval('.modal .scalar-card', (els) => els.length);
  check('弹窗内 12 项标量曲线', scalarCount === 12);
  check('弹窗含 GPU 集群与日志', /GPU 集群监控/.test(modalText) && /终端日志流/.test(modalText));
  const logs = await page.$eval('#tl-logs', (e) => e.textContent);
  check('日志流滚动', /rollout|step:/.test(logs));

  /* ③ 返回任务中心按钮关闭弹窗 */
  await page.click('#tl-back'); await sleep(500);
  const modalGone = await page.$('.modal') === null;
  const onTraining = await page.evaluate(() => location.hash);
  check('返回任务中心关闭弹窗且留在任务中心', modalGone && onTraining === '#/training');

  /* ④ 路由兼容：#/training-live = 任务中心 + 弹窗 */
  await page.goto('http://127.0.0.1:7132/index.html#/training-live', { waitUntil: 'networkidle0' });
  await sleep(1200);
  const routeModal = await page.$('.modal.xwide') !== null;
  const behindIsTraining = await page.$eval('#view', (e) => e.textContent.includes('运行中任务列表'));
  check('#/training-live 路由 = 任务中心 + 详情弹窗', routeModal && behindIsTraining);
  await page.click('#tl-back'); await sleep(400);

  /* ⑤ 已完成任务：导出数据集 / 导出模型 */
  const expd = await page.$$('[data-trn^="expd:"]');
  const expm = await page.$$('[data-trn^="expm:"]');
  check('已完成任务有导出数据集/导出模型按钮', expd.length >= 1 && expm.length >= 1);
  await expd[0].click(); await sleep(400);
  let toast = await page.$eval('body', (e) => e.textContent);
  check('导出数据集提示「数据导出功能开发中」', /数据导出功能开发中/.test(toast));
  await sleep(2200);
  await expm[0].click(); await sleep(400);
  toast = await page.$eval('body', (e) => e.textContent);
  check('导出模型提示「数据导出功能开发中」', /数据导出功能开发中/.test(toast));

  check('页面 JS 无报错', errors.length === 0);
  if (errors.length) console.log('ERRORS: ' + errors.join(' | '));
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
