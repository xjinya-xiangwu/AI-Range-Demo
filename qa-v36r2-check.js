/* QA V3.6-r2: 8 项修改专项验证 */
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
let fails = 0;
const check = (ok, name, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const server = spawn('node', ['server.js', '--port', '7133'], { cwd: __dirname, stdio: 'ignore' });
  await sleep(1200);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const errors = [];
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    const go = async (r, wait = 900) => { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await sleep(wait); };
    const viewText = () => page.evaluate(() => document.getElementById('view').innerText);

    await page.goto('http://127.0.0.1:7133/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(600);
    await page.click('#lg-go');
    await sleep(900);

    /* ⑦ 导航 */
    const navText = await page.evaluate(() => document.getElementById('sidenav').innerText);
    check(!/模型中心|实战演练场|监控中心|工具集市/.test(navText), '⑦ 导航已移除 模型中心/实战演练场/监控中心/工具集市');

    /* ② 测试任务中心：无数据看板 + ⑥ 无暂停 + ③ 并发1 */
    await go('tasks');
    let t = await viewText();
    check(!/今日完成|累计任务/.test(t), '② 测试任务中心数据看板已移除');
    check(!/暂停/.test(t), '⑥ 测试任务中心无暂停按钮');
    const concs = await page.evaluate(() =>
      [...document.querySelectorAll('#view table tbody tr')].map((r) => {
        const tds = r.querySelectorAll('td');
        return tds.length > 4 ? { suite: tds[2].innerText.trim(), conc: tds[4].innerText.trim() } : null;
      }).filter(Boolean));
    const rangeConcs = concs.filter((c) => c.suite === '靶场环境评测').map((c) => c.conc);
    check(rangeConcs.length > 0 && rangeConcs.every((c) => c === '1'), '③ 靶场环境评测任务并发均为 1', rangeConcs.join(','));
    /* ④ 已完成列表：无结论列、按钮仅查看报告 */
    const doneHead = await page.evaluate(() => [...document.querySelectorAll('#view table thead')].map((h) => h.innerText).join('|'));
    check(!/结论/.test(doneHead), '④ 已完成任务列表结论列已移除');
    const doneBtns = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('#view table')];
      const doneTable = tables[tables.length - 1];
      return [...new Set([...doneTable.querySelectorAll('tbody button')].map((b) => b.innerText.trim()))];
    });
    check(doneBtns.length === 1 && doneBtns[0] === '查看报告', '④ 已完成任务列表按钮仅「查看报告」', doneBtns.join('|'));

    /* ②⑥⑦ 训练任务中心 */
    await go('training');
    t = await viewText();
    check(!/任务总数|本周新版本/.test(t), '② 训练任务中心数据看板已移除');
    check(!/暂停|查看 Checkpoint/.test(t), '⑥⑦ 训练任务中心无暂停/Checkpoint按钮');

    /* ②④ 结果确认页 */
    await go('confirm');
    t = await viewText();
    check(!/本周已办结|平均复审耗时|高置信直通占比/.test(t), '② 结果确认研判数据看板已移除');
    const anaBtn = await page.evaluate(() => !!document.querySelector('[data-rpt-ana]'));
    check(!anaBtn && !/结果分析/.test(t.replace(/结果确认/g, '')), '④ 结果确认报告列表无结果分析按钮');

    /* ⑤ 个人中心 MFA */
    await go('settings');
    t = await viewText();
    check(!/双因子|MFA/.test(t), '⑤ 个人中心双因子认证 MFA 已移除');

    /* ⑥ 首页训练卡无暂停 + ⑦ 无模型中心链接 */
    await go('dashboard', 1200);
    const dash = await page.evaluate(() => ({
      pause: !!document.getElementById('ov-train-card'),
      modelsLink: !!document.querySelector('#view a[href="#/models"]'),
    }));
    check(!dash.pause, '⑥ 首页训练运行与控制卡无暂停按钮');
    check(!dash.modelsLink, '⑦ 首页模型排行榜无模型中心链接');

    /* ⑧ 靶场大厅字段 */
    await go('range-hall');
    const hallMeta = await page.evaluate(() => {
      const card = document.querySelector('.env-card');
      return { meta: card.querySelector('.env-meta').innerText, chips: card.querySelectorAll('.chip').length, stages: card.querySelectorAll('.jd-ms').length };
    });
    check(/内部网络/.test(hallMeta.meta) && /Compose 服务节点/.test(hallMeta.meta) && /Scored milestones/.test(hallMeta.meta),
      '⑧ 大厅卡片仅含三标签字段', hallMeta.meta.replace(/\n/g, ' | '));
    check(hallMeta.chips === 0 && hallMeta.stages === 0, '⑧ 大厅卡片已移除 Agent chips 与阶段条');

    /* ① 纯代码评测提交 → 失败弹窗；靶场任务 → 成功弹窗 */
    const evalRes = await page.evaluate(() => {
      tw.type = 'eval'; tw.step = 4;
      submitTaskWizard();
      const m = document.querySelector('.modal, [class*="modal"]');
      const txt = document.body.innerText;
      const fail = /任务创建失败，缺乏必要评测集/.test(txt);
      const running = sessionStorage.getItem('aisr-running');
      return { fail, running };
    });
    check(evalRes.fail, '① 纯代码评测提交弹出「任务创建失败，缺乏必要评测集」');
    check(evalRes.running !== '1', '① 失败弹窗后未进入运行中队列');
    await page.evaluate(() => { closeModal(); });
    await sleep(300);
    const rbRes = await page.evaluate(() => {
      tw.type = 'range'; tw.envKey = 'corp'; tw.step = 4;
      submitTaskWizard();
      const ok = /任务已成功提交/.test(document.body.innerText);
      return { ok, running: sessionStorage.getItem('aisr-running') };
    });
    check(rbRes.ok && rbRes.running === '1', '① 靶场环境评测提交仍为成功弹窗并进队列');
    await page.evaluate(() => { sessionStorage.removeItem('aisr-running'); closeModal(); });

    /* ⑥ 靶场控制台无暂停演练 */
    await go('range', 1200);
    const rgPause = await page.evaluate(() => !!document.getElementById('rg-pause'));
    check(!rgPause, '⑥ 靶场控制台无暂停演练按钮');

    check(errors.length === 0, '全程无 JS 错误', errors.slice(0, 3).join(' || '));
    await page.screenshot({ path: 'qa-v36r2-tasks.png' });
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(fails === 0 ? '== ALL PASS ==' : `== ${fails} FAIL ==`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
