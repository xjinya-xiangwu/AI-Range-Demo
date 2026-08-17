/* 线上验证：GitHub Pages 是否已是最新版（任务中心含结果确认区块） */
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1920, height: 1080 });
  const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
  const BASE = process.argv[2] || 'https://xjinya-xiangwu.github.io/AI-Range-Demo';
  await page.goto(BASE + '/index.html#/login', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(500);
  await page.click('#lg-go'); await sleep(800);
  await page.goto(BASE + '/index.html#/tasks', { waitUntil: 'networkidle0' });
  await sleep(1000);
  const t = await page.$eval('#view', (e) => e.textContent);
  const nav = await page.$eval('#sidenav', (e) => e.textContent);
  const pending = await page.$$('[data-judge^="confirm:"]');
  console.log('线上任务中心含「结果确认」区块:', /结果确认/.test(t) ? 'YES' : 'NO');
  console.log('线上待确认风险点条数:', pending.length);
  console.log('线上导航无「结果确认」入口:', !/结果确认/.test(nav) ? 'YES' : 'NO');
  console.log('线上已完成列表锁定提示:', /报告与结果未解锁/.test(t) ? 'YES' : 'NO');
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
