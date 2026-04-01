# 天机阁 · 技术详解文档

> 本文档面向初级程序员，详细解释项目中用到的每一项技术、每一个文件的作用，以及它们是如何协作的。如果你能完整读懂这份文档并理解对应代码，你将掌握构建一个**完整全栈 Web 应用**的核心知识。

---

## 目录

- [一、项目总览](#一项目总览)
- [二、技术栈详解](#二技术栈详解)
- [三、项目结构逐文件拆解](#三项目结构逐文件拆解)
- [四、后端核心模块深入](#四后端核心模块深入)
- [五、前端核心模块深入](#五前端核心模块深入)
- [六、前后端数据交互流程](#六前后端数据交互流程)
- [七、关键编程概念详解](#七关键编程概念详解)
- [八、安全设计](#八安全设计)
- [九、如何运行与调试](#九如何运行与调试)
- [十、延伸学习路线](#十延伸学习路线)

---

## 一、项目总览

### 1.1 这个项目做了什么？

「天机阁」是一个 **AI 八字运势分析** Web 应用。它的工作流程是：

```
用户输入出生年月日、时辰、性别
       ↓
后端通过「农历转换库」计算出四柱八字、五行分布
       ↓
将八字信息组装成 Prompt，发送给 DeepSeek AI 大模型
       ↓
AI 生成运势分析文本，通过 SSE（流式传输）实时推送到浏览器
       ↓
前端逐字渲染（打字机效果），展示给用户
```

### 1.2 架构图

```
┌──────────────────────────────────────────────┐
│            浏览器（前端/客户端）                │
│                                              │
│  index.html ── style.css ── app.js           │
│         │                                    │
│         │  localStorage (查询历史 + 主题偏好)  │
└─────────┼────────────────────────────────────┘
          │  HTTP 请求 / SSE 流式响应
          ▼
┌──────────────────────────────────────────────┐
│          Node.js 服务端（后端/服务端）          │
│                                              │
│  server.js ─── 路由 + 中间件 + SSE 推送       │
│       │                                      │
│       ├── utils/bazi.js    八字计算引擎        │
│       ├── utils/prompt.js  AI 提示词构建       │
│       └── utils/logger.js  API 调用日志        │
│                                              │
│  tunnel.js ─── 公网隧道（可选）                │
└─────────┼────────────────────────────────────┘
          │  HTTPS 请求
          ▼
┌──────────────────────────────────────────────┐
│          DeepSeek AI（第三方 API）             │
│     (兼容 OpenAI 格式的大语言模型服务)          │
└──────────────────────────────────────────────┘
```

### 1.3 这个项目能学到什么？

| 知识领域 | 具体技能 |
|---------|---------|
| **Node.js 后端** | Express 5 框架、路由设计、中间件机制、环境变量管理 |
| **API 设计** | RESTful 接口、输入校验、错误处理 |
| **实时通信** | SSE（Server-Sent Events）流式传输 |
| **AI 集成** | OpenAI SDK 使用、Prompt 工程、流式调用 |
| **前端开发** | 原生 JS DOM 操作、Fetch API、事件处理、Markdown 渲染 |
| **CSS 进阶** | CSS 变量、主题切换、响应式布局、动画 |
| **工程实践** | 模块化、日志系统、安全防护、一键部署脚本 |

---

## 二、技术栈详解

### 2.1 Node.js — JavaScript 运行时

**是什么？**
Node.js 让你可以在服务器端（而不仅仅是浏览器中）运行 JavaScript。它基于 Chrome 的 V8 引擎，非常适合构建 I/O 密集型的网络应用。

**在本项目中的作用：** 运行整个后端服务器，处理 HTTP 请求、调用 AI API、文件读写等。

**核心概念：**
- **模块系统（CommonJS）**：用 `require()` 导入模块，`module.exports` 导出模块。这是 Node.js 组织代码的基本方式
- **npm（包管理器）**：通过 `npm install` 安装第三方库，依赖声明在 `package.json`
- **异步非阻塞 I/O**：Node.js 的核心优势，不会因为等待一个请求就阻塞整个服务器

```javascript
// CommonJS 模块导入示例（本项目使用的方式）
const express = require('express');          // 导入第三方模块
const { calculateBazi } = require('./utils/bazi');  // 导入本地模块
```

> 📖 官方文档：https://nodejs.org/docs/latest/api/

---

### 2.2 Express 5 — Web 框架

**是什么？**
Express 是 Node.js 最流行的 Web 框架。它提供了路由（URL → 处理函数的映射）、中间件（请求预处理管道）等核心能力，让构建 Web 服务变得非常简单。

**在本项目中的作用：**
- 托管前端静态文件（HTML/CSS/JS）
- 定义 API 路由（`/api/bazi`、`/api/fortune` 等）
- 注入中间件（CORS、速率限制、JSON 解析）

**核心概念：**

```javascript
const express = require('express');
const app = express();  // 创建一个 Express 应用实例

// 「中间件」—— 请求到达路由处理函数之前的预处理管道
// 每个中间件按 app.use() 的注册顺序依次执行
app.use(cors());                    // 中间件 1：允许跨域请求
app.use(express.json());            // 中间件 2：自动解析请求体中的 JSON
app.use(express.static('public'));  // 中间件 3：将 public/ 目录作为静态资源托管

// 「路由」—— 定义 URL + HTTP 方法 → 处理函数的映射
app.get('/api/shichen', (req, res) => {   // GET 请求 /api/shichen
  res.json(data);                          // 返回 JSON 响应
});

app.post('/api/bazi', (req, res) => {     // POST 请求 /api/bazi
  const { year, month } = req.body;        // 从请求体中取参数
  // ... 处理逻辑
  res.json(result);
});

app.listen(3000);  // 在 3000 端口启动服务器，开始监听请求
```

**中间件执行流程：**
```
客户端请求 → cors() → express.json() → express.static() → 路由处理函数 → 响应
```

> 📖 官方文档：https://expressjs.com/
> 📖 Express 5 迁移指南：https://expressjs.com/en/guide/migrating-5.html

---

### 2.3 dotenv — 环境变量管理

**是什么？**
dotenv 是一个零依赖的模块，它从项目根目录的 `.env` 文件中读取键值对，加载到 `process.env` 中。

**为什么需要它？**
API Key 等敏感信息**绝对不能**写在代码里（否则提交到 Git 就泄露了）。正确做法是把它们放在 `.env` 文件中，再通过 `.gitignore` 忽略 `.env` 文件。

```bash
# .env 文件内容（不会被提交到 Git）
DEEPSEEK_API_KEY=sk-你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
PORT=3000
```

```javascript
// 在代码入口加载
require('dotenv').config();

// 之后就可以通过 process.env 读取
const apiKey = process.env.DEEPSEEK_API_KEY;
const port = process.env.PORT || 3000;  // || 用于设置默认值
```

> 📖 官方文档：https://github.com/motdotla/dotenv

---

### 2.4 OpenAI SDK — AI API 客户端

**是什么？**
OpenAI 官方提供的 JavaScript SDK。由于 DeepSeek 的 API 格式与 OpenAI 完全兼容，所以只需把 `baseURL` 改为 DeepSeek 的地址，同一个 SDK 就能直接使用。

**核心概念：**

```javascript
const OpenAI = require('openai');

// 初始化客户端，这里指向 DeepSeek（而不是 OpenAI）
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',  // 关键：改为 DeepSeek 的 API 地址
});

// 调用 AI 对话接口（流式模式）
const stream = await client.chat.completions.create({
  model: 'deepseek-chat',       // 使用的模型名称
  messages: [                    // 对话消息数组
    { role: 'system', content: '你是一个...' },  // 系统设定（AI 角色定义）
    { role: 'user', content: '帮我分析...' },    // 用户输入
  ],
  stream: true,                  // 开启流式输出（逐字返回，而非等全部生成完再返回）
  temperature: 0.85,             // 创造性参数（0=确定性，1=更随机/创造性）
  max_tokens: 3000,              // 最大输出 token 数
});

// 流式消费返回结果
for await (const chunk of stream) {
  const text = chunk.choices[0]?.delta?.content;
  if (text) console.log(text);  // 每次只拿到一小段文字
}
```

**什么是 temperature？**
- `0`：AI 每次都给出最确定的答案（适合代码生成、事实性问答）
- `0.85`（本项目使用）：较高的创造性，让命理分析用词更丰富、有文学性
- `1`：最大随机性

**什么是 token？**
AI 模型处理文本的基本单位。一个汉字通常是 1-2 个 token。`max_tokens: 3000` 意味着 AI 最多输出大约 1500-3000 个汉字。

> 📖 OpenAI SDK 文档：https://platform.openai.com/docs/api-reference
> 📖 DeepSeek API 文档：https://platform.deepseek.com/api-docs

---

### 2.5 lunar-javascript — 农历/八字计算库

**是什么？**
一个纯 JavaScript 实现的农历/八字计算库，支持公历↔农历转换、天干地支推算、八字（四柱）计算等。

**为什么需要它？**
八字计算涉及复杂的历法转换和天干地支排列，手动实现极其困难。这个库封装了完整的算法。

```javascript
const { Solar } = require('lunar-javascript');

// 从公历日期创建对象
const solar = Solar.fromYmdHms(1990, 6, 15, 12, 0, 0);

// 转换为农历
const lunar = solar.getLunar();
console.log(lunar.getYearInChinese());  // "一九九零"
console.log(lunar.getMonthInChinese()); // "五"（农历五月）

// 获取八字
const eightChar = lunar.getEightChar();
console.log(eightChar.getYear());   // 年柱，如 "庚午"
console.log(eightChar.getMonth());  // 月柱
console.log(eightChar.getDay());    // 日柱
console.log(eightChar.getTime());   // 时柱
```

> 📖 官方文档：https://github.com/6tail/lunar-javascript

---

### 2.6 express-rate-limit — 速率限制

**是什么？**
Express 中间件，用于限制客户端在指定时间窗口内的请求次数，防止接口被滥用或恶意攻击。

**在本项目中的配置：**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 时间窗口：60秒（1分钟）
  max: 10,               // 每个 IP 在时间窗口内最多 10 次请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,  // 在响应头中返回限制信息（标准 RateLimit-* 头）
  legacyHeaders: false,   // 不使用旧的 X-RateLimit-* 头
});

// 只对 /api/ 路径下的接口启用速率限制
app.use('/api/', limiter);
```

**为什么需要它？**
- 每次调用 `/api/fortune` 都会消耗 DeepSeek API 的 token（你的钱！）
- 防止恶意用户短时间内大量请求，耗尽 API 额度
- 也是 Web 应用的基础安全措施之一

> 📖 官方文档：https://github.com/express-rate-limit/express-rate-limit

---

### 2.7 cors — 跨域资源共享

**是什么？**
CORS（Cross-Origin Resource Sharing）是浏览器的安全机制。当前端页面的域名与 API 的域名不同时，浏览器默认会阻止请求。`cors` 中间件通过设置响应头来告诉浏览器"允许跨域访问"。

**在本项目中：** 前端和后端运行在同一个 Express 服务器上（`express.static('public')`），理论上是同源的。但因为使用了 `localtunnel` 暴露公网地址，或者开发时可能使用不同端口，所以还是需要开启 CORS。

```javascript
const cors = require('cors');
app.use(cors());  // 允许所有来源的跨域请求
```

> 📖 MDN 跨域文档：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS

---

### 2.8 localtunnel — 内网穿透

**是什么？**
localtunnel 可以将你本地电脑上运行的服务（如 `localhost:3000`）暴露到公网，生成一个临时的 `https://xxx.loca.lt` 地址，让任何人都能通过互联网访问你的本地服务。

**使用场景：** 不需要购买云服务器，就能让朋友体验你的项目。

```javascript
const localtunnel = require('localtunnel');

const tunnel = await localtunnel({ port: 3000 });
console.log(tunnel.url);  // https://random-name.loca.lt
```

**注意事项：**
- 关闭程序后公网地址失效
- 免费版地址随机，每次可能不同
- 仅用于演示/测试，**不适合**正式生产环境

> 📖 官方文档：https://github.com/localtunnel/localtunnel

---

## 三、项目结构逐文件拆解

```
ai-bazi/
├── package.json            ← 项目配置文件（依赖声明、启动脚本）
├── server.js               ← 后端主入口（Express 服务器 + API 路由）
├── tunnel.js               ← 公网隧道入口（localtunnel）
├── .env                    ← 环境变量（API Key 等敏感配置，不入 Git）
├── .gitignore              ← Git 忽略规则
├── start.bat               ← Windows 一键启动脚本
├── stop.bat                ← Windows 一键停止脚本
├── SYSTEM.md               ← 系统设计说明文档
├── logs/                   ← API 调用日志目录（自动创建）
│   └── deepseek_2026-04-01.log  ← 按日期分文件
├── utils/                  ← 工具模块目录
│   ├── bazi.js             ← 八字计算核心（农历转换 + 五行分析）
│   ├── prompt.js           ← AI Prompt 模板构建
│   └── logger.js           ← API 调用日志记录
└── public/                 ← 前端静态资源（浏览器直接访问的文件）
    ├── index.html          ← 页面结构（HTML）
    ├── css/
    │   └── style.css       ← 样式（古典中国风 + 响应式 + 暗色主题）
    └── js/
        └── app.js          ← 前端交互逻辑（表单提交、SSE 读取、渲染）
```

### 3.1 package.json — 项目配置文件

```json
{
  "name": "ai-bazi",           // 项目名称
  "version": "1.0.0",          // 版本号
  "main": "server.js",         // 入口文件
  "scripts": {
    "start": "node server.js",          // npm start → 启动服务器
    "dev": "node --watch server.js"     // npm run dev → 开发模式（文件变更自动重启）
  },
  "dependencies": { ... }      // 项目依赖的第三方库
}
```

**关键知识点：**

- `scripts` 定义了快捷命令。运行 `npm start` 等价于 `node server.js`
- `node --watch` 是 Node.js 18+ 内置的文件监听功能，修改代码后服务器会自动重启（开发时非常方便）
- `dependencies` 里声明的库会在执行 `npm install` 时从 npm 仓库下载到 `node_modules/` 目录

> 📖 package.json 详解：https://docs.npmjs.com/cli/v10/configuring-npm/package-json

### 3.2 .gitignore — Git 忽略规则

告诉 Git 哪些文件/目录不应该被版本控制，主要忽略：
- `node_modules/` — 依赖包目录（太大了，别人通过 `npm install` 自行安装）
- `.env` — 含 API Key 等敏感信息
- `logs/` — 可能含用户个人信息（出生日期等）

> 📖 .gitignore 语法：https://git-scm.com/docs/gitignore

### 3.3 start.bat / stop.bat — Windows 批处理脚本

这两个 `.bat` 文件是 Windows 的批处理脚本，提供一键启动/停止功能。

**start.bat 做了什么？**
1. `chcp 65001` — 切换终端编码为 UTF-8（否则中文会乱码）
2. `where node` — 检查 Node.js 是否已安装
3. 检查 `node_modules/` 是否存在，不存在则自动 `npm install`
4. 检查 `.env` 配置文件是否存在
5. 查找并杀死占用 3000 端口的进程（避免端口冲突）
6. 提供菜单选择：仅本地启动 / 本地+公网隧道 / 停止服务

**stop.bat 做了什么？**
1. 通过 `netstat` 查找监听 3000 端口的进程 PID
2. 通过 `taskkill` 强制结束该进程
3. 查找隧道进程并结束

---

## 四、后端核心模块深入

### 4.1 server.js — 服务器主入口

这是整个后端的入口文件，我们逐段拆解：

#### 4.1.1 初始化与配置

```javascript
require('dotenv').config();  // ① 加载 .env 文件中的环境变量到 process.env

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const { calculateBazi, SHICHEN_MAP } = require('./utils/bazi');
const { buildMessages, CATEGORIES } = require('./utils/prompt');
const { logApiCall } = require('./utils/logger');

const app = express();  // ② 创建 Express 应用
const PORT = process.env.PORT || 3000;  // ③ 读取端口配置，默认 3000

// ④ 初始化 AI 客户端
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});
```

**`||` 运算符设置默认值：**
`process.env.PORT || 3000` 的意思是：如果 `PORT` 环境变量存在且有值就用它，否则用 `3000`。这是 JavaScript 中设置默认值的常见模式。

#### 4.1.2 中间件注册

```javascript
app.use(cors());                    // 允许跨域
app.use(express.json());            // 自动解析 JSON 请求体
app.use(express.static('public'));  // 将 public/ 目录作为静态文件服务

// 速率限制（只对 /api/ 路径生效）
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 分钟
  max: 10,               // 每 IP 最多 10 次
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', limiter);
```

**中间件的执行顺序很重要！** 它们按注册顺序从上到下依次执行。比如 `express.json()` 必须在路由之前注册，否则路由中 `req.body` 会是 `undefined`。

#### 4.1.3 GET 接口 — 获取静态数据

```javascript
// 获取十二时辰列表
app.get('/api/shichen', (req, res) => {
  res.json(SHICHEN_MAP.map((s, i) => ({
    index: i,
    name: s.name,
    desc: s.desc,
  })));
});

// 获取分析领域列表
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});
```

这两个接口返回固定数据，不涉及复杂逻辑。`Array.map()` 用于将数组中的每个元素转换为新格式。

#### 4.1.4 POST /api/bazi — 纯八字计算

```javascript
app.post('/api/bazi', (req, res) => {
  try {
    const { year, month, day, shichenIndex, gender } = req.body;

    // 输入验证 —— 永远不要信任客户端输入！
    const y = parseInt(year, 10);     // 将字符串转为整数
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const si = parseInt(shichenIndex, 10);
    const g = gender === 'female' ? 'female' : 'male';  // 白名单策略

    // 校验范围
    if (!y || !m || !d || isNaN(si)) {
      return res.status(400).json({ error: '请提供完整的出生日期和时辰' });
    }
    // ... 更多校验 ...

    const bazi = calculateBazi(y, m, d, si, g);
    res.json(bazi);
  } catch (err) {
    console.error('八字计算错误:', err);
    res.status(500).json({ error: '八字计算出错，请检查输入的日期' });
  }
});
```

**关键学习点：**

1. **解构赋值**：`const { year, month, day } = req.body` 从对象中一次性提取多个属性
2. **输入验证**：`parseInt()` 确保是数字，范围检查确保值合法。**永远不要信任客户端传来的数据**
3. **白名单策略**：`gender === 'female' ? 'female' : 'male'` — 只接受预期的值，其他一律当作默认值
4. **try/catch 错误处理**：防止意外错误导致整个服务器崩溃
5. **HTTP 状态码**：`400` 表示客户端错误，`500` 表示服务器内部错误

#### 4.1.5 POST /api/fortune — AI 运势分析（SSE 流式响应）★

这是整个项目最核心、最复杂的接口，集成了输入验证、八字计算、AI 调用、流式传输等多个环节。

```javascript
app.post('/api/fortune', async (req, res) => {
  try {
    // ① 输入验证（同上，略）

    // ② 计算八字
    const bazi = calculateBazi(y, m, d, si, g);

    // ③ 构建 AI 提示词
    const messages = buildMessages(bazi, cat);

    // ④ 设置 SSE 响应头（告诉浏览器这是一个事件流）
    res.setHeader('Content-Type', 'text/event-stream');   // MIME 类型：事件流
    res.setHeader('Cache-Control', 'no-cache');            // 禁止缓存
    res.setHeader('Connection', 'keep-alive');             // 保持长连接
    res.setHeader('X-Accel-Buffering', 'no');              // Nginx 禁止缓冲

    // ⑤ 先发送八字信息（让前端尽快渲染八字面板）
    res.write(`data: ${JSON.stringify({ type: 'bazi', data: bazi })}\n\n`);

    // ⑥ 流式调用 DeepSeek AI
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      stream: true,           // 关键：开启流式模式
      temperature: 0.85,
      max_tokens: 3000,
    });

    // ⑦ 逐块将 AI 输出转发给客户端
    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        // SSE 格式：每条消息以 "data: " 开头，以两个换行符结尾
        res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
      }
    }

    // ⑧ 发送结束标记
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();  // 关闭连接
  } catch (err) {
    // ⑨ 错误处理：区分响应头是否已发送
    if (!res.headersSent) {
      // 还没开始流式响应，可以返回 JSON 错误
      res.status(500).json({ error: 'AI 分析出错，请稍后重试' });
    } else {
      // 已经在发送 SSE 流了，通过 SSE 事件发送错误信息
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'AI 分析中断，请重试' })}\n\n`);
      res.end();
    }
  }
});
```

**关键学习点：**

1. **`async/await`**：这是处理异步操作的现代语法。`await` 会等待 Promise 完成后再继续执行，让异步代码读起来像同步代码
2. **`for await...of`**：用于遍历异步迭代器（AsyncIterator）。AI 的流式响应就是一个异步迭代器
3. **`?.`（可选链操作符）**：`chunk.choices[0]?.delta?.content` — 任何一层为 `null/undefined` 时不会报错，而是返回 `undefined`
4. **SSE 数据格式**：`data: {...}\n\n` — 每个事件以 `data: ` 开头，以**两个换行符**结尾
5. **`res.headersSent`**：判断响应头是否已经发送。一旦开始流式响应，就不能再调用 `res.status().json()` 了

---

### 4.2 utils/bazi.js — 八字计算引擎

这个文件是整个应用的"计算核心"，不依赖网络，纯粹是数学和历法算法。

#### 4.2.1 数据映射表

```javascript
// 天干 → 五行
const TIANGAN_WUXING = {
  '甲': '木', '乙': '木',   // 甲乙属木
  '丙': '火', '丁': '火',   // 丙丁属火
  '戊': '土', '己': '土',   // 戊己属土
  '庚': '金', '辛': '金',   // 庚辛属金
  '壬': '水', '癸': '水',   // 壬癸属水
};

// 地支藏干（每个地支"内部"藏着的天干）
const DIZHI_CANGGAN = {
  '子': ['癸'],                // 子中藏癸水
  '丑': ['己', '癸', '辛'],   // 丑中藏己土、癸水、辛金
  // ...
};
```

**什么是天干地支？** 简单理解：
- **天干**有 10 个：甲乙丙丁戊己庚辛壬癸
- **地支**有 12 个：子丑寅卯辰巳午未申酉戌亥
- **四柱八字**由 4 对天干地支组成（年柱、月柱、日柱、时柱），共 8 个字
- **五行**：金木水火土，每个天干地支都对应一种五行

#### 4.2.2 五行分布计算

```javascript
function calcWuxing(eightCharStr) {
  const counts = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  const chars = eightCharStr.split('');  // 将八字字符串拆为数组

  chars.forEach((ch, i) => {
    if (i % 2 === 0) {
      // 偶数位是天干（0, 2, 4, 6）
      if (TIANGAN_WUXING[ch]) counts[TIANGAN_WUXING[ch]]++;
    } else {
      // 奇数位是地支（1, 3, 5, 7）
      if (DIZHI_WUXING[ch]) counts[DIZHI_WUXING[ch]]++;
      // 加入地支藏干，权重 0.5（更精确的计算方式）
      const canggan = DIZHI_CANGGAN[ch];
      if (canggan) {
        canggan.forEach(g => {
          if (TIANGAN_WUXING[g]) counts[TIANGAN_WUXING[g]] += 0.5;
        });
      }
    }
  });
  return counts;
}
```

**为什么藏干权重是 0.5？** 藏干是"隐藏"的天干，力量不如明面上的天干地支那么强，所以用较低的权重。

#### 4.2.3 日主强弱分析

```javascript
function analyzeRizhu(dayGan, wuxing) {
  const dayWuxing = TIANGAN_WUXING[dayGan];  // 日主的五行

  // "生我者"（印星）—— 五行相生关系
  const shengWo = {
    '木': '水',  // 水生木
    '火': '木',  // 木生火
    '土': '火',  // 火生土
    '金': '土',  // 土生金
    '水': '金',  // 金生水
  };

  // 同类（比劫）+ 生我（印星）的力量总和
  const sameCount = wuxing[dayWuxing] || 0;
  const shengCount = wuxing[shengWo[dayWuxing]] || 0;
  const helpScore = sameCount + shengCount;
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0);

  // 帮助力量占比判断强弱
  if (helpScore > total * 0.45) return '偏强';
  if (helpScore < total * 0.3) return '偏弱';
  return '中和';
}
```

**`Object.values().reduce()`** 是一个常见的模式，用于计算对象所有值的和：
- `Object.values(wuxing)` → `[2, 3, 1, 2, 4]`（五行各自的值）
- `.reduce((a, b) => a + b, 0)` → `12`（累加求和）

#### 4.2.4 主函数 calculateBazi()

这个函数整合了所有子功能，返回完整的八字分析结果。核心流程：

```
公历日期 + 时辰 → Solar 对象 → Lunar 农历对象 → EightChar 八字对象
                                                      ↓
                              提取四柱天干地支 → 计算五行分布 → 分析日主强弱
                                                      ↓
                              获取流年信息 → 计算大运方向 → 组装返回对象
```

---

### 4.3 utils/prompt.js — Prompt 工程模块

这个模块负责构建"如何与 AI 对话"。Prompt 工程是 AI 应用开发的核心技能之一。

#### 4.3.1 什么是 Prompt 工程？

Prompt（提示词）就是你发给 AI 的指令。好的 Prompt 决定了 AI 输出的质量。本项目的 Prompt 工程包含：

1. **System Prompt（系统设定）**：定义 AI 的角色、知识范围、分析风格、输出原则
2. **User Prompt（用户输入）**：包含八字信息 + 具体分析要求

#### 4.3.2 System Prompt 设计（角色设定）

```javascript
function getSystemPrompt() {
  return `你是"天机阁"的首席命理师，精通周易、八字命理、五行学说……

你的分析风格：
1. 专业而不晦涩——用通俗易懂的方式解释命理术语
2. 客观而有温度——既指出挑战也给出积极的应对建议
3. 理论有据——每个判断都基于八字命理的理论依据
4. 实用导向——给出具体可行的建议

重要原则：
- 区分乾造（男命）和坤造（女命）
- 大运排列方向已给出，据此推算当前大运
- 最后附上免责声明`;
}
```

**Prompt 写作技巧（本项目展示的）：**
- **角色扮演**：让 AI "成为"某个特定角色，输出更专业
- **风格约束**：明确告诉 AI 什么该做、什么不该做
- **结构化要求**：指定输出的章节结构，确保输出格式统一
- **引用来源**：提及具体的参考书籍，让 AI 输出更有据可依

#### 4.3.3 领域分析模板

每个分析领域都有一套详细的 Prompt 模板，定义了 AI 应输出的章节结构：

```javascript
const prompts = {
  comprehensive: `请为命主进行【综合运势】分析，包含以下板块：

## 🔮 命局总评
简要分析八字格局特点...

## 📅 近期运势概览
结合当前流年流月干支...

## 🌟 近期吉事预告
列举3-5件近期可能遇到的好事...`,

  career: `请为命主进行【事业运势】专项分析...`,
  // ...
};
```

#### 4.3.4 消息数组构建

最终通过 `buildMessages()` 组装为 OpenAI Chat 格式，这是与所有兼容 OpenAI API 的大模型对话的标准格式：

```javascript
function buildMessages(bazi, category) {
  return [
    {
      role: 'system',    // 系统消息：设定 AI 角色
      content: getSystemPrompt()
    },
    {
      role: 'user',      // 用户消息：提供数据 + 提出需求
      content: `以下是命主的八字信息：\n${formatBaziInfo(bazi)}\n${getCategoryPrompt(category)}`
    }
  ];
}
```

**Chat 消息格式说明：**
| role | 含义 | 用途 |
|------|------|------|
| `system` | 系统设定 | 定义 AI 的角色、行为规则。AI 会始终遵循这个设定 |
| `user` | 用户消息 | 用户的输入/请求 |
| `assistant` | AI 回复 | AI 之前的回复（用于多轮对话时提供上下文） |

---

### 4.4 utils/logger.js — API 调用日志模块

#### 4.4.1 日志为什么重要？

在正式项目中，日志是排查问题的核心手段。当线上出了 Bug，你无法像开发时那样 `console.log` 调试，只能靠日志回溯问题。

#### 4.4.2 实现解析

```javascript
const fs = require('fs');      // Node.js 文件系统模块
const path = require('path');  // Node.js 路径处理模块

const LOG_DIR = path.join(__dirname, '..', 'logs');
// __dirname：当前文件所在目录（utils/）
// path.join：跨平台安全的路径拼接
// 结果：项目根目录/logs/

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  // recursive: true → 如果父目录不存在也一并创建
}

function logApiCall({ request, response, duration, error }) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);  // "2026-04-01"

  const logEntry = {
    timestamp: now.toISOString(),
    duration_ms: duration,
    request: { model, temperature, max_tokens, messages },
    response: error ? null : response,
    error: error || null,
  };

  const logFile = path.join(LOG_DIR, `deepseek_${dateStr}.log`);
  const logLine = `[${now.toISOString()}] ---\n${JSON.stringify(logEntry, null, 2)}\n\n`;

  // 异步追加写入（不阻塞主线程）
  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error('写入日志文件失败:', err.message);
  });
}
```

**关键学习点：**

1. **`path.join()` vs 字符串拼接**：`path.join('a', 'b', 'c')` → `a/b/c`（Linux）或 `a\b\c`（Windows）。**不要用 `+` 拼接路径**，否则在不同操作系统上会出问题
2. **`fs.appendFile()` 异步写入**：不会阻塞其他请求的处理。回调函数在写入完成（或失败）后执行
3. **`JSON.stringify(obj, null, 2)`**：将对象转为格式化的 JSON 字符串，`2` 表示每层缩进 2 个空格
4. **按日期分文件**：日志文件按天切割，方便存档和管理

> 📖 Node.js fs 模块：https://nodejs.org/docs/latest/api/fs.html
> 📖 Node.js path 模块：https://nodejs.org/docs/latest/api/path.html

---

## 五、前端核心模块深入

### 5.1 index.html — 页面结构

HTML 是网页的"骨架"，定义了页面由哪些元素组成。

#### 5.1.1 `<head>` 标签中的关键设置

```html
<meta charset="UTF-8">
<!-- 字符编码：UTF-8 支持所有语言字符，包括中文 -->

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- 视口设置：让移动端正确渲染，不会把页面缩小到电脑大小 -->

