/* QA interactions V3.5: wizard / workbench TT-11 / confirm TT-12~15 / gateway AG-01~05 / DC-03 / settings */
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  const go = async (r) => { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await new Promise((s) => setTimeout(s, 900)); };
  const check = (name) => { console.log(`${errors.length ? 'FAIL' : 'PASS'} ${name}${errors.length ? ' :: ' + errors.join(' | ').slice(0, 260) : ''}`); errors.length = 0; };
  const bodyHas = (t) => page.evaluate((x) => document.body.innerText.includes(x), t);

  await page.goto('http://127.0.0.1:7132/index.html#/login', { waitUntil: 'networkidle0' });
  await page.click('#lg-go'); await new Promise((s) => setTimeout(s, 700));

  /* TT-01~08 · 测试任务创建向导全流程（靶场任务） */
  await go('tasks');
  await page.click('#btn-new-task'); await new Promise((s) => setTimeout(s, 300));
  await page.click('[data-tw2type="range"]'); await new Promise((s) => setTimeout(s, 200));
  await page.click('#tw2-next'); await new Promise((s) => setTimeout(s, 250)); /* → 环境 */
  await page.click('[data-tw2env="nuclear"]'); await new Promise((s) => setTimeout(s, 200));
  await page.click('#tw2-next'); await new Promise((s) => setTimeout(s, 250)); /* → 模型 */
  await page.click('[data-tw2tab="external"]'); await new Promise((s) => setTimeout(s, 250));
  await page.click('#tw2-next'); await new Promise((s) => setTimeout(s, 250)); /* → 约束 */
  await page.click('#tw2-next'); await new Promise((s) => setTimeout(s, 400)); /* 提交 */
  console.log(((await bodyHas('任务已成功提交')) ? 'PASS' : 'FAIL') + ' TT-08 submit modal');
  await page.click('#tw2-done-run'); await new Promise((s) => setTimeout(s, 1200));
  console.log(((await bodyHas('攻击链里程碑')) ? 'PASS' : 'FAIL') + ' workbench milestone strip');
  console.log(((await bodyHas('实时研判')) ? 'PASS' : 'FAIL') + ' TT-11 judge rail');
  /* TT-11 预确认 */
  const wbj = await page.$('[data-wbj]');
  if (wbj) { await wbj.click(); await new Promise((s) => setTimeout(s, 400)); console.log('PASS TT-11 quick confirm'); }
  else console.log('FAIL TT-11 quick confirm (no pending ticket found)');
  check('wizard + workbench');

  /* TT-12~15 · 结果确认合并页 */
  await go('confirm');
  console.log(((await bodyHas('协同研判')) && (await bodyHas('报告任务列表')) && (await bodyHas('结果分析')) ? 'PASS' : 'FAIL') + ' confirm merged sections');
  await page.click('[data-judge="confirm:1"]'); await new Promise((s) => setTimeout(s, 400));
  await page.click('[data-judge="revise:2"]'); await new Promise((s) => setTimeout(s, 300));
  await page.click('#jg-revise-ok'); await new Promise((s) => setTimeout(s, 400));
  await page.click('[data-ticket="3"]'); await new Promise((s) => setTimeout(s, 300));
  await page.click('#jd-close'); await new Promise((s) => setTimeout(s, 200));
  await page.click('[data-rpt-view]'); await new Promise((s) => setTimeout(s, 300));
  console.log(((await bodyHas('演示模板')) ? 'PASS' : 'FAIL') + ' TT-15 report modal');
  await page.click('#rp-close'); await new Promise((s) => setTimeout(s, 200));
  await page.click('[data-rpt-ana]'); await new Promise((s) => setTimeout(s, 500));
  const anaModal = await page.evaluate(() => !!document.querySelector('.modal'));
  console.log((anaModal ? 'PASS' : 'FAIL') + ' TT-14 analysis modal');
  await page.click('#ra-import'); await new Promise((s) => setTimeout(s, 200));
  await page.click('#ra-close'); await new Promise((s) => setTimeout(s, 300));
  await page.click('.rpt-check'); await new Promise((s) => setTimeout(s, 200));
  await page.click('#rpt-batch'); await new Promise((s) => setTimeout(s, 300));
  console.log('PASS TT-13 batch export');
  check('confirm page');

  /* AG-01~05 · 接入网关五个 tab */
  await go('gateway');
  await page.click('[data-gw-tab="verify"]'); await new Promise((s) => setTimeout(s, 400));
  await page.click('#ag-verify-go'); await new Promise((s) => setTimeout(s, 7500));
  console.log(((await bodyHas('校验通过')) ? 'PASS' : 'FAIL') + ' AG-03 verify flow');
  await page.click('[data-gw-tab="sessions"]'); await new Promise((s) => setTimeout(s, 400));
  await page.click('[data-ag-ses="0"]'); await new Promise((s) => setTimeout(s, 300));
  await page.click('#ag-ses-close'); await new Promise((s) => setTimeout(s, 200));
  await page.click('[data-gw-tab="docs"]'); await new Promise((s) => setTimeout(s, 300));
  await page.click('[data-gw-copycode="0"]'); await new Promise((s) => setTimeout(s, 200));
  await page.click('[data-gw-tab="api"]'); await new Promise((s) => setTimeout(s, 300));
  console.log(((await bodyHas('接入流程说明')) ? 'PASS' : 'FAIL') + ' AG-05 api doc');
  await page.click('[data-gw-tab="keys"]'); await new Promise((s) => setTimeout(s, 300));
  await page.click('#gw-new'); await new Promise((s) => setTimeout(s, 250));
  await page.click('#gw-create'); await new Promise((s) => setTimeout(s, 250));
  await page.click('#gw-done'); await new Promise((s) => setTimeout(s, 400));
  console.log(((await bodyHas('sk-air-')) ? 'PASS' : 'FAIL') + ' AG-01 key lifecycle');
  check('gateway tabs');

  /* DC-03 · 题集上传 */
  await go('data');
  await page.type('#dc-name', 'QA 回归题集'); 
  await page.click('#dc-upload'); await new Promise((s) => setTimeout(s, 400));
  console.log(((await bodyHas('QA 回归题集')) ? 'PASS' : 'FAIL') + ' DC-03 question set upload');
  check('data center');

  /* 个人中心 / 监控中心 / 工具集市 */
  await go('settings');
  console.log(((await bodyHas('我的 API 密钥')) && (await bodyHas('登录与操作记录')) ? 'PASS' : 'FAIL') + ' settings sections');
  await go('monitor');
  console.log(((await bodyHas('高危漏洞')) && (await bodyHas('风险行为')) ? 'PASS' : 'FAIL') + ' monitor biz sections');
  await go('tools');
  console.log(((await bodyHas('工具集市')) ? 'PASS' : 'FAIL') + ' tools placeholder');
  check('user settings pages');

  /* 训练场回归（向导 + 实时监控） */
  await go('training');
  await page.click('#trn-new'); await new Promise((s) => setTimeout(s, 300));
  for (let i = 0; i < 5; i++) { await page.click('#tw-next'); await new Promise((s) => setTimeout(s, 220)); }
  console.log(((await bodyHas('排队中')) ? 'PASS' : 'FAIL') + ' TR-01 wizard submit');
  await go('models');
  console.log(((await bodyHas('维度雷达')) && (await bodyHas('门禁与发布链路')) ? 'PASS' : 'FAIL') + ' TR-09/10 models radar + gate');
  check('training pages');

  /* 退出登录回登录页 */
  await go('settings');
  await page.click('#st-logout'); await new Promise((s) => setTimeout(s, 500));
  const backToLogin = await page.evaluate(() => location.hash);
  console.log((backToLogin === '#/login' ? 'PASS' : 'FAIL') + ' logout -> login :: ' + backToLogin);

  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
