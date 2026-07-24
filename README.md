# AI-Range-Demo

The collaborative Space for AI Safety Range Project

AI 安全攻防演练场（AI Security Range）830 MVP 前端 Demo —— 纯静态单页应用（vanilla JS + hash 路由，无构建依赖）。

## 功能概览

- **任务中心**：评测任务（大模型/智能体安全评测）+ 靶场任务（红蓝攻防演练）；首屏为常驻运行中的电网调度中心攻防演练展示橱窗
- **训练任务**：五条差异化线路并行合成漏洞环境、企业场景、检测数据集、事故现场与 AI 原生靶场；支持暂停、倍速与线路细节展开
- **靶场控制台**：电网/核电双场景网络拓扑，图内直接交互——节点上下线、防护策略配置、添加节点、环境参数 HUD（负载/延迟/攻击速度/智能体并发）、暂停/重置演练
- **数据中心**：任务报告与数据集（错题集、风险日志轨迹），支持 CSV/MD/PDF/PNG 导出（管理员另有题库/环境库管理）
- **资源管理**：题库库、环境库、智能体、网络环境模板
- **新建任务向导**：任务类型 → 评测对象 → 模板市场 分步引导

## 本地运行

```bash
# 方式一：直接用浏览器打开 index.html（纯静态，无跨域请求）
# 方式二：本地起服务
node server.js --port 7100
# 或
python -m http.server 7100
```

访问 http://localhost:7100/

## 文件说明

| 文件 | 说明 |
|---|---|
| `index.html` | 入口页面 |
| `app.js` | 应用逻辑（路由、页面渲染、靶场引擎） |
| `data.js` | 模拟数据（任务、题库、拓扑、攻击剧本） |
| `styles.css` / `tokens.css` | DiscoveryOS 设计系统样式与设计令牌 |
| `training-pipeline.js` / `training-pipeline.css` | 训练任务独立 Tab 的运行状态、交互与作用域样式 |
| `server.js` | 本地预览静态服务器（可选） |