<link rel="preconnect" href="https://fonts.googleapis.com">
<!-- 预连接：提前建立到 Google Fonts 的网络连接，加快字体加载速度 -->

<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC&family=Ma+Shan+Zheng..." rel="stylesheet">
<!-- 引入 Google 在线字体：思源宋体（正文） + 马善政（标题书法字） -->

<link rel="icon" href="data:image/svg+xml,...">
<!-- favicon：用内联 SVG 设置页签图标（灯笼 emoji），无需额外图片文件 -->
```

#### 5.1.2 语义化 HTML 结构

```html
<header class="header">...</header>    <!-- 页面头部（Logo、标题） -->
<main class="container">              <!-- 主内容区 -->
  <section class="form-card">...</section>     <!-- 输入表单 -->
  <section class="bazi-card">...</section>     <!-- 八字信息展示（默认隐藏） -->
  <section class="result-card">...</section>   <!-- AI 分析结果（默认隐藏） -->
  <section class="history-card">...</section>  <!-- 查询历史（默认隐藏） -->
</main>
<footer class="footer">...</footer>   <!-- 页面底部（声明） -->
```

- `<header>` `<main>` `<section>` `<footer>` 是 HTML5 语义化标签，比 `<div>` 更有意义
- `style="display:none"` 用于默认隐藏某些区域，由 JavaScript 在适当时机显示

#### 5.1.3 表单与 Radio 选择器

```html
<!-- Radio 按钮组：同一个 name 的 radio 互斥（只能选一个） -->
<input type="radio" name="gender" value="male" checked>   <!-- checked = 默认选中 -->
<input type="radio" name="gender" value="female">

