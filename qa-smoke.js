/* QA smoke V3.5: auth gate + every route render check + breakpoint overflow check */
const puppeteer = require('puppeteer-core');

const ROUTES = ['dashboard', 'tasks', 'range-hall', 'confirm', 'training', 'training-live',
  'models', 'battle', 'data', 'gateway', 'settings', 'monitor', 'tools', 'range'];

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

  /* 鉴权门：未登录应被重定向到 #/login */
  await page.goto('http://127.0.0.1:7132/index.html#/dashboard', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise((s) => setTimeout(s, 800));
  const gated = await page.evaluate(() => location.hash);
  console.log((gated === '#/login' ? 'PASS' : 'FAIL') + ' auth gate redirects to #/login :: ' + gated);

  /* 登录页三种模式 */
  for (const mode of ['forgot', 'register', 'login']) {
    const sel = mode === 'login' ? '[data-lg="login"]' : `[data-lg="${mode}"]`;
    const el = await page.$(sel);
    if (el) { await el.click(); await new Promise((s) => setTimeout(s, 300)); }
  }
  console.log((errors.length ? 'FAIL' : 'PASS') + ' login modes'); errors.length = 0;

  /* SSO 登录 */
  await page.click('#lg-go');
  await new Promise((s) => setTimeout(s, 800));
  const landed = await page.evaluate(() => location.hash);
  console.log((landed === '#/dashboard' ? 'PASS' : 'FAIL') + ' SSO login lands dashboard :: ' + landed);

  for (const r of ROUTES) {
    errors.length = 0;
    await page.evaluate((route) => { location.hash = '#/' + route; }, r);
    await new Promise((s) => setTimeout(s, 1100));
    const info = await page.evaluate(() => {
      const v = document.getElementById('view');
      const h2 = v && v.querySelector('h2, .dash-title');
      const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      return { len: v ? v.innerHTML.length : -1, title: h2 ? h2.innerText.trim() : '(no title)', overflow };
    });
    console.log(`#/${r} :: len=${info.len} :: ${info.title}${info.overflow ? ' :: H-OVERFLOW!' : ''}`);
    errors.forEach((e) => console.log('   !! ' + e.slice(0, 300)));
  }

  /* 断点：1600 / 1366 横向滚动检查（OV-11） */
  for (const w of [1600, 1366]) {
    await page.setViewport({ width: w, height: 900 });
    for (const r of ['dashboard', 'confirm', 'training-live']) {
      await page.evaluate((route) => { location.hash = '#/' + route; }, r);
      await new Promise((s) => setTimeout(s, 700));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      console.log(`${overflow ? 'FAIL' : 'PASS'} ${w}px #/${r} no-h-overflow`);
    }
  }
  await page.setViewport({ width: 1920, height: 1080 });
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
