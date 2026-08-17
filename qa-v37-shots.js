/* 训练模块改造截图：向导 RL 算法步 / 超参数步 / 实时监控页 */
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
  await sleep(700);
  await page.click('#trn-new'); await sleep(400);
  await page.click('#tw-next'); await sleep(250);
  await page.click('#tw-next'); await sleep(350);
  await page.screenshot({ path: 'qa-v37-wizard-algo.png' });
  await page.click('#tw-next'); await sleep(250);
  await page.click('#tw-next'); await sleep(350);
  await page.screenshot({ path: 'qa-v37-wizard-hp.png' });
  await page.goto('http://127.0.0.1:7132/index.html#/training-live', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: 'qa-v37-live.png' });
  await browser.close();
  console.log('shots done');
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