<!-- Radio 按钮隐藏，用 CSS 美化外层 label -->
<label class="gender-option">
  <input type="radio" name="gender" value="male" checked>
  <span class="gender-card">
    <span class="gender-icon">♂</span>
    <span class="gender-name">男（乾造）</span>
  </span>
</label>
```

**技巧说明：** 原生 radio 按钮样式很丑，所以用 CSS `display: none` 隐藏，用 `input:checked + .card` 选择器来美化选中状态。

---

### 5.2 style.css — 样式详解

#### 5.2.1 CSS 变量（自定义属性）实现主题切换

```css
:root {
  /* 日间主题色 */
  --bg-primary: #FFF8E7;       /* 米白色背景 */
  --text-primary: #3E2723;     /* 深棕色文字 */
  --accent-gold: #D4A574;      /* 金色点缀 */
  --accent-red: #C62828;       /* 中国红 */
}

[data-theme="dark"] {
  /* 暗色主题：覆盖同名变量 */
  --bg-primary: #1A1410;       /* 深色背景 */
  --text-primary: #F5E6D3;     /* 浅色文字 */
  --accent-gold: #D4A574;      /* 金色保持 */
}

/* 使用变量 */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

**原理：** CSS 变量（`--变量名`）定义在 `:root`（日间）或 `[data-theme="dark"]`（暗色）中。JavaScript 通过切换 `<html>` 元素的 `data-theme` 属性来切换整套颜色方案，所有使用 `var(--变量名)` 的地方会自动更新。

