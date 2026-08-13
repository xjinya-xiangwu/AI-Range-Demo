const puppeteer = require('puppeteer-core');

const BASE = 'http://127.0.0.1:7132';
const shots = [];
const errors = [];
const fails = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function expectText(page, text, label) {
  try {
    await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 10000 }, text);
    console.log(`PASS ${label}: ${text}`);
  } catch (e) {
    fails.push(`${label}: 未找到文本「${text}」`);
    console.log(`FAIL ${label}: ${text}`);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 940 });
  page.on('pageerror', (e) => { errors.push(String(e)); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const login = await page.$('#lg-go');
  if (login) { await login.click(); await page.waitForSelector('#view', { timeout: 10000 }); }

  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await sleep(1200);
  await expectText(page, '企业内网横向移动攻防演练', '首页轮播 SCN-01');
  await expectText(page, '10.10.0.0/24', '首页企业内网网段');
  await page.screenshot({ path: 'qa-shot-dashboard.png', fullPage: false });
  shots.push('qa-shot-dashboard.png');

  await page.evaluate(() => { location.hash = '#/tasks'; });
  await sleep(1200);
  await expectText(page, 'JOB-20260806-021', '任务中心演示任务');
  await expectText(page, '企业内网（5 网区 20 节点）', '任务中心场景名');
  const demoBadgeN = await page.$$eval('table .badge', (els) => els.filter((e) => e.textContent.trim() === '演示任务').length);
  const latestBadgeN = await page.$$eval('.badge', (els) => els.filter((e) => e.textContent.trim() === '最新').length);
  if (demoBadgeN === 1) console.log('PASS 任务中心演示任务标签唯一'); else { fails.push(`任务中心演示任务标签数量=${demoBadgeN}，预期 1`); console.log('FAIL 任务中心演示任务标签唯一'); }
  if (latestBadgeN === 0) console.log('PASS 任务中心无「最新」标签'); else { fails.push(`任务中心仍存在「最新」标签 ${latestBadgeN} 个`); console.log('FAIL 任务中心无「最新」标签'); }
  await page.screenshot({ path: 'qa-shot-tasks.png', fullPage: false });
  shots.push('qa-shot-tasks.png');

  const btn = await page.$('[data-tq-detail="JOB-20260806-021"]');
  if (btn) {
    await btn.click();
    await sleep(1500);
    await expectText(page, 'CVE-2024-8353', '工作台漏洞环境');
    await expectText(page, '企业内网', '工作台企业内网');
    await expectText(page, 'CockroachDB', '工作台 20 节点拓扑（诱饵节点）');
  } else {
    fails.push('任务中心: 未找到 JOB-20260806-021 详情按钮');
  }
  await page.screenshot({ path: 'qa-shot-workbench.png', fullPage: false });
  shots.push('qa-shot-workbench.png');

  await page.evaluate(() => { location.hash = '#/training'; });
  await sleep(1200);
  await expectText(page, 'SCN-01 企业内网回流轨迹', '训练任务中心演示数据集');
  const trnDemoN = await page.$$eval('table .badge', (els) => els.filter((e) => e.textContent.trim() === '演示任务').length);
  if (trnDemoN === 1) console.log('PASS 训练任务中心演示任务标签唯一'); else { fails.push(`训练任务中心演示任务标签数量=${trnDemoN}，预期 1`); console.log('FAIL 训练任务中心演示任务标签唯一'); }
  await page.screenshot({ path: 'qa-shot-training-center.png', fullPage: false });
  shots.push('qa-shot-training-center.png');

  await page.evaluate(() => { location.hash = '#/range-hall'; });
  await sleep(1200);
  await expectText(page, 'ENT-0520 靶场', '靶场大厅 SCN-01');
  await page.screenshot({ path: 'qa-shot-rangehall.png', fullPage: false });
  shots.push('qa-shot-rangehall.png');

  await page.evaluate(() => { location.hash = '#/range'; });
  await sleep(1500);
  await expectText(page, '企业内网（5 网区 20 节点）', '靶场控制台场景');
  await expectText(page, '安全检测平台', '靶场控制台拓扑节点');
  await page.screenshot({ path: 'qa-shot-range.png', fullPage: false });
  shots.push('qa-shot-range.png');

  await browser.close();
  console.log('---');
  console.log('screenshots:', shots.join(', '));
  if (errors.length) { console.log('PAGE_ERRORS:'); errors.forEach((e) => console.log('  ' + e)); }
  if (fails.length) { console.log('CHECK_FAILS:'); fails.forEach((f) => console.log('  ' + f)); process.exit(2); }
  if (errors.length) process.exit(3);
  console.log('ALL_OK');
})();
