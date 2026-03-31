const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * 记录 DeepSeek API 请求和响应
 * @param {object} options
 * @param {object} options.request  - 发送给 API 的请求参数（messages, model 等）
 * @param {string} options.response - AI 返回的完整文本
 * @param {number} options.duration - 请求耗时（毫秒）
 * @param {string} [options.error]  - 错误信息（如果有）
 */
function logApiCall({ request, response, duration, error }) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS
  const timestamp = now.toISOString();

  const logEntry = {
    timestamp,
    duration_ms: duration,
    request: {
      model: request.model,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      messages: request.messages,
    },
    response: error ? null : response,
    error: error || null,
  };

  // 按日期分文件，文件名格式：deepseek_YYYY-MM-DD.log
  const logFile = path.join(LOG_DIR, `deepseek_${dateStr}.log`);
  const logLine = `[${timestamp}] --- REQUEST ${timeStr} ---\n${JSON.stringify(logEntry, null, 2)}\n\n`;

  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err.message);
    }
  });
}

module.exports = { logApiCall };
