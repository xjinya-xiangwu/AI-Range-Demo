/* QA V3.6: 靶场大厅简化版 — 静态详情页 + 两按钮 + 创建任务跳转 + 动线回归 */
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
let fails = 0;
const check = (ok, name, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const server = spawn('node', ['server.js', '--port', '7132'], { cwd: __dirname, stdio: 'ignore' });
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

    await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(600);
    await page.click('#lg-go');
    await sleep(900);

    /* ── 靶场大厅 ── */
    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(900);
    const hall = await page.evaluate(() => {
      const v = document.getElementById('view');
      const text = v.innerText;
      const cards = [...v.querySelectorAll('.env-card')].map((c) => ({
        id: c.querySelector('.env-cve') ? c.querySelector('.env-cve').innerText.trim() : '',
        btns: [...c.querySelectorAll('button')].map((b) => ({ t: b.innerText.trim(), disabled: b.disabled })),
      }));
      return {
        text, cards,
        hasOldSections: /常驻靶场环境|漏洞环境库/.test(text),
        hasOldButtons: /进入控制台|进入环境|选用该环境|选用并创建任务|发起评测|待接入(?=<)/.test(v.innerHTML.replace(/badge[^<]*待接入/g, '')),
        btnTexts: [...new Set(cards.flatMap((c) => c.btns.map((b) => b.t)))],
      };
    });
    check(!hall.hasOldSections, '大厅已移除「常驻靶场环境/漏洞环境库」板块');
    check(hall.cards.length === 5, '大厅仅含 5 个预设靶场环境卡片', `cards=${hall.cards.length}`);
    check(hall.cards.every((c) => c.btns.length === 2), '每个环境卡片仅 2 个按钮');
    check(hall.btnTexts.length === 2 && hall.btnTexts.includes('使用该环境创建任务') && hall.btnTexts.includes('查看环境详情'),
      '按钮文案仅为「使用该环境创建任务 / 查看环境详情」', hall.btnTexts.join(' | '));
    const scn3 = hall.cards.find((c) => c.id === 'SCN-03');
    check(scn3 && scn3.btns.find((b) => b.t === '使用该环境创建任务').disabled, '待接入场景的创建任务按钮禁用');
    check(!/进入控制台|进入环境|选用该环境|选用并创建任务|发起评测/.test(hall.text), '大厅无旧按钮文案');

    /* ── 静态详情页 · SCN-01 ── */
    await page.evaluate(() => { location.hash = '#/range-detail?env=SCN-01'; });
    await sleep(900);
    const d1 = await page.evaluate(() => {
      const v = document.getElementById('view');
      return {
        hash: location.hash,
        hasTopo: !!v.querySelector('svg.topo-svg'),
        hasParams: /环境参数/.test(v.innerText) && !!v.querySelector('table'),
        hasStaticNote: /静态/.test(v.innerText),
        hasBack: !!v.querySelector('a[href="#/range-hall"]'),
        hasUseBtn: !!v.querySelector('#rd-use:not([disabled])'),
        hasLive: /事件流|执行中|实时研判|控制台/.test(v.innerText),
      };
    });
    check(d1.hash === '#/range-detail?env=SCN-01', 'SCN-01 详情路由正确');
    check(d1.hasTopo, 'SCN-01 详情页静态拓扑渲染');
    check(d1.hasParams, 'SCN-01 详情页静态参数表渲染');
    check(d1.hasBack && d1.hasUseBtn, 'SCN-01 详情页含返回与创建任务按钮');
    check(!d1.hasLive, 'SCN-01 详情页无任务执行/控制台元素');
    await page.screenshot({ path: 'qa-v36-detail-scn01.png' });

    /* 返回动线 */
    await page.click('a[href="#/range-hall"]');
    await sleep(700);
    check((await page.evaluate(() => location.hash)) === '#/range-hall', '详情页返回靶场大厅动线');

    /* ── 静态详情页 · SCN-03（待接入）── */
    await page.evaluate(() => { location.hash = '#/range-detail?env=SCN-03'; });
    await sleep(800);
    const d3 = await page.evaluate(() => {
      const v = document.getElementById('view');
      return {
        placeholder: /场景接入中/.test(v.innerText),
        noTopo: !v.querySelector('svg.topo-svg'),
        useDisabled: !!v.querySelector('#rd-use[disabled]'),
      };
    });
    check(d3.placeholder && d3.noTopo, 'SCN-03 详情页显示接入中占位（无拓扑）');
    check(d3.useDisabled, 'SCN-03 详情页创建任务按钮禁用');
    await page.screenshot({ path: 'qa-v36-detail-scn03.png' });

    /* ── 大厅点击 → 详情 → 创建任务跳转向导 ── */
    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(700);
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('.env-card')].find((c) => c.querySelector('.env-cve').innerText.trim() === 'SCN-01');
      card.querySelector('[data-hall-detail]').click();
    });
    await sleep(700);
    check((await page.evaluate(() => location.hash)) === '#/range-detail?env=SCN-01', '大厅卡片「查看环境详情」跳转正确');
    await page.click('#rd-use');
    await sleep(900);
    const wiz = await page.evaluate(() => {
      const m = document.querySelector('.modal, .modal-mask, [class*="wizard"], .dlg');
      return { open: !!(m && m.offsetParent !== null) || document.body.innerText.includes('选择靶场环境') || document.body.innerText.includes('新建测试任务'), hash: location.hash };
    });
    check(wiz.open, '详情页「使用该环境创建任务」打开新建任务向导');
    await page.screenshot({ path: 'qa-v36-wizard.png' });

    /* 大厅截图 + 全页错误 */
    await page.keyboard.press('Escape');
    await sleep(400);
    await page.evaluate(() => { location.hash = '#/range-hall'; });
    await sleep(800);
    await page.screenshot({ path: 'qa-v36-hall.png' });
    check(errors.length === 0, '全程无 JS 错误', errors.slice(0, 3).join(' || '));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(fails === 0 ? '== ALL PASS ==' : `== ${fails} FAIL ==`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
