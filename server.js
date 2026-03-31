require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const { calculateBazi, SHICHEN_MAP } = require('./utils/bazi');
const { buildMessages, CATEGORIES } = require('./utils/prompt');
const { logApiCall } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// DeepSeek 客户端（兼容 OpenAI SDK）
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 速率限制：每 IP 每分钟最多 10 次
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * 获取时辰列表
 */
app.get('/api/shichen', (req, res) => {
  res.json(SHICHEN_MAP.map((s, i) => ({
    index: i,
    name: s.name,
    desc: s.desc,
  })));
});

/**
 * 获取领域列表
 */
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

/**
 * 计算八字（不调用 AI）
 */
app.post('/api/bazi', (req, res) => {
  try {
    const { year, month, day, shichenIndex, gender } = req.body;

    // 输入验证
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const si = parseInt(shichenIndex, 10);
    const g = gender === 'female' ? 'female' : 'male';

    if (!y || !m || !d || isNaN(si)) {
      return res.status(400).json({ error: '请提供完整的出生日期和时辰' });
    }
    if (y < 1900 || y > new Date().getFullYear()) {
      return res.status(400).json({ error: '年份超出有效范围(1900-今年)' });
    }
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      return res.status(400).json({ error: '月份或日期不合法' });
    }
    if (si < 0 || si > 11) {
      return res.status(400).json({ error: '时辰索引应为 0-11' });
    }

    const bazi = calculateBazi(y, m, d, si, g);
    res.json(bazi);
  } catch (err) {
    console.error('八字计算错误:', err);
    res.status(500).json({ error: '八字计算出错，请检查输入的日期' });
  }
});

/**
 * AI 运势分析（流式响应 SSE）
 */
app.post('/api/fortune', async (req, res) => {
  try {
    const { year, month, day, shichenIndex, gender, category } = req.body;

    // 输入验证
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const si = parseInt(shichenIndex, 10);
    const g = gender === 'female' ? 'female' : 'male';
    const cat = String(category || 'comprehensive');

    if (!y || !m || !d || isNaN(si)) {
      return res.status(400).json({ error: '请提供完整的出生日期和时辰' });
    }
    if (!CATEGORIES[cat]) {
      return res.status(400).json({ error: '无效的分析领域' });
    }

    // 计算八字
    const bazi = calculateBazi(y, m, d, si, g);

    // 构建消息
    const messages = buildMessages(bazi, cat);

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 先发送八字信息
    res.write(`data: ${JSON.stringify({ type: 'bazi', data: bazi })}\n\n`);

    // 流式调用 DeepSeek
    const requestParams = {
      model: 'deepseek-chat',
      messages,
      stream: true,
      temperature: 0.85,
      max_tokens: 3000,
    };
    const startTime = Date.now();
    const stream = await client.chat.completions.create(requestParams);

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
      }
    }

    // 记录请求和响应日志
    logApiCall({
      request: requestParams,
      response: fullResponse,
      duration: Date.now() - startTime,
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('AI 分析错误:', err);
    // 记录错误日志
    logApiCall({
      request: { model: 'deepseek-chat', messages: messages || [], temperature: 0.85, max_tokens: 3000 },
      response: null,
      duration: 0,
      error: err.message,
    });
    // 如果还没开始流式响应
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI 分析出错，请稍后重试' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'AI 分析中断，请重试' })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`🏮 天机阁服务已启动: http://127.0.0.1:${PORT}`);
});
