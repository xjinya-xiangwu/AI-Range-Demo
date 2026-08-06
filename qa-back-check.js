/* quick check: per-page back links exist */
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0' });
  await page.click('#lg-go'); await new Promise((s) => setTimeout(s, 600));
  const routes = ['tasks', 'range-hall', 'confirm', 'training', 'training-live', 'models', 'data', 'gateway', 'settings', 'monitor', 'tools', 'battle', 'range'];
  for (const r of routes) {
    await page.evaluate((x) => { location.hash = '#/' + x; }, r);
    await new Promise((s) => setTimeout(s, 700));
    const info = await page.evaluate(() => {
      const back = document.querySelector('.page-back') || [...document.querySelectorAll('a,button')].find((a) => a.innerText.includes('返回'));
      return back ? back.innerText.trim().replace(/\n/g, ' ') : 'NONE';
    });
    console.log('#/' + r + '  back=' + info);
  }
  await page.evaluate(() => { location.hash = '#/tasks'; });
  await new Promise((s) => setTimeout(s, 700));
  const sim = await page.$('[data-sim="0"]');
  if (sim) {
    await sim.click(); await new Promise((s) => setTimeout(s, 1200));
    const wbBack = await page.evaluate(() => [...document.querySelectorAll('.wb-actions a')].map((x) => x.innerText).join('|') || 'NONE');
    console.log('#/workbench  back=' + wbBack);
  }
  errors.forEach((e) => console.log('!! ' + e));
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
