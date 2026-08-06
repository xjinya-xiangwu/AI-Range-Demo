/* QA screenshots: key pages at 1920x1080 dark */
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0' });
  await new Promise((s) => setTimeout(s, 600));
  await page.screenshot({ path: 'qa-shot-login.png' });
  await page.click('#lg-go'); await new Promise((s) => setTimeout(s, 1600));
  const shot = async (r, name, wait = 1400) => {
    await page.evaluate((x) => { location.hash = '#/' + x; }, r);
    await new Promise((s) => setTimeout(s, wait));
    await page.screenshot({ path: `qa-shot-${name}.png` });
    console.log('shot', name);
  };
  await shot('confirm', 'confirm', 1600);
  await shot('data', 'data', 1200);
  await shot('gateway', 'gateway', 1200);
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
