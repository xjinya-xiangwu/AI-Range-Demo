/* QA interactions V3.5-rev: confirm page rework / helpTip / global back / modal X / gateway default / data center */
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
  const go = async (r) => { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await new Promise((s) => setTimeout(s, 900)); };
  const check = (name) => { console.log(`${errors.length ? 'FAIL' : 'PASS'} ${name}${errors.length ? ' :: ' + errors.join(' | ').slice(0, 260) : ''}`); errors.length = 0; };
  const bodyHas = (t) => page.evaluate((x) => document.body.innerText.includes(x), t);

  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0' });
  await page.click('#lg-go'); await new Promise((s) => setTimeout(s, 700));

  /* 1 · 结果确认页：无临机导调、结果分析弹窗 */
  await go('confirm');
  console.log(((await bodyHas('临机导调')) ? 'FAIL' : 'PASS') + ' inject panel removed');
  await page.click('[data-rpt-ana]'); await new Promise((s) => setTimeout(s, 400));
  const modalOpen = await page.evaluate(() => !!document.querySelector('.modal'));
  console.log((modalOpen ? 'PASS' : 'FAIL') + ' analysis opens as modal');
  await page.click('#ra-import'); await new Promise((s) => setTimeout(s, 200));
  /* 弹窗 X 关闭 */
  await page.click('.modal-x'); await new Promise((s) => setTimeout(s, 300));
  const modalClosed = await page.evaluate(() => !document.querySelector('.modal'));
  console.log((modalClosed ? 'PASS' : 'FAIL') + ' modal X close');
  check('confirm rework');

  /* 2 · 功能说明 ? 按钮：存在且悬浮可见，正文无内部文案 */
  const tipCount = await page.evaluate(() => document.querySelectorAll('.help-tip').length);
  console.log((tipCount > 0 ? 'PASS' : 'FAIL') + ` helpTip present (${tipCount})`);
  await page.hover('.help-tip'); await new Promise((s) => setTimeout(s, 300));
  const tipVisible = await page.evaluate(() => {
    const el = document.querySelector('.help-tip .help-tip-pop');
    return el && getComputedStyle(el).display !== 'none';
  });
  console.log((tipVisible ? 'PASS' : 'FAIL') + ' helpTip hover shows pop');
  const banned = ['TT-', 'OV-0', 'AG-0', 'DC-0', 'MC-0', 'AC-0', '批注', '待确认项', '假数据兜底', 'P0', '占位模板', 'Mock'];
  const found = [];
  for (const b of banned) { if (await bodyHas(b)) found.push(b); }
  for (const r of ['tasks', 'range-hall', 'training', 'training-live', 'models', 'data', 'gateway', 'settings', 'monitor', 'tools', 'battle', 'dashboard']) {
    await go(r);
    for (const b of banned) { if (await bodyHas(b)) found.push(r + ':' + b); }
  }
  console.log((found.length ? 'FAIL internal copy :: ' + found.join(', ') : 'PASS') + ' no internal copy on any page');
  check('copy audit');

  /* 3 · 数据中心：仪表盘 + 多维数据集 */
  await go('data');
  console.log(((await bodyHas('轨迹数据集')) && (await bodyHas('风险数据集')) && (await bodyHas('测试题库')) && (await bodyHas('模型版本')) ? 'PASS' : 'FAIL') + ' data center dimensions');
  console.log(((await bodyHas('12.5 万条')) ? 'PASS' : 'FAIL') + ' data volume dashboard');
  await page.click('[data-dc-traj]'); await new Promise((s) => setTimeout(s, 200));
  check('data center');

  /* 4 · 接入网关默认页：外部 Agent 列表 + 仪表盘 */
  await go('gateway');
  const defTab = await page.evaluate(() => document.querySelector('[data-gw-tab].active') && document.querySelector('[data-gw-tab].active').innerText);
  console.log((defTab && defTab.includes('外部模型') ? 'PASS' : 'FAIL') + ' gateway default tab :: ' + defTab);
  console.log(((await bodyHas('累计执行任务')) && (await bodyHas('消耗 Token')) && (await bodyHas('总成本金额')) ? 'PASS' : 'FAIL') + ' gateway dashboard cards');
  check('gateway default');

  /* 5 · 全局返回按钮：dashboard 隐藏、子页显示且可回退 */
  const hiddenHome = await page.evaluate(() => { location.hash = '#/dashboard'; return true; });
  await new Promise((s) => setTimeout(s, 700));
  const gbHome = await page.evaluate(() => getComputedStyle(document.getElementById('global-back')).display === 'none');
  await go('monitor');
  const gbSub = await page.evaluate(() => getComputedStyle(document.getElementById('global-back')).display !== 'none');
  await page.click('#global-back'); await new Promise((s) => setTimeout(s, 600));
  const backTo = await page.evaluate(() => location.hash);
  console.log((gbHome && gbSub && backTo === '#/dashboard' ? 'PASS' : 'FAIL') + ` global back button (home hidden=${gbHome}, sub shown=${gbSub}, back→${backTo})`);
  check('global back');

  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
