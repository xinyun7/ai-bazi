/* =============================================
   天机阁 · 前端交互逻辑
   ============================================= */

(function () {
  'use strict';

  // ============ DOM 元素 ============
  const $ = (sel) => document.querySelector(sel);
  const form = $('#fortuneForm');
  const submitBtn = $('#submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const baziSection = $('#baziSection');
  const resultSection = $('#resultSection');
  const resultTitle = $('#resultTitle');
  const resultContent = $('#resultContent');
  const copyBtn = $('#copyBtn');
  const againBtn = $('#againBtn');
  const historySection = $('#historySection');
  const historyList = $('#historyList');
  const themeToggle = $('#themeToggle');

  const yearSelect = $('#birthYear');
  const monthSelect = $('#birthMonth');
  const daySelect = $('#birthDay');

  // ============ 领域名称映射 ============
  const CATEGORY_NAMES = {
    comprehensive: '综合运势',
    career: '事业运势',
    wealth: '财运分析',
    love: '感情运势',
    health: '健康运势',
  };

  // ============ 天干地支五行映射 ============
  const TIANGAN_WX = {
    '甲': 'mu', '乙': 'mu', '丙': 'huo', '丁': 'huo',
    '戊': 'tu', '己': 'tu', '庚': 'jin', '辛': 'jin',
    '壬': 'shui', '癸': 'shui',
  };
  const DIZHI_WX = {
    '子': 'shui', '丑': 'tu', '寅': 'mu', '卯': 'mu',
    '辰': 'tu', '巳': 'huo', '午': 'huo', '未': 'tu',
    '申': 'jin', '酉': 'jin', '戌': 'tu', '亥': 'shui',
  };
  const WX_NAMES = { jin: '金', mu: '木', shui: '水', huo: '火', tu: '土' };

  // ============ 初始化日期选择 ============
  function initDateSelectors() {
    const currentYear = new Date().getFullYear();

    // 年份 (1940 - 当前年)
    for (let y = currentYear; y >= 1940; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y + '年';
      yearSelect.appendChild(opt);
    }
    yearSelect.value = '1990';

    // 月份
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m + '月';
      monthSelect.appendChild(opt);
    }
    monthSelect.value = '1';

    // 日期
    updateDays();

    yearSelect.addEventListener('change', updateDays);
    monthSelect.addEventListener('change', updateDays);
  }

  function updateDays() {
    const y = parseInt(yearSelect.value);
    const m = parseInt(monthSelect.value);
    const currentDay = daySelect.value;
    const daysInMonth = new Date(y, m, 0).getDate();

    daySelect.innerHTML = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d + '日';
      daySelect.appendChild(opt);
    }

    // 保持之前选的日
    if (parseInt(currentDay) <= daysInMonth) {
      daySelect.value = currentDay;
    }
  }

  // ============ 主题切换 ============
  function initTheme() {
    const saved = localStorage.getItem('tianjige-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('tianjige-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('tianjige-theme', 'dark');
      }
    });
  }

  // ============ 表单提交 ============
  let abortController = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const year = yearSelect.value;
    const month = monthSelect.value;
    const day = daySelect.value;
    const shichenIndex = $('#birthShichen').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const category = document.querySelector('input[name="category"]:checked').value;

    if (!shichenIndex && shichenIndex !== '0') {
      showToast('请选择出生时辰');
      return;
    }

    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    setLoading(true);

    try {
      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(year),
          month: parseInt(month),
          day: parseInt(day),
          shichenIndex: parseInt(shichenIndex),
          gender,
          category,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '请求失败');
      }

      // 设置结果标题
      resultTitle.textContent = CATEGORY_NAMES[category] || '运势推演';

      // 读取 SSE 流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      resultContent.innerHTML = '<span class="typing-cursor"></span>';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          let parsed;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (parsed.type === 'bazi') {
            renderBazi(parsed.data);
            baziSection.style.display = '';
            baziSection.classList.add('fade-in-up');
            resultSection.style.display = '';
            resultSection.classList.add('fade-in-up');
          } else if (parsed.type === 'content') {
            fullText += parsed.data;
            renderMarkdown(fullText);
          } else if (parsed.type === 'done') {
            // 移除光标
            const cursor = resultContent.querySelector('.typing-cursor');
            if (cursor) cursor.remove();
            // 保存历史
            saveHistory({
              year, month, day, shichenIndex, gender, category,
              timestamp: Date.now(),
            });
          } else if (parsed.type === 'error') {
            showToast(parsed.data);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      showToast(err.message || '请求失败，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  });

  // ============ 渲染八字信息 ============
  function renderBazi(bazi) {
    const { fourPillars, dayMaster, wuxing, missingWuxing, lunarDate, shichen, gender, dayunDirection } = bazi;
    const genderLabel = gender === 'female' ? '坤造（女）' : '乾造（男）';

    // 农历
    $('#baziLunar').innerHTML =
      `${genderLabel} · 农历 ${lunarDate.year}年${lunarDate.month}月${lunarDate.day} · ${shichen.name}（${shichen.desc}）`;

    // 四柱
    const pillarsEl = $('#fourPillars');
    const pillars = [
      { label: '年柱', ...fourPillars.year },
      { label: '月柱', ...fourPillars.month },
      { label: '日柱', ...fourPillars.day },
      { label: '时柱', ...fourPillars.time },
    ];

    pillarsEl.innerHTML = pillars.map(p => {
      const ganWx = TIANGAN_WX[p.gan] || '';
      const zhiWx = DIZHI_WX[p.zhi] || '';
      return `
        <div class="pillar">
          <div class="pillar-label">${p.label}</div>
          <div class="pillar-gan wx-${ganWx}">${p.gan}</div>
          <div class="pillar-zhi wx-${zhiWx}">${p.zhi}</div>
          <div class="pillar-wuxing">${WX_NAMES[ganWx] || ''}${WX_NAMES[zhiWx] || ''}</div>
        </div>`;
    }).join('');

    // 五行分布
    const maxVal = Math.max(...Object.values(wuxing), 1);
    const chart = $('#wuxingChart');
    const wxOrder = [
      { key: '金', cls: 'jin' },
      { key: '木', cls: 'mu' },
      { key: '水', cls: 'shui' },
      { key: '火', cls: 'huo' },
      { key: '土', cls: 'tu' },
    ];

    chart.innerHTML = `
      <div class="wuxing-title">五行分布</div>
      <div class="wuxing-bars">
        ${wxOrder.map(wx => {
          const val = wuxing[wx.key] || 0;
          const pct = (val / maxVal) * 100;
          return `
            <div class="wuxing-bar-row">
              <span class="wuxing-bar-label wx-${wx.cls}">${wx.key}</span>
              <div class="wuxing-bar-track">
                <div class="wuxing-bar-fill ${wx.cls}" style="width: ${pct}%"></div>
              </div>
              <span class="wuxing-bar-value">${val}</span>
            </div>`;
        }).join('')}
      </div>`;

    // 日主
    const dm = $('#dayMaster');
    const missingStr = missingWuxing.length > 0
      ? `，五行缺 <span class="day-master-highlight">${missingWuxing.join('、')}</span>`
      : '，五行俱全';
    dm.innerHTML =
      `日主 <span class="day-master-highlight">${dayMaster.gan}（${dayMaster.wuxing}）</span>` +
      `，${dayMaster.strength}${missingStr}` +
      `，大运${dayunDirection}`;
  }

  // ============ 简易 Markdown 渲染 ============
  function renderMarkdown(text) {
    let html = text
      // 转义 HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      // 粗体 / 斜体
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // 无序列表
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // 有序列表
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // 分隔线
      .replace(/^---$/gm, '<hr>')
      // 段落
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // 包裹 li 到 ul
    html = html.replace(/((?:<li>.*?<\/li>\s*(?:<br>)?)+)/g, '<ul>$1</ul>');
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');

    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h([23])>/g, '<h$1>');
    html = html.replace(/<\/h([23])><\/p>/g, '</h$1>');

    resultContent.innerHTML = html + '<span class="typing-cursor"></span>';

    // 自动滚动到底部
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  // ============ 加载状态 ============
  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : '';
    btnLoading.style.display = loading ? '' : 'none';

    if (loading) {
      resultContent.innerHTML = '';
      resultSection.style.display = 'none';
      baziSection.style.display = 'none';
    }
  }

  // ============ 复制功能 ============
  copyBtn.addEventListener('click', () => {
    const text = resultContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制到剪贴板');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('已复制到剪贴板');
    });
  });

  // ============ 重新分析 ============
  againBtn.addEventListener('click', () => {
    resultSection.style.display = 'none';
    baziSection.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============ 历史记录 ============
  const HISTORY_KEY = 'tianjige-history';
  const MAX_HISTORY = 5;

  function saveHistory(entry) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift(entry);
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length === 0) {
      historySection.style.display = 'none';
      return;
    }
    historySection.style.display = '';

    const shichenNames = [
      '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
      '午时', '未时', '申时', '酉时', '戌时', '亥时',
    ];

    historyList.innerHTML = history.map((h, i) => {
      const date = `${h.year}/${h.month}/${h.day}`;
      const sc = shichenNames[parseInt(h.shichenIndex)] || '';
      const genderLabel = h.gender === 'female' ? '女' : '男';
      const cat = CATEGORY_NAMES[h.category] || '';
      const time = new Date(h.timestamp).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      return `
        <div class="history-item" data-index="${i}">
          <div class="history-item-info">
            <span class="history-item-date">${date} ${sc} ${genderLabel}</span>
            <span class="history-item-category">${cat}</span>
          </div>
          <span class="history-item-time">${time}</span>
        </div>`;
    }).join('');

    // 点击历史条目自动填充
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const h = history[idx];
        if (!h) return;
        yearSelect.value = h.year;
        monthSelect.value = h.month;
        updateDays();
        daySelect.value = h.day;
        $('#birthShichen').value = h.shichenIndex;
        const genderRadio = document.querySelector(`input[name="gender"][value="${h.gender || 'male'}"]`);
        if (genderRadio) genderRadio.checked = true;
        const radio = document.querySelector(`input[name="category"][value="${h.category}"]`);
        if (radio) radio.checked = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('已填充历史记录，点击"开始推演"即可');
      });
    });
  }

  // ============ Toast 提示 ============
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // ============ 启动 ============
  initDateSelectors();
  initTheme();
  renderHistory();

})();