> 📖 CSS 变量文档：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties

#### 5.2.2 响应式布局

```css
/* 桌面端：5 列网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.6rem;
}

/* 移动端（屏幕宽度 ≤ 768px）：改为 3 列 */
@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**`@media` 媒体查询**是响应式设计的核心。它让不同屏幕尺寸的设备使用不同的样式。

> 📖 CSS Grid 布局：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout
> 📖 媒体查询：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_media_queries

#### 5.2.3 CSS 动画

```css
/* 太极旋转动画 */
@keyframes taiji-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-icon {
  animation: taiji-rotate 12s linear infinite;
  /* 12 秒转一圈，匀速，无限循环 */
}

/* 打字光标闪烁 */
@keyframes blink {
  0%, 50% { opacity: 1; }    /* 前半段可见 */
  51%, 100% { opacity: 0; }  /* 后半段隐藏 */
}

.typing-cursor {
  animation: blink 0.8s infinite;
}
```

> 📖 CSS 动画：https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_animations

#### 5.2.4 transition（过渡效果）

```css
.category-card {
  transition: all 0.3s;  /* 所有属性变化时，用 0.3 秒过渡 */
}

.category-card:hover {
  border-color: var(--accent-gold);
  transform: translateY(-2px);  /* 向上浮2px */
}
```

`transition` 让属性变化有过渡动画效果，而不是瞬间切换，这让交互更流畅。

---

### 5.3 app.js — 前端交互逻辑

#### 5.3.1 IIFE（立即执行函数表达式）

```javascript
(function () {
  'use strict';
  // ... 所有代码都在这里面 ...
})();
```

**为什么要用 IIFE？**
- 创建一个独立的作用域，里面定义的变量不会"污染"全局命名空间
- `'use strict'` 开启严格模式，帮助捕获常见的代码错误

#### 5.3.2 DOM 操作

```javascript
// 简写 querySelector
const $ = (sel) => document.querySelector(sel);

