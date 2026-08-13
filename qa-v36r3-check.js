/* QA V3.6-r3: 靶场代号命名 + 向导接入参数随模型自动匹配 */
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
let fails = 0;
const check = (ok, name, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const server = spawn('node', ['server.js', '--port', '7134'], { cwd: __dirname, stdio: 'ignore' });
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

    await page.goto('http://127.0.0.1:7134/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(600);
    await page.click('#lg-go');
    await sleep(900);

    /* ① 靶场大厅代号命名 */
    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(900);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('.env-card .env-title')].map((el) => el.innerText.trim()));
    check(names.length === 5 && names.every((n) => n.endsWith('靶场')), '① 全部靶场名称以「靶场」结尾', names.join(' | '));
    check(names.includes('ENT-0520 靶场') && names.includes('ENG-0416 靶场') && names.includes('FIN-0418 靶场')
      && names.includes('GOV-0415 靶场') && names.includes('TRN-0414 靶场'), '① 代号与参数字段一致（行业码+网区节点数）');

    /* 详情页同步代号 */
    await page.evaluate(() => { location.hash = '#/range-detail?env=SCN-01'; });
    await sleep(800);
    const dTitle = await page.evaluate(() => document.querySelector('#view .page-title').innerText);
    check(dTitle.includes('ENT-0520 靶场'), '① 环境详情页标题同步为代号');

    /* ② 向导 step3 接入参数字段化 */
    await page.evaluate(() => {
      closeModal();
      tw.type = 'range'; tw.envKey = 'corp'; tw.modelTab = 'builtin'; tw.modelId = 'reconx';
      openTaskWizard(); tw.step = 3; renderTw2();
    });
    await sleep(600);
    const wiz = await page.evaluate(() => {
      const b = document.getElementById('tw2-body');
      return {
        noChips: !b.querySelector('[data-chips="tw2-proto"]') && !b.querySelector('.chip-mini[data-v="codex"]'),
        fields: b.innerText,
      };
    });
    check(/接入协议 protocol/.test(wiz.fields) && /Agent 框架 harness/.test(wiz.fields) && /自动匹配/.test(wiz.fields),
      '② step3 接入参数为只读字段展示');
    check(!/三选一|二选一/.test(wiz.fields), '② step3 不再有「三选一/二选一」选择器文案');

    /* 切换模型 → 字段自动跟随 */
    await page.evaluate(() => {
      const sel = document.getElementById('tw2-model');
      sel.value = 'claude-4';
      sel.dispatchEvent(new Event('change'));
    });
    await sleep(500);
    const wiz2 = await page.evaluate(() => document.getElementById('tw2-body').innerText);
    check(/anthropic_messages/.test(wiz2) && /claude_code/.test(wiz2), '② 切换 Claude-4 后字段自动变为 anthropic_messages / claude_code');

    await page.evaluate(() => {
      const sel = document.getElementById('tw2-model');
      sel.value = 'reconx';
      sel.dispatchEvent(new Event('change'));
    });
    await sleep(500);
    const wiz3 = await page.evaluate(() => document.getElementById('tw2-body').innerText);
    check(/openai_responses/.test(wiz3) && /codex/.test(wiz3), '② 切回自研 Agent 字段恢复 openai_responses / codex');

    /* 摘要页仍正确展示 */
    await page.evaluate(() => { tw.step = 4; renderTw2(); });
    await sleep(400);
    const wiz4 = await page.evaluate(() => document.getElementById('tw2-body').innerText);
    check(/openai_responses \/ codex/.test(wiz4), '② 提交摘要沿用自动匹配的接入参数');
    await page.screenshot({ path: 'qa-v36r3-wizard.png' });

    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(700);
    await page.screenshot({ path: 'qa-v36r3-hall.png' });
    check(errors.length === 0, '全程无 JS 错误', errors.slice(0, 3).join(' || '));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(fails === 0 ? '== ALL PASS ==' : `== ${fails} FAIL ==`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
