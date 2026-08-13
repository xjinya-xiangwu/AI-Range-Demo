/* QA V3.6-r4: 新建任务向导环境与靶场大厅名称一致 */
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
let fails = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); if (!ok) fails++; };
(async () => {
  const server = spawn('node', ['server.js', '--port', '7135'], { cwd: __dirname, stdio: 'ignore' });
  await sleep(1200);
  const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:7135/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(600);
    await page.click('#lg-go');
    await sleep(900);
    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(800);
    const hall = await page.evaluate(() => [...document.querySelectorAll('.env-card .env-title')].map((e) => e.innerText.trim()));
    await page.evaluate(() => { closeModal(); tw.type = 'range'; openTaskWizard(); tw.step = 2; renderTw2(); });
    await sleep(600);
    const wiz = await page.evaluate(() => [...document.querySelectorAll('#tw2-body .tw2-env .env-title')].map((e) => e.innerText.trim()));
    check(wiz.every((n) => n.endsWith('靶场')), '向导环境名均为靶场代号', wiz.join(' | '));
    check(wiz.includes('ENT-0520 靶场') && wiz.includes('ENG-0416 靶场'), '向导含大厅同款 ENT-0520 / ENG-0416 靶场');
    const overlap = wiz.filter((n) => hall.includes(n));
    check(overlap.length === wiz.length, '向导环境与大厅名称一一对应', `重合 ${overlap.length}/${wiz.length}`);
    await page.evaluate(() => { tw.envKey = 'corp'; tw.step = 4; renderTw2(); });
    await sleep(400);
    const sum = await page.evaluate(() => document.getElementById('tw2-body').innerText);
    check(/ENT-0520 靶场/.test(sum), '提交摘要显示靶场代号');
    check(errors.length === 0, '无 JS 错误', errors.slice(0, 2).join('|'));
    await page.screenshot({ path: 'qa-v36r4-wizard-env.png' });
  } finally { await browser.close(); server.kill(); }
  console.log(fails === 0 ? '== ALL PASS ==' : `== ${fails} FAIL ==`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
