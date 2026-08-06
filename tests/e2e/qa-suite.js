/* CYBERSEC RANGE 830 V3.5 · QA 自动化执行套件
 * 执行 tests/docs/01-TEST-CASES.md 定义的全部用例（AAA），
 * 结果写入 tests/docs/templates/TEST-EXECUTION-TRACKING.csv，
 * 失败用例登记 tests/docs/templates/BUG-TRACKING-TEMPLATE.csv。
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:7132/index.html';
const TRACK = path.join(__dirname, '..', 'docs', 'templates', 'TEST-EXECUTION-TRACKING.csv');
const BUGS = path.join(__dirname, '..', 'docs', 'templates', 'BUG-TRACKING-TEMPLATE.csv');
const TODAY = '2026-08-06';

let page, browser;
const results = [];
const bugs = [];
let bugSeq = 1;

const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const go = async (r) => { await page.evaluate((x) => { location.hash = '#/' + x; }, r); await sleep(900); };
const bodyHas = (t) => page.evaluate((x) => document.body.innerText.includes(x), t);
const exists = (sel) => page.evaluate((q) => !!document.querySelector(q), sel);
const textOf = (sel) => page.evaluate((q) => { const el = document.querySelector(q); return el ? el.innerText.trim() : ''; }, sel);
const clickIf = async (sel) => { const el = await page.$(sel); if (el) { await el.click(); return true; } return false; };

async function tc(id, cat, pri, name, fn) {
  let status = 'Pass', note = '';
  try {
    const r = await fn();
    if (r !== true) { status = 'Fail'; note = String(r || 'assertion failed'); }
  } catch (e) { status = 'Fail'; note = (e.message || '').slice(0, 180); }
  if (status === 'Fail') {
    const bugId = 'BUG-' + String(bugSeq++).padStart(3, '0');
    bugs.push([bugId, name, pri, cat, id, 'Open', TODAY, 'QA', '', note, '见 ' + id + ' 测试步骤', '通过', note, 'Windows11/Edge·demo@7132', '', '', '', '', '']);
    results.push([id, cat, pri, name, 2, 'demo running', status, 'Fail', bugId, TODAY, 'QA-auto', note, '']);
    console.log(`FAIL ${id} ${name} :: ${note}`);
  } else {
    results.push([id, cat, pri, name, 2, 'demo running', status, 'Pass', '', TODAY, 'QA-auto', '', '']);
    console.log(`PASS ${id} ${name}`);
  }
}

(async () => {
  browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  /* ══ 1. TC-AUTH ══ */
  await page.goto(BASE + '#/dashboard', { waitUntil: 'networkidle0' });
  await sleep(600);
  await tc('TC-AUTH-001', 'AUTH', 'P0', '未登录访问内页被拦截', async () =>
    (await page.evaluate(() => location.hash)) === '#/login' || '未重定向到登录页');
  await tc('TC-AUTH-002', 'AUTH', 'P2', '登录页三模式切换', async () => {
    await clickIf('[data-lg="forgot"]'); await sleep(250);
    const f = await bodyHas('找回密码') || await bodyHas('发送找回链接');
    await clickIf('[data-lg="login"]'); await sleep(250);
    await clickIf('[data-lg="register"]'); await sleep(250);
    const r = await bodyHas('注册');
    await clickIf('[data-lg="login"]'); await sleep(250);
    return (f && r) || '模式切换异常';
  });
  await tc('TC-AUTH-003', 'AUTH', 'P0', 'SSO 登录落地首页', async () => {
    await page.click('#lg-go'); await sleep(800);
    return (await page.evaluate(() => location.hash)) === '#/dashboard' || '未落地首页';
  });
  await tc('TC-AUTH-004', 'AUTH', 'P1', '退出登录回登录页', async () => {
    await go('settings'); await page.click('#st-logout'); await sleep(600);
    const h = await page.evaluate(() => location.hash);
    await page.click('#lg-go'); await sleep(700);
    return h === '#/login' || '未回登录页';
  });
  await tc('TC-AUTH-005', 'AUTH', 'P2', '会话保持', async () => {
    await go('tasks');
    return (await page.evaluate(() => location.hash)) === '#/tasks' || '会话丢失';
  });

  /* ══ 2. TC-NAV ══ */
  await tc('TC-NAV-001', 'NAV', 'P0', '全路由渲染', async () => {
    const routes = ['dashboard', 'tasks', 'range-hall', 'confirm', 'training', 'training-live', 'models', 'battle', 'data', 'gateway', 'settings', 'monitor', 'tools', 'range'];
    for (const r of routes) {
      await go(r);
      const len = await page.evaluate(() => document.getElementById('view').innerHTML.length);
      if (len < 300) return `${r} 渲染内容过少(${len})`;
    }
    return true;
  });
  await tc('TC-NAV-002', 'NAV', 'P2', '一级分组展开收起', async () => {
    await go('dashboard');
    const before = await page.evaluate(() => document.querySelector('[data-l1="test"] .sb-l2').offsetHeight > 0);
    await page.click('[data-l1="test"] .sb-l1-btn'); await sleep(300);
    const after = await page.evaluate(() => document.querySelector('[data-l1="test"] .sb-l2').offsetHeight > 0);
    await page.click('[data-l1="test"] .sb-l1-btn');
    return (before && !after) || '折叠未生效';
  });
  await tc('TC-NAV-003', 'NAV', 'P2', '侧边栏整体收缩', async () => {
    await page.click('#sb-collapse'); await sleep(300);
    const c = await page.evaluate(() => document.getElementById('sidebar').classList.contains('collapsed'));
    await page.click('#sb-collapse'); await sleep(200);
    return c || '未收缩';
  });
  await tc('TC-NAV-004', 'NAV', 'P1', '每页有返回入口', async () => {
    const map = { tasks: '.page-back', 'range-hall': '.page-back', confirm: '.page-back', training: '.page-back', 'training-live': 'a[href="#/training"]', models: '.page-back', data: '.page-back', gateway: '.page-back', settings: '.page-back', monitor: '.page-back', tools: '#view a[href="#/dashboard"]', battle: '#view a[href="#/dashboard"]', range: 'a[href="#/range-hall"]' };
    for (const [r, sel] of Object.entries(map)) {
      await go(r);
      if (!(await exists(sel))) return `${r} 缺少返回入口`;
    }
    return true;
  });
  await tc('TC-NAV-005', 'NAV', 'P1', '返回指向正确父级', async () => {
    await go('range-hall');
    await page.click('.page-back'); await sleep(700);
    const h1 = await page.evaluate(() => location.hash);
    await go('models');
    await page.click('.page-back'); await sleep(700);
    const h2 = await page.evaluate(() => location.hash);
    return (h1 === '#/tasks' && h2 === '#/training') || `父级错误 ${h1}/${h2}`;
  });
  await tc('TC-NAV-006', 'NAV', 'P2', '导航高亮一致', async () => {
    await go('confirm');
    return (await page.evaluate(() => { const a = document.querySelector('#sidenav a.active'); return a && a.dataset.route === 'confirm'; })) || '高亮错误';
  });
  await tc('TC-NAV-007', 'NAV', 'P2', '主题切换', async () => {
    await page.click('#theme-toggle'); await sleep(300);
    const light = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
    await page.click('#theme-toggle'); await sleep(200);
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    return (light && dark) || '主题切换失败';
  });
  await tc('TC-NAV-008', 'NAV', 'P2', '旧路由别名', async () => {
    await page.evaluate(() => { location.hash = '#/collaborate'; }); await sleep(700);
    const t = await textOf('.page-title');
    return t.includes('结果确认') || '别名未生效';
  });

  /* ══ 3. TC-DASH ══ */
  await go('dashboard');
  await tc('TC-DASH-001', 'DASH', 'P1', '指标带 6 卡跳动', async () => {
    const v0 = await textOf('#ovm-2');
    await sleep(4200);
    const v1 = await textOf('#ovm-2');
    const n = await page.evaluate(() => document.querySelectorAll('.dash-metric').length);
    return (n === 6 && v0 !== v1) || `卡片数 ${n} 或数字未跳动`;
  });
  await tc('TC-DASH-002', 'DASH', 'P1', '拓扑轮播控制', async () => {
    const t0 = await textOf('#dc-viewport');
    await page.click('#dc-next'); await sleep(400);
    const t1 = await textOf('#dc-viewport');
    await page.click('#dc-pause'); await sleep(300);
    const label = await textOf('#dc-pause');
    const ok = t0 !== t1 && label.includes('继续');
    await page.click('#dc-pause');
    return ok || '轮播切换/暂停失败';
  });
  await tc('TC-DASH-003', 'DASH', 'P1', '事件流分级滚动', async () => {
    const n0 = await page.evaluate(() => document.querySelectorAll('#dash-events .ev-line').length);
    await sleep(4500);
    const n1 = await page.evaluate(() => document.querySelectorAll('#dash-events .ev-line').length);
    const lv = await page.evaluate(() => new Set([...document.querySelectorAll('#dash-events .lv')].map((x) => x.textContent)).size);
    return (n1 >= n0 && lv >= 2) || '事件流未滚动或缺分级';
  });
  await tc('TC-DASH-004', 'DASH', 'P1', '拓扑点击进入控制台', async () => {
    await page.evaluate(() => { location.hash = '#/dashboard'; }); await sleep(1500);
    const topo = await page.$('.dc-case-topo');
    if (!topo) return '当前 case 无拓扑（占位场景）';
    await topo.click(); await sleep(900);
    return (await page.evaluate(() => location.hash)) === '#/range' || '未进入控制台';
  });
  await tc('TC-DASH-005', 'DASH', 'P2', '预警条悬停暂停', async () => {
    await go('dashboard');
    await page.hover('.dash-ticker'); await sleep(300);
    const paused = await page.evaluate(() => getComputedStyle(document.querySelector('.tk-track')).animationPlayState === 'paused');
    return paused || '悬停未暂停';
  });
  await tc('TC-DASH-006', 'DASH', 'P2', '训练摘要跳转', async () => {
    await page.click('#ov-train-card'); await sleep(800);
    return (await page.evaluate(() => location.hash)) === '#/training-live' || '未跳转';
  });
  await tc('TC-DASH-007', 'DASH', 'P1', '右栏三卡渲染', async () => {
    await go('dashboard');
    return ((await bodyHas('527')) && (await bodyHas('PentAGI')) && (await bodyHas('12')) && (await bodyHas('红蓝实时对抗'))) || '右栏卡片缺失';
  });

  /* ══ 4. TC-TASK ══ */
  await go('tasks');
  await tc('TC-TASK-002', 'TASK', 'P1', '类型必选互斥', async () => {
    await page.click('#btn-new-task'); await sleep(400);
    await page.click('#tw2-next'); await sleep(300);
    const toast = await bodyHas('请选择任务类型');
    const step1 = await bodyHas('任务类型');
    await page.click('#tw2-cancel'); await sleep(200);
    return (toast && step1) || '未拦截空类型';
  });
  await tc('TC-TASK-001', 'TASK', 'P0', '创建向导四步走通', async () => {
    await page.click('#btn-new-task'); await sleep(400);
    await page.click('[data-tw2type="range"]'); await sleep(200);
    await page.click('#tw2-next'); await sleep(300);
    await page.click('[data-tw2env="nuclear"]'); await sleep(200);
    await page.click('#tw2-next'); await sleep(300);
    await tc('TC-TASK-005', 'TASK', 'P1', '外部列表仅校验通过', async () => {
      await page.click('[data-tw2tab="external"]'); await sleep(300);
      const hasRedbot = await page.evaluate(() => document.getElementById('tw2-model').innerText.includes('RedBot'));
      await page.click('[data-tw2tab="builtin"]'); await sleep(200);
      return !hasRedbot || '未校验对象出现在外部列表';
    });
    await page.click('#tw2-next'); await sleep(300);
    await tc('TC-TASK-006', 'TASK', 'P1', '约束四项可调', async () => {
      const before = await textOf('#tw2c-token');
      await page.evaluate(() => { const r = document.querySelector('[data-tw2c="token"]'); r.value = 66; r.dispatchEvent(new Event('input')); });
      const after = await textOf('#tw2c-token');
      return (before !== after && after.includes('66')) || '约束滑杆未生效';
    });
    await page.click('#tw2-next'); await sleep(500);
    return (await bodyHas('任务已成功提交')) || '无提交成功弹窗';
  });
  await tc('TC-TASK-007', 'TASK', 'P0', '提交入队可观察', async () => {
    await page.click('#tw2-done-run'); await sleep(1200);
    return ((await page.evaluate(() => location.hash)) === '#/workbench' && (await bodyHas('攻击链里程碑'))) || '未进入执行页';
  });
  await tc('TC-TASK-003', 'TASK', 'P1', '跳靶场大厅配置保留', async () => {
    await go('tasks'); await page.click('#btn-new-task'); await sleep(400);
    await page.click('[data-tw2type="range"]'); await sleep(200);
    await page.click('#tw2-next'); await sleep(300);
    await page.click('[data-tw2env="nuclear"]'); await sleep(200);
    await page.click('#tw2-hall'); await sleep(800);
    const atHall = (await page.evaluate(() => location.hash)) === '#/range-hall';
    await page.click('#hall-new'); await sleep(400);
    await page.click('#tw2-next'); await sleep(300);
    const kept = await page.evaluate(() => {
      const sel = document.querySelector('[data-tw2env="nuclear"]');
      return sel && sel.classList.contains('selected');
    });
    await page.click('#tw2-cancel'); await sleep(200);
    return (atHall && kept) || '配置未保留';
  });
  await tc('TC-TASK-004', 'TASK', 'P1', '评测题集只读可选', async () => {
    await go('tasks');
    await page.click('#btn-new-task'); await sleep(400);
    await page.click('[data-tw2type="eval"]'); await sleep(200);
    await page.click('#tw2-next'); await sleep(300);
    const radios = await page.evaluate(() => document.querySelectorAll('input[name="tw2-qs"]').length);
    const noUpload = !(await exists('#dc-upload'));
    await page.click('#tw2-cancel'); await sleep(200);
    return (radios === 4 && noUpload) || `题集数 ${radios}`;
  });
  await tc('TC-TASK-008', 'TASK', 'P1', '队列点击进入执行', async () => {
    await go('tasks');
    await page.click('[data-sim="0"]'); await sleep(1200);
    return (await page.evaluate(() => location.hash)) === '#/workbench' || '未进入执行详情';
  });
  await tc('TC-TASK-009', 'TASK', 'P2', '再次启动沿用配置', async () => {
    await go('tasks');
    await page.click('[data-again]'); await sleep(500);
    const open = await exists('.modal');
    const pre = await page.evaluate(() => !!document.querySelector('[data-tw2type].selected'));
    await page.click('#tw2-cancel'); await sleep(200);
    return (open && pre) || '向导未带预选配置';
  });
  await tc('TC-TASK-010', 'TASK', 'P2', '查看报告跳结果确认', async () => {
    await page.click('[data-report2]'); await sleep(800);
    return (await page.evaluate(() => location.hash)) === '#/confirm' || '未跳结果确认';
  });

  await tc('TC-TASK-011', 'TASK', 'P1', '运行中与已完成列表分区且置顶演示任务在列', async () => {
    await go('tasks');
    const heads = await bodyHas('运行中任务列表') && await bodyHas('已完成任务列表') && await bodyHas('置顶演示任务');
    const firstJob = await page.evaluate(() => { const r = document.querySelector('.res-table-wrap tbody tr .mono'); return r ? r.innerText : ''; });
    return (heads && firstJob.includes('JOB-20260806-021')) || '分区或置顶异常 :: ' + firstJob;
  });
  await tc('TC-TASK-012', 'TASK', 'P2', '队列搜索过滤', async () => {
    await go('tasks');
    await page.type('#tq-q', 'Cybench'); await sleep(600);
    const rows = await page.evaluate(() => document.querySelectorAll('.res-table-wrap')[0].querySelectorAll('tbody tr').length);
    const has = await bodyHas('Cybench 夺旗评测');
    await page.evaluate(() => { document.getElementById('tq-q').value = ''; });
    return (rows === 1 && has) || `搜索结果异常 rows=${rows}`;
  });

  /* ══ 5. TC-RUN ══ */
  await go('tasks'); await page.click('[data-sim="0"]'); await sleep(1500);
  await tc('TC-RUN-001', 'RUN', 'P1', '里程碑条推进', async () => {
    const s0 = await textOf('.mss-score');
    await sleep(9000);
    const s1 = await textOf('.mss-score');
    return s0 !== s1 || '里程碑得分未变化';
  });
  await tc('TC-RUN-002', 'RUN', 'P1', '拓扑点亮与事件同步', async () => {
    const lit = await page.evaluate(() => document.querySelectorAll('#topo-svg .topo-node.active, #topo-svg .topo-node.owned').length);
    const term = await page.evaluate(() => document.getElementById('term-out').innerText.length > 30);
    return (lit > 0 && term) || '拓扑未点亮或终端无输出';
  });
  await tc('TC-RUN-003', 'RUN', 'P0', '左栏实时研判窗', async () => {
    return ((await bodyHas('实时研判')) && (await exists('#wb-judge .wbj-item'))) || '研判窗无内容';
  });
  await tc('TC-RUN-004', 'RUN', 'P0', '预确认状态同步', async () => {
    const before = await page.evaluate(() => document.querySelectorAll('#wb-judge [data-wbj]').length);
    if (!before) return '研判窗无待确认项';
    await page.click('#wb-judge [data-wbj]'); await sleep(500);
    await go('confirm');
    const synced = await page.evaluate(() => document.querySelectorAll('[data-ticket] .badge.badge-olive').length > 0);
    return synced || '结果确认页未同步办结';
  });
  await tc('TC-RUN-005', 'RUN', 'P1', '暂停/恢复/结束', async () => {
    await go('tasks'); await page.click('[data-sim="0"]'); await sleep(1200);
    await page.click('#btn-pause'); await sleep(300);
    const p = await textOf('#btn-pause');
    await page.click('#btn-pause'); await sleep(300);
    await page.click('#btn-end'); await sleep(800);
    const settle = await bodyHas('任务结算');
    await clickIf('[data-back]'); await sleep(500);
    return (p === '恢复' && settle) || '暂停/结算异常';
  });
  await tc('TC-RUN-006', 'RUN', 'P2', '空状态有出口', async () => {
    await page.evaluate(() => { sessionStorage.removeItem('aisr-running'); location.hash = '#/workbench'; }); await sleep(800);
    return ((await bodyHas('暂无运行中的任务')) && (await exists('a[href="#/tasks"]'))) || '空状态缺出口';
  });

  /* ══ 6. TC-CONF ══ */
  await go('confirm');
  await tc('TC-CONF-001', 'CONF', 'P0', '工单确认办结', async () => {
    const n0 = await page.evaluate(() => document.querySelectorAll('[data-judge^="confirm:"]').length);
    if (!n0) return '无待确认工单';
    await page.click('[data-judge^="confirm:"]'); await sleep(500);
    return (await bodyHas('已办结 · 终审归档')) || '状态未流转';
  });
  await tc('TC-CONF-002', 'CONF', 'P1', '改判待二审', async () => {
    const btn = await page.$('[data-judge^="revise:"]');
    if (!btn) return '无可改判工单';
    await btn.click(); await sleep(300);
    await page.click('#jg-revise-ok'); await sleep(500);
    const rev = await bodyHas('改判待二审');
    const ap = await page.$('[data-judge^="approve:"]');
    if (ap) { await ap.click(); await sleep(500); }
    return rev || '改判状态未出现';
  });
  await tc('TC-CONF-003', 'CONF', 'P1', '驳回重判', async () => {
    const btn = await page.$('[data-judge^="reject:"]');
    if (!btn) return '无可驳回工单';
    await btn.click(); await sleep(500);
    const rej = await bodyHas('已驳回');
    const rs = await page.$('[data-judge^="rescore:"]');
    if (rs) { await rs.click(); await sleep(500); }
    return rej || '驳回状态未出现';
  });
  await tc('TC-CONF-004', 'CONF', 'P0', '闸门禁用提示', async () => {
    const open = await page.evaluate(() => document.querySelectorAll('[data-ticket]').length);
    const doneAll = await page.evaluate(() => [...document.querySelectorAll('[data-ticket] .tk-state .badge')].every((b) => b.innerText.includes('已办结')));
    if (doneAll) return true; /* 已全部办结时跳到 TC-CONF-005 语义 */
    const disabled = await page.evaluate(() => { const b = document.getElementById('jg-report'); return b === null || b.disabled; });
    const hint = await bodyHas('剩余');
    return ((disabled || !(await exists('#jg-report'))) && hint) || '闸门未禁用/无提示';
  });
  await tc('TC-CONF-005', 'CONF', 'P0', '办结后置亮', async () => {
    for (let i = 0; i < 12; i++) {
      const btn = await page.$('[data-judge^="confirm:"]');
      if (!btn) break;
      await btn.click(); await sleep(400);
      const ap = await page.$('[data-judge^="approve:"]');
      if (ap) { await ap.click(); await sleep(400); }
      const rs = await page.$('[data-judge^="rescore:"]');
      if (rs) { await rs.click(); await sleep(400); await page.click('[data-judge^="confirm:"]').catch(() => {}); await sleep(400); }
    }
    const enabled = await page.evaluate(() => { const b = document.getElementById('jg-report'); return b && !b.disabled; });
    if (enabled) { await page.click('#jg-report'); await sleep(400); }
    return enabled || '全部办结后闸门仍禁用';
  });
  await tc('TC-CONF-006', 'CONF', 'P1', '研判详情弹窗', async () => {
    await page.click('[data-ticket]'); await sleep(400);
    const ok = (await bodyHas('SHA256')) && (await bodyHas('争议焦点')) && (await bodyHas('轨迹回放'));
    await page.click('.modal-x'); await sleep(300);
    return ok || '详情弹窗字段缺失';
  });
  await tc('TC-CONF-007', 'CONF', 'P1', '查看报告弹窗', async () => {
    await page.click('[data-rpt-view]'); await sleep(400);
    const ok = (await bodyHas('高阶结论')) && (await bodyHas('执行步骤'));
    await page.click('.modal-x'); await sleep(300);
    return ok || '报告弹窗字段缺失';
  });
  await tc('TC-CONF-008', 'CONF', 'P1', '结果分析弹窗', async () => {
    await page.click('[data-rpt-ana]'); await sleep(400);
    const ok = (await bodyHas('三维评分')) && (await bodyHas('资源与预算')) && (await bodyHas('关键行动时间线'));
    await page.click('.modal-x'); await sleep(300);
    return ok || '分析弹窗字段缺失';
  });
  await tc('TC-CONF-009', 'CONF', 'P2', '批量导出', async () => {
    await page.click('.rpt-check'); await sleep(200);
    await page.click('#rpt-batch'); await sleep(400);
    return (await bodyHas('已导出')) || '无导出反馈';
  });
  await tc('TC-CONF-010', 'CONF', 'P3', '导入训练中心反馈', async () => {
    await page.click('[data-rpt-ana]'); await sleep(400);
    await page.click('#ra-import'); await sleep(300);
    const ok = await bodyHas('已导入训练中心');
    await page.click('.modal-x'); await sleep(200);
    return ok || '无导入反馈';
  });

  /* ══ 7. TC-TRAIN ══ */
  await go('training');
  await tc('TC-TRAIN-001', 'TRAIN', 'P0', '5 步向导提交', async () => {
    await page.click('#trn-new'); await sleep(400);
    for (let i = 0; i < 5; i++) { await page.click('#tw-next'); await sleep(250); }
    await sleep(500);
    return (await bodyHas('排队中')) || '任务未入队';
  });
  await tc('TC-TRAIN-002', 'TRAIN', 'P1', '列表四态与跳动', async () => {
    const s0 = await page.evaluate(() => [...document.querySelectorAll('[id^="trn-step-"]')].map((x) => x.innerText).join('|'));
    await sleep(4200);
    const s1 = await page.evaluate(() => [...document.querySelectorAll('[id^="trn-step-"]')].map((x) => x.innerText).join('|'));
    return (s0 !== s1 && (await bodyHas('已完成'))) || '进度未跳动';
  });
  await tc('TC-TRAIN-003', 'TRAIN', 'P2', '流水线阶段说明', async () => {
    await page.click('[data-pipe="1"]'); await sleep(300);
    const d = await textOf('#pipe-desc');
    return d.includes('向导') || '阶段说明未切换';
  });
  await tc('TC-TRAIN-004', 'TRAIN', 'P1', '12 项标量曲线', async () => {
    await go('training-live');
    const n = await page.evaluate(() => document.querySelectorAll('.scalar-card').length);
    const v0 = await textOf('#tl-val-0');
    await sleep(4200);
    const v1 = await textOf('#tl-val-0');
    return (n === 12 && v0 !== v1) || `曲线数 ${n}`;
  });
  await tc('TC-TRAIN-005', 'TRAIN', 'P1', 'GPU 监控与日志', async () => {
    const g = await page.evaluate(() => document.querySelectorAll('#tl-gpu .gpu-cell').length);
    const l = await page.evaluate(() => document.querySelectorAll('#tl-logs div').length);
    return (g === 8 && l > 5) || 'GPU/日志渲染不足';
  });
  await tc('TC-TRAIN-006', 'TRAIN', 'P1', '模型中心完整性', async () => {
    await go('models');
    return ((await bodyHas('门禁与发布链路')) && (await bodyHas('版本谱系')) && (await bodyHas('版本演进')) && (await exists('.radar-wrap svg')) && (await bodyHas('模型排行榜'))) || '模型中心区块缺失';
  });
  await tc('TC-TRAIN-007', 'TRAIN', 'P2', 'Checkpoint 跳监控', async () => {
    await page.click('[data-ckpt]'); await sleep(800);
    return (await page.evaluate(() => location.hash)) === '#/training-live' || '未跳转';
  });

  /* ══ 8. TC-GW ══ */
  await go('gateway');
  await tc('TC-GW-001', 'GW', 'P1', '默认页仪表盘', async () => {
    const tab = await textOf('[data-gw-tab].active');
    return (tab.includes('外部模型') && (await bodyHas('累计执行任务')) && (await bodyHas('总成本金额'))) || '默认页仪表盘缺失';
  });
  await tc('TC-GW-002', 'GW', 'P1', '外部列表数据列', async () => {
    return ((await bodyHas('3,240 万')) && (await bodyHas('4.1 万条'))) || '外部列表数据列缺失';
  });
  await tc('TC-GW-003', 'GW', 'P0', '创建密钥全流程', async () => {
    await page.click('#gw-new'); await sleep(300);
    await page.click('#gw-create'); await sleep(300);
    const full = await page.evaluate(() => { const pre = document.querySelector('.modal pre'); return pre && pre.innerText.startsWith('sk-air-') && pre.innerText.length > 20; });
    await page.click('#gw-done'); await sleep(500);
    return full || '完整密钥未展示';
  });
  await tc('TC-GW-004', 'GW', 'P1', '吊销密钥', async () => {
    await page.click('[data-gw-tab="keys"]'); await sleep(400);
    await page.click('[data-gw-revoke]'); await sleep(500);
    return (await bodyHas('已吊销')) || '吊销未生效';
  });
  await tc('TC-GW-005', 'GW', 'P1', '接入校验流程', async () => {
    await page.click('[data-gw-tab="verify"]'); await sleep(400);
    await page.click('#ag-verify-go'); await sleep(8500);
    return (await bodyHas('校验通过')) || '校验流程未完成';
  });
  await tc('TC-GW-006', 'GW', 'P2', '会话详情', async () => {
    await page.click('[data-gw-tab="sessions"]'); await sleep(400);
    await page.click('[data-ag-ses="0"]'); await sleep(300);
    const ok = (await bodyHas('交互轮次')) && (await bodyHas('结果摘要'));
    await page.click('.modal-x'); await sleep(200);
    return ok || '会话详情缺失';
  });
  await tc('TC-GW-007', 'GW', 'P2', '接入文档复制', async () => {
    await page.click('[data-gw-tab="docs"]'); await sleep(400);
    await page.click('[data-gw-copycode="0"]'); await sleep(300);
    return (await bodyHas('已复制')) || '复制无反馈';
  });
  await tc('TC-GW-008', 'GW', 'P2', '接口中心文档', async () => {
    await page.click('[data-gw-tab="api"]'); await sleep(400);
    return ((await bodyHas('接入流程')) && (await bodyHas('model_name')) && (await bodyHas('双平面隔离'))) || '接口文档不完整';
  });

  /* ══ 9. TC-DATA ══ */
  await go('data');
  await tc('TC-DATA-001', 'DATA', 'P1', '数据量仪表盘', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.dash-metric').length);
    return (n === 6 && (await bodyHas('12.5 万条'))) || '仪表盘卡片不足';
  });
  await tc('TC-DATA-002', 'DATA', 'P2', '轨迹数据集导出', async () => {
    await page.click('[data-dc-traj]'); await sleep(300);
    return (await bodyHas('已导出')) || '无导出反馈';
  });
  await tc('TC-DATA-003', 'DATA', 'P2', '风险数据集导出', async () => {
    await page.click('[data-dc-risk]'); await sleep(300);
    return (await bodyHas('已导出')) || '无导出反馈';
  });
  await tc('TC-DATA-004', 'DATA', 'P1', '题集上传', async () => {
    await page.type('#dc-name', 'QA 回归题集');
    await page.click('#dc-upload'); await sleep(500);
    return (await bodyHas('QA 回归题集')) || '题集未入列';
  });
  await tc('TC-DATA-005', 'DATA', 'P3', '题集样例下载', async () => {
    await page.click('[data-dc-dl]'); await sleep(300);
    return (await bodyHas('已下载')) || '无下载反馈';
  });

  /* ══ 10. TC-SET ══ */
  await tc('TC-SET-002', 'SET', 'P1', '密钥数据同源', async () => {
    await go('settings');
    return (await bodyHas('sk-air-')) || '个人中心未显示密钥';
  });
  await tc('TC-SET-001', 'SET', 'P1', '个人中心四区块', async () => {
    return ((await bodyHas('个人资料')) && (await bodyHas('安全设置')) && (await bodyHas('我的 API 密钥')) && (await bodyHas('登录与操作记录'))) || '区块缺失';
  });
  await tc('TC-SET-003', 'SET', 'P1', '监控中心三类监控', async () => {
    await go('monitor');
    return ((await bodyHas('高危漏洞')) && (await bodyHas('风险行为')) && (await bodyHas('流量'))) || '监控区块缺失';
  });
  await tc('TC-SET-004', 'SET', 'P3', '工具集市占位可达', async () => {
    await go('tools');
    return ((await bodyHas('工具集市')) && (await exists('#view a[href="#/dashboard"]'))) || '占位页异常';
  });

  /* ══ 11. TC-SEC ══ */
  await tc('TC-SEC-001', 'SEC', 'P0', 'XSS·向导任务名', async () => {
    await page.evaluate(() => { window.__xss = false; window.alert = () => { window.__xss = true; }; });
    await go('training'); await page.click('#trn-new'); await sleep(400);
    await page.evaluate(() => { document.getElementById('tw-name').value = '<img src=x onerror=alert(1)>'; document.getElementById('tw-name').dispatchEvent(new Event('input')); });
    for (let i = 0; i < 5; i++) { await page.click('#tw-next'); await sleep(250); }
    await sleep(600);
    const fired = await page.evaluate(() => window.__xss);
    return !fired || 'XSS 被执行';
  });
  await tc('TC-SEC-002', 'SEC', 'P0', 'XSS·题集名称', async () => {
    await go('data');
    await page.evaluate(() => { document.getElementById('dc-name').value = '<svg onload=alert(1)>'; });
    await page.click('#dc-upload'); await sleep(500);
    const fired = await page.evaluate(() => window.__xss);
    return !fired || 'XSS 被执行';
  });
  await tc('TC-SEC-003', 'SEC', 'P1', 'XSS·密钥名称', async () => {
    await go('gateway'); await page.click('[data-gw-tab="keys"]'); await sleep(400);
    await page.click('#gw-new'); await sleep(300);
    await page.evaluate(() => { document.getElementById('gw-name').value = '<b onclick=alert(1)>x</b>'; });
    await page.click('#gw-create'); await sleep(300);
    await page.click('#gw-done'); await sleep(500);
    const fired = await page.evaluate(() => window.__xss);
    return !fired || 'XSS 被执行';
  });
  await tc('TC-SEC-004', 'SEC', 'P0', '鉴权绕过', async () => {
    await page.evaluate(() => sessionStorage.removeItem('cr-auth'));
    await page.evaluate(() => { location.hash = '#/data'; }); await sleep(700);
    const h = await page.evaluate(() => location.hash);
    await page.evaluate(() => sessionStorage.setItem('cr-auth', '1'));
    await go('dashboard');
    return h === '#/login' || '未拦截';
  });
  await tc('TC-SEC-005', 'SEC', 'P1', '密钥不泄露', async () => {
    await go('settings');
    const html = await page.content();
    const fullKeys = (html.match(/sk-air-[0-9a-f]{20,}/g) || []);
    return fullKeys.length === 0 || '页面存在完整密钥';
  });
  await tc('TC-SEC-006', 'SEC', 'P1', '完整密钥单次展示', async () => {
    await go('gateway'); await page.click('[data-gw-tab="keys"]'); await sleep(400);
    const html = await page.content();
    const fullKeys = (html.match(/sk-air-[0-9a-f]{20,}/g) || []);
    return fullKeys.length === 0 || '完整密钥可再次查看';
  });
  await tc('TC-SEC-007', 'SEC', 'P1', '无明文密码', async () => {
    const dump = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }).toLowerCase());
    return (!dump.includes('password') && !dump.includes('passwd')) || '存储含密码字段';
  });
  await tc('TC-SEC-008', 'SEC', 'P2', '第三方脚本审计', async () => {
    const srcs = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.src));
    const bad = srcs.filter((u) => !u.startsWith('http://127.0.0.1'));
    return bad.length === 0 || '存在外部脚本: ' + bad.join(',');
  });

  /* ══ 12. TC-ADP ══ */
  await tc('TC-ADP-001', 'ADP', 'P1', '1920 无横向滚动', async () => {
    for (const r of ['dashboard', 'confirm', 'training-live', 'gateway', 'data']) {
      await go(r);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (ov) return `${r} 横向溢出`;
    }
    return true;
  });
  await tc('TC-ADP-002', 'ADP', 'P1', '1600 无横向滚动', async () => {
    await page.setViewport({ width: 1600, height: 900 });
    for (const r of ['dashboard', 'confirm', 'training-live']) {
      await go(r);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (ov) return `${r}@1600 横向溢出`;
    }
    return true;
  });
  await tc('TC-ADP-003', 'ADP', 'P1', '1366 无横向滚动', async () => {
    await page.setViewport({ width: 1366, height: 768 });
    for (const r of ['dashboard', 'confirm', 'training-live']) {
      await go(r);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (ov) return `${r}@1366 横向溢出`;
    }
    await page.setViewport({ width: 1920, height: 1080 });
    return true;
  });
  await tc('TC-ADP-004', 'ADP', 'P2', '收缩侧边栏布局', async () => {
    await page.click('#sb-collapse'); await sleep(300);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await page.click('#sb-collapse'); await sleep(200);
    return !ov || '收缩后溢出';
  });

  /* ══ 写盘：追踪 CSV + 缺陷 CSV ══ */
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const trackCsv = ['Test Case ID,Category,Priority,Test Name,Estimated Time (min),Prerequisites,Status,Result,Bug ID,Execution Date,Executed By,Notes,Screenshot/Log']
    .concat(results.map((r) => r.map(q).join(','))).join('\r\n');
  fs.writeFileSync(TRACK, '﻿' + trackCsv, 'utf-8');
  if (bugs.length) {
    const bugCsv = bugs.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
    fs.appendFileSync(BUGS, bugCsv, 'utf-8');
  }
  if (pageErrors.length) console.log('PAGEERRORS:', pageErrors.slice(0, 5));
  const pass = results.filter((r) => r[7] === 'Pass').length;
  console.log(`\n== 执行完成：${pass}/${results.length} 通过，${bugs.length} 个缺陷已登记 ==`);
  await browser.close();
})().catch(async (e) => { console.error('FATAL', e); if (browser) await browser.close(); process.exit(1); });
