'use strict';
const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

for (const route of ['research/training', 'research/compare', 'research/private-data', 'regulatory/evaluations', 'developer/overview', 'developer/datasets', 'developer/pipelines', 'developer/annotation']) {
  assert(app.includes(route), `missing role route ${route}`);
}
for (const label of ['实验室研究员', '监管评测人员', '开发者与企业用户', '切换演示身份']) {
  assert(html.includes(label) || app.includes(label), `missing identity label ${label}`);
}
assert(!html.includes('role-switcher'), 'role switcher must not remain in the sidebar');
assert(!html.includes('角色总览'), 'shared role overview must not remain in navigation');
assert(app.includes("training: ['research/training', 'research/compare', 'research/private-data', 'training-live', 'models', 'settings']"), 'researcher route boundary missing');
assert(app.includes("regulatory: ['regulatory/evaluations', 'workbench', 'confirm', 'range', 'settings']"), 'regulatory route boundary missing');
assert(app.includes("enterprise: ['developer/overview', 'developer/datasets', 'developer/pipelines', 'developer/annotation', 'gateway', 'range-hall', 'range-detail', 'legacy-data', 'settings']"), 'enterprise route boundary missing');
for (const capability of ['训练任务', '评测任务', '数据生产任务', '数据资产', '标注工作台', 'AI 预标注', '数据血缘', '长链路轨迹生产管线', '模型 / 智能体版本对比', '实验室私有数据', '攻击轨迹', '防御响应', '漏洞样本', '安全边界']) {
  assert(app.includes(capability), `missing capability ${capability}`);
}
assert(css.includes('.sb-space') && css.includes('.space-eyebrow') && css.includes('.ai-loop'), 'missing role-space styles');
assert(css.includes('.version-compare') && css.includes('.dataset-taxonomy'), 'missing comparison or dataset taxonomy styles');
assert(css.includes('.landing-chain') && css.includes('.annotation-shell'), 'missing enterprise overview or annotation styles');

const trainingHome = app.slice(app.lastIndexOf('function renderTraining()'), app.indexOf('function renderTrainingCompare930()'));
assert(!trainingHome.includes('version-compare'), 'training home must not embed the full version comparison page');
assert(!trainingHome.includes('private-source-banner'), 'training home must not embed private data management');
for (const label of ['总览', '数据资产', '生产任务', '标注工作台', 'AI 预标注', '数据血缘', '长链路轨迹生产管线', 'Agent 与环境']) assert(app.includes(label), `missing enterprise workspace ${label}`);
assert(!app.includes("['developer/evidence','证据链'"), 'evidence must not remain a top-level enterprise navigation item');
assert(!app.includes("['developer/datasets','数据配方'"), 'data recipe must not remain the enterprise asset label');
assert(!app.includes('knowledgeGraphSvg930'), 'security knowledge graph must be removed');
for (const steps of ['steps:82, targetSteps:120', 'steps:76, targetSteps:110', 'steps:91, targetSteps:140', 'steps:74, targetSteps:105']) assert(app.includes(steps), `missing long trace case ${steps}`);
assert(app.includes('数据飞轮'), 'overview must name the loop 数据飞轮');
assert(app.includes('模拟攻防驱动企业测训一体闭环'), 'overview hero copy missing');
for (const task of ['TRN-2026-0413', 'TRN-2026-0412', 'TRN-2026-0414', 'REG-2026-022']) assert(app.includes(task), `missing training/test lineage ${task}`);
console.log('930 role architecture checks passed');
