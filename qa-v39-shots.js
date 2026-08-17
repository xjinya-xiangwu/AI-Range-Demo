/* V3.9 截图：任务中心结果确认 / 向导第3步 / 向导第5步 */
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0' });
  await sleep(400); await page.click('#lg-go'); await sleep(700);
  await page.goto('http://127.0.0.1:7132/index.html#/tasks', { waitUntil: 'networkidle0' });
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await page.screenshot({ path: 'v39-tasks-confirm.png' });
  /* 办结2项+生成报告后的解锁态 */
  for (const _ of [1, 2]) {
    const b = await page.$('[data-judge^="confirm:"]');
    if (b) { await b.click(); await sleep(500); }
  }
  await page.click('#jg-report'); await sleep(600);
  await page.evaluate(() => document.querySelectorAll('.history-head')[2].scrollIntoView({ block: 'start' }));
  await sleep(300);
  await page.screenshot({ path: 'v39-tasks-unlocked.png' });
  /* 向导第3步 */
  await page.goto('http://127.0.0.1:7132/index.html#/training', { waitUntil: 'networkidle0' });
  await sleep(800);
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /新建训练任务/.test(b.textContent)).click(); });
  await sleep(500);
  for (let i = 0; i < 2; i++) { await page.click('#tw-next'); await sleep(350); }
  await page.screenshot({ path: 'v39-wiz-step3.png' });
  /* 向导第5步（悬停 ? 展示一条提示） */
  await page.click('#tw-next'); await sleep(300);
  await page.click('#tw-next'); await sleep(400);
  await page.hover('#tw-body .wz-field .help-tip');
  await sleep(400);
  await page.screenshot({ path: 'v39-wiz-step5.png' });
  await browser.close();
  console.log('SHOTS OK');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