// 获取 DOM 元素
const form = $('#fortuneForm');
const submitBtn = $('#submitBtn');
```

`document.querySelector()` 通过 CSS 选择器查找页面中的元素。`$` 只是一个简写别名。

**常用 DOM 操作：**

```javascript
// 读取/设置元素内容
element.textContent = '纯文本';
element.innerHTML = '<b>HTML内容</b>';

// 读取/设置样式
element.style.display = 'none';      // 隐藏
element.style.display = '';          // 恢复

// 添加/移除 CSS 类
element.classList.add('fade-in-up');
element.classList.remove('show');

// 读取/设置属性
element.setAttribute('data-theme', 'dark');
element.getAttribute('data-theme');
```

> 📖 DOM 操作文档：https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model

#### 5.3.3 核心：表单提交与 SSE 流式读取 ★

```javascript
let abortController = null;  // 用于取消请求的控制器

form.addEventListener('submit', async (e) => {
  e.preventDefault();  // 阻止表单默认提交行为（刷新页面）

  // ① 收集表单数据
  const year = yearSelect.value;
  const gender = document.querySelector('input[name="gender"]:checked').value;
  // ...

  // ② 准备取消之前的请求
  if (abortController) abortController.abort();
  abortController = new AbortController();

  // ③ 发送 POST 请求
  const response = await fetch('/api/fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, day, shichenIndex, gender, category }),
    signal: abortController.signal,  // 允许外部中断此请求
  });

  // ④ 读取 SSE 流
  const reader = response.body.getReader();    // 获取"流读取器"
  const decoder = new TextDecoder();           // 将字节解码为文本
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();  // 读取一个数据块
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();  // 最后一行可能不完整，留到下次处理

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;  // 只处理 SSE data 行
      const parsed = JSON.parse(line.slice(6));   // 去掉 "data: " 前缀

      if (parsed.type === 'bazi') {
        renderBazi(parsed.data);  // 渲染八字面板
      } else if (parsed.type === 'content') {
        fullText += parsed.data;
        renderMarkdown(fullText);  // 实时渲染 Markdown
      } else if (parsed.type === 'done') {
        saveHistory(...);  // 保存查询历史
      }
    }
  }
});
```

**关键学习点：**

1. **`e.preventDefault()`**：阻止浏览器默认行为。表单提交默认会刷新页面，我们要改为 AJAX 提交
2. **`fetch()` API**：现代浏览器内置的 HTTP 请求方法，替代了老旧的 `XMLHttpRequest`
3. **`AbortController`**：用于中断进行中的请求。比如用户快速点了两次"开始推演"，应该取消第一次请求
4. **`ReadableStream`**：`response.body` 是一个可读流，用 `getReader()` 获取读取器后，可以逐块读取数据
5. **粘包/分包处理**：网络传输中，一个数据块可能包含多条 SSE 消息（粘包），也可能一条消息被拆成两个数据块（分包）。`buffer` 机制解决了这个问题

> 📖 Fetch API：https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
> 📖 AbortController：https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController
> 📖 ReadableStream：https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream

#### 5.3.4 简易 Markdown 渲染器

```javascript
function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')            // HTML 转义（防 XSS）
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')     // ## 标题 → <h2>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **粗体** → <strong>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')        // *斜体* → <em>
    .replace(/^- (.+)$/gm, '<li>$1</li>')        // - 列表项 → <li>
    .replace(/\n\n/g, '</p><p>');                 // 空行 → 段落分隔

  resultContent.innerHTML = html + '<span class="typing-cursor"></span>';
}
```

**正则表达式简要说明：**
- `/^## (.+)$/gm`：`^` 行首，`##` 匹配 ## 前缀，`(.+)` 捕获标题文本，`$` 行尾，`g` 全局匹配，`m` 多行模式
- `/\*\*(.+?)\*\*/g`：`\*\*` 匹配 `**`，`(.+?)` 非贪婪捕获内容，所以 `**这是粗体**` 匹配整体
- `$1` 是正则捕获组的引用，对应括号 `()` 中匹配的内容

