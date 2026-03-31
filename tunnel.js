const localtunnel = require('localtunnel');

const PORT = process.env.PORT || 3000;
const SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || undefined;

(async () => {
  try {
    const opts = { port: PORT };
    if (SUBDOMAIN) opts.subdomain = SUBDOMAIN;

    const tunnel = await localtunnel(opts);

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  🌐 公网隧道已建立');
    console.log(`  📡 公网地址: ${tunnel.url}`);
    console.log(`  🏮 本地地址: http://127.0.0.1:${PORT}`);
    console.log('  ⚠️  首次访问会有一个确认页面，点击按钮即可');
    console.log('  ⚠️  关闭此窗口将断开公网访问');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    tunnel.on('close', () => {
      console.log('🔌 隧道已断开');
      process.exit(0);
    });

    tunnel.on('error', (err) => {
      console.error('隧道错误:', err);
    });

    // 优雅退出
    const cleanup = () => {
      console.log('\n正在关闭隧道...');
      tunnel.close();
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('隧道创建失败:', err.message);
    process.exit(1);
  }
})();
