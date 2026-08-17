/* V3.8 截图：任务详情弹窗 + 已完成任务导出按钮 */
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
  await sleep(500);
  await page.click('#lg-go'); await sleep(700);
  await page.goto('http://127.0.0.1:7132/index.html#/training', { waitUntil: 'networkidle0' });
  await sleep(900);
  await page.evaluate(() => { [...document.querySelectorAll('[data-trn]')].find((b) => b.dataset.trn.startsWith('live:')).click(); });
  await sleep(2500);
  await page.screenshot({ path: 'qa-v38-modal.png' });
  await page.click('#tl-back'); await sleep(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(400);
  await page.screenshot({ path: 'qa-v38-done-list.png' });
  await browser.close();
  console.log('shots done');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