> 📖 正则表达式：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions

#### 5.3.5 localStorage 数据持久化

```javascript
// 保存查询历史
function saveHistory(entry) {
  let history = JSON.parse(localStorage.getItem('tianjige-history') || '[]');
  history.unshift(entry);            // 在数组头部插入新记录
  history = history.slice(0, 5);     // 只保留最近 5 条
  localStorage.setItem('tianjige-history', JSON.stringify(history));
}

// 保存主题偏好
localStorage.setItem('tianjige-theme', 'dark');
const theme = localStorage.getItem('tianjige-theme');
```

**localStorage 是什么？**
浏览器提供的本地键值对存储，数据保存在用户本地磁盘上，**关闭浏览器后不会丢失**。

| 特性 | localStorage | sessionStorage |
|------|-------------|----------------|
| 生命周期 | 永久（除非手动清除） | 关闭标签页后清除 |
| 容量 | 约 5-10MB | 约 5-10MB |
| 作用域 | 同源（协议+域名+端口） | 同源 + 同标签页 |

> 📖 Web Storage API：https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Storage_API

#### 5.3.6 剪贴板复制

```javascript
copyBtn.addEventListener('click', () => {
  const text = resultContent.innerText;

  // 现代方式（推荐）
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    // 降级方案（兼容老浏览器）
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已复制到剪贴板');
  });
});
```

`navigator.clipboard` 是现代浏览器的剪贴板 API，`.catch()` 中的代码是老浏览器的降级兼容方案。

---

## 六、前后端数据交互流程

### 6.1 完整请求流程图

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器                                                      │
│                                                              │
│  ① 用户填写表单并点击"开始推演"                                │
│  ② app.js 收集表单数据 → JSON.stringify()                     │
│  ③ fetch('/api/fortune', { method: 'POST', body: json })     │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTP POST
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Express 中间件管道                                           │
│                                                              │
│  ④ cors()            → 添加 CORS 响应头                       │
│  ⑤ express.json()    → 解析 JSON body → req.body             │
│  ⑥ rateLimit()       → 检查 IP 请求频率（超限 → 返回 429）     │
│  ⑦ 路由匹配          → POST /api/fortune                     │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  路由处理函数                                                 │
│                                                              │
│  ⑧  输入验证 → 不合法就返回 400 错误                           │
│  ⑨  calculateBazi(y, m, d, si, g) → 计算八字                  │
│  ⑩  buildMessages(bazi, cat) → 构建 AI 消息                   │
│  ⑪  设置 SSE 响应头                                          │
│  ⑫  res.write(bazi) → 先发八字数据                            │
│  ⑬  client.chat.completions.create(stream) → 调用 AI          │
│  ⑭  for await (chunk of stream) → 逐块转发给浏览器             │
│  ⑮  res.write(done) → 发送结束标记                            │
│  ⑯  logApiCall() → 写日志                                    │
└──────────────────────────┼───────────────────────────────────┘
          ↑                │ SSE 流式响应
          │ HTTPS          ▼
┌─────────┴────┐ ┌────────────────────────────────────────────┐
│ DeepSeek API │ │  浏览器                                     │
│              │ │                                             │
│  AI 生成文本  │ │  ⑰ reader.read() → 逐块读取 SSE 数据        │
│  流式输出     │ │  ⑱ 解析 type=bazi → renderBazi() → 渲染八字  │
│              │ │  ⑲ 解析 type=content → renderMarkdown()      │
│              │ │  ⑳ 解析 type=done → 移除光标 + 保存历史       │
└──────────────┘ └────────────────────────────────────────────┘
```

### 6.2 什么是 SSE？为什么用 SSE 而不是 WebSocket？

**SSE（Server-Sent Events）** 是一种服务器向客户端单向推送数据的协议。

| 对比 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 服务器 → 客户端（单向） | 双向 |
| 协议 | HTTP | WS（独立协议） |
| 重连 | 自动重连 | 需手动实现 |
| 复杂度 | 简单 | 复杂 |
| 适用场景 | 服务器推送（如 AI 流式输出） | 实时聊天、游戏 |

本项目中 AI 的输出只需要从服务器推给客户端，不需要客户端向服务器持续发数据，所以 SSE 是最合适的选择。

**SSE 数据格式：**
```
data: {"type":"bazi","data":{...}}\n\n     ← 每条消息以 data: 开头
data: {"type":"content","data":"你好"}\n\n  ← 以两个换行 \n\n 结尾
data: {"type":"done"}\n\n
```

> 📖 SSE 文档：https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events

---

## 七、关键编程概念详解

### 7.1 同步 vs 异步

Node.js 的核心特性是**异步非阻塞 I/O**。理解同步和异步的区别至关重要。

```javascript
// 同步：代码按顺序执行，每行都要等上一行完成
const data = fs.readFileSync('file.txt');  // 阻塞！等待文件读完
console.log(data);                          // 文件读完后才执行

// 异步（回调风格）：不阻塞，读完通过回调通知
fs.readFile('file.txt', (err, data) => {
  console.log(data);  // 文件读完后调用这个回调函数
});
console.log('这行先执行！');  // 不等文件读完就执行

// 异步（Promise + async/await 风格）：本项目主要使用的方式
async function readFile() {
  const data = await fs.promises.readFile('file.txt');
  console.log(data);  // await 会等待 Promise 完成
}
```

**类比理解：**
- 同步 = 去餐厅点餐，站在柜台等厨师做完才离开
- 异步 = 去餐厅点餐，拿到号牌回座位等，做好了叫号取餐

### 7.2 Promise 与 async/await

```javascript
// Promise：代表一个"未来某时刻才有结果"的值
const promise = fetch('/api/fortune', { method: 'POST', body: '...' });
// promise 现在是 Pending（等待中）状态

// .then() 链式调用
promise
  .then(response => response.json())   // 成功时调用
  .then(data => console.log(data))
  .catch(err => console.error(err));   // 失败时调用

// async/await（语法糖 —— 底层仍是 Promise，只是写法更简洁）
async function getData() {
  try {
    const response = await fetch('/api/fortune', { method: 'POST', body: '...' });
    const data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

> 📖 Promise 文档：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise
> 📖 async/await 文档：https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Asynchronous/Promises

### 7.3 解构赋值

本项目大量使用解构赋值，让代码更简洁：

```javascript
// 对象解构
const bazi = { fourPillars: {...}, dayMaster: {...}, wuxing: {...} };
const { fourPillars, dayMaster, wuxing } = bazi;
// 等价于：
// const fourPillars = bazi.fourPillars;
// const dayMaster = bazi.dayMaster;
// const wuxing = bazi.wuxing;

// 数组解构
const [first, ...rest] = [1, 2, 3, 4];  // first = 1, rest = [2, 3, 4]

// 函数参数解构
function logApiCall({ request, response, duration, error }) { ... }
// 调用时传入对象：logApiCall({ request: {...}, response: '...', duration: 5000 })
```

> 📖 解构赋值：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment

### 7.4 模板字符串

```javascript
// 反引号包裹，${} 内嵌表达式
const name = '张三';
const greeting = `你好，${name}！今年是 ${new Date().getFullYear()} 年。`;
// "你好，张三！今年是 2026 年。"

// 支持多行（不需要 \n）
const multiLine = `
第一行
第二行
第三行
`;

// SSE 数据构建中的实际应用
res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
```

### 7.5 数组高频方法

本项目用到的数组方法汇总：

```javascript
// .map() —— 将数组每个元素转换为新值，返回新数组
[1, 2, 3].map(x => x * 2);  // [2, 4, 6]

// .filter() —— 筛选满足条件的元素
[1, 2, 3, 4].filter(x => x > 2);  // [3, 4]

// .forEach() —— 遍历（无返回值）
['金', '木', '水'].forEach(wx => console.log(wx));

// .reduce() —— 累积计算（求和、求最大值等）
[1, 2, 3, 4].reduce((sum, x) => sum + x, 0);  // 10

// .find() —— 找到第一个满足条件的元素
[{id: 1}, {id: 2}].find(x => x.id === 2);  // {id: 2}

// .slice() —— 截取子数组（不修改原数组）
[1, 2, 3, 4, 5].slice(0, 3);  // [1, 2, 3]

// .unshift() —— 在数组头部插入
const arr = [2, 3]; arr.unshift(1);  // arr = [1, 2, 3]

// .join() —— 数组转字符串
['金', '水'].join('、');  // "金、水"

// .split() —— 字符串转数组
'甲子乙丑'.split('');  // ['甲', '子', '乙', '丑']
```

> 📖 Array 方法大全：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array

---

## 八、安全设计

### 8.1 已实施的安全措施

| # | 措施 | 说明 | 对应代码 |
|---|------|------|---------|
| 1 | **API Key 不暴露** | 密钥存在 `.env` 文件中，不入 Git，前端代码中无密钥 | `.env` + `.gitignore` |
| 2 | **速率限制** | 每 IP 每分钟最多 10 次 API 请求，防止滥用 | `server.js` 中 `rateLimit` |
| 3 | **输入验证** | 服务端校验所有参数的类型和范围 | `server.js` 中 `parseInt` + 范围检查 |
| 4 | **白名单校验** | gender 只接受 `'male'` / `'female'`，category 用对象键校验 | `server.js` |
| 5 | **HTML 转义** | Markdown 渲染前先转义 `<>&`，防止 XSS | `app.js` 中 `renderMarkdown()` |
| 6 | **错误信息不泄露** | 返回给用户的错误是通用的中文提示，不暴露内部实现细节 | `server.js` 中 `catch` 块 |
| 7 | **SSE 错误恢复** | 流式传输中出错不会导致连接挂起，通过 error 事件通知前端 | `server.js` 中 `res.headersSent` 判断 |
| 8 | **日志审计** | 记录每次 API 调用，便于排查异常请求 | `utils/logger.js` |

### 8.2 重要安全概念

**XSS（跨站脚本攻击）：** 如果直接把用户输入作为 HTML 插入页面（`innerHTML`），攻击者可以注入恶意脚本。本项目在 `renderMarkdown()` 中先转义 HTML 特殊字符来防御。

```javascript
// 危险！如果 text 含有 <script>alert('hacked')</script>
element.innerHTML = text;

// 安全：先转义
text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
element.innerHTML = text;
```

**OWASP Top 10** 是 Web 安全的"必知清单"。本项目涉及的防护有：
- A01 — 访问控制（速率限制）
- A03 — 注入（输入校验 + HTML 转义）
- A07 — 身份验证（API Key 保护）

> 📖 OWASP Top 10：https://owasp.org/www-project-top-ten/

---

## 九、如何运行与调试

### 9.1 环境准备

1. **安装 Node.js（18+）**：https://nodejs.org/
2. **安装依赖**：在项目根目录运行 `npm install`
3. **配置 API Key**：创建 `.env` 文件，填入你的 DeepSeek API Key

```bash
# .env
DEEPSEEK_API_KEY=sk-你的密钥
```

### 9.2 启动方式

```bash
# 方式一：命令行
npm start           # 正式启动
npm run dev         # 开发模式（修改代码自动重启）

# 方式二：Windows 双击
start.bat           # 带菜单的一键启动
```

### 9.3 开发调试技巧

**后端调试：**
- 在 `server.js` 中添加 `console.log()` 打印变量值
- 查看 `logs/` 目录下的日志文件，了解 AI 请求/响应详情
- 使用 VS Code 的 "Run and Debug" 功能设置断点

**前端调试：**
- 浏览器按 `F12` 打开开发者工具
- **Console** 面板：查看 `console.log()` 输出和错误信息
- **Network** 面板：查看请求/响应详情，SSE 流的实时数据
- **Elements** 面板：查看和修改 DOM 结构和 CSS 样式
- **Application** 面板 → Local Storage：查看存储的历史记录和主题设置

**常见问题排查：**

| 问题 | 排查方向 |
|------|---------|
| 页面空白 | F12 → Console 看报错；检查 `node server.js` 是否在运行 |
| "请求过于频繁" | 触发了速率限制，等 60 秒后重试 |
| AI 分析没反应 | 检查 `.env` 中的 API Key 是否正确；检查 DeepSeek 账户余额 |
| 样式异常 | F12 → Elements 检查 CSS 是否加载；检查 Google Fonts 是否可访问 |

---

## 十、延伸学习路线

如果你读完了这份文档并想继续深入，以下是推荐的学习路径：

### 10.1 JavaScript 基础强化

| 资源 | 链接 |
|------|------|
| MDN Web Docs（最权威） | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript |
| JavaScript.info 教程 | https://zh.javascript.info/ |
| ES6+ 新特性 | https://es6.ruanyifeng.com/ （阮一峰 ES6 教程） |

### 10.2 Node.js 后端

| 资源 | 链接 |
|------|------|
| Node.js 官方文档 | https://nodejs.org/docs/latest/api/ |
| Express 官方指南 | https://expressjs.com/zh-cn/guide/routing.html |
| Node.js 最佳实践 | https://github.com/goldbergyoni/nodebestpractices |

### 10.3 前端进阶

| 方向 | 推荐学习 |
|------|---------|
| CSS 进阶 | Flexbox 和 Grid 布局、CSS 动画、Tailwind CSS |
| 前端框架 | Vue.js（适合入门）或 React（市场需求大） |
| TypeScript | JavaScript 的类型化超集，大型项目必备 |
| 构建工具 | Vite（现代构建工具） |

### 10.4 AI 应用开发

| 资源 | 链接 |
|------|------|
| OpenAI API 文档 | https://platform.openai.com/docs/ |
| DeepSeek API 文档 | https://platform.deepseek.com/api-docs |
| Prompt 工程指南 | https://www.promptingguide.ai/zh |

### 10.5 工程化与部署

| 方向 | 推荐学习 |
|------|---------|
| Git 版本控制 | https://git-scm.com/book/zh/v2 |
| Docker 容器化 | https://docs.docker.com/get-started/ |
| 云服务器部署 | Vercel（前端） / Railway（全栈） |
| CI/CD | GitHub Actions |

---

> 本文档随项目持续更新。如有疑问或改进建议，欢迎提出！
