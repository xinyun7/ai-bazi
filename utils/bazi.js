const { Solar, Lunar, EightChar } = require('lunar-javascript');

/**
 * 十二时辰与小时对应关系
 */
const SHICHEN_MAP = [
  { name: '子时', alias: '子', hours: [23, 0], desc: '23:00-01:00' },
  { name: '丑时', alias: '丑', hours: [1, 2], desc: '01:00-03:00' },
  { name: '寅时', alias: '寅', hours: [3, 4], desc: '03:00-05:00' },
  { name: '卯时', alias: '卯', hours: [5, 6], desc: '05:00-07:00' },
  { name: '辰时', alias: '辰', hours: [7, 8], desc: '07:00-09:00' },
  { name: '巳时', alias: '巳', hours: [9, 10], desc: '09:00-11:00' },
  { name: '午时', alias: '午', hours: [11, 12], desc: '11:00-13:00' },
  { name: '未时', alias: '未', hours: [13, 14], desc: '13:00-15:00' },
  { name: '申时', alias: '申', hours: [15, 16], desc: '15:00-17:00' },
  { name: '酉时', alias: '酉', hours: [17, 18], desc: '17:00-19:00' },
  { name: '戌时', alias: '戌', hours: [19, 20], desc: '19:00-21:00' },
  { name: '亥时', alias: '亥', hours: [21, 22], desc: '21:00-23:00' },
];

/**
 * 天干五行对应
 */
const TIANGAN_WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/**
 * 地支五行对应
 */
const DIZHI_WUXING = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

/**
 * 地支藏干（用于更精确的五行计算）
 */
const DIZHI_CANGGAN = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/**
 * 时辰索引转为代表小时（用于 lunar-javascript）
 */
function shichenToHour(shichenIndex) {
  if (shichenIndex === 0) return 0; // 子时用 0 点
  return shichenIndex * 2 - 1;
}

/**
 * 计算五行分布
 */
function calcWuxing(eightCharStr) {
  const counts = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  const chars = eightCharStr.split('');

  chars.forEach((ch, i) => {
    if (i % 2 === 0) {
      // 天干
      if (TIANGAN_WUXING[ch]) counts[TIANGAN_WUXING[ch]]++;
    } else {
      // 地支
      if (DIZHI_WUXING[ch]) counts[DIZHI_WUXING[ch]]++;
      // 加入藏干（权重 0.5）
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

/**
 * 分析日主强弱
 */
function analyzeRizhu(dayGan, wuxing) {
  const dayWuxing = TIANGAN_WUXING[dayGan];
  // 生我者（印星）
  const shengWo = {
    '木': '水', '火': '木', '土': '火', '金': '土', '水': '金'
  };
  const sameCount = wuxing[dayWuxing] || 0;
  const shengCount = wuxing[shengWo[dayWuxing]] || 0;
  const helpScore = sameCount + shengCount;
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0);

  if (helpScore > total * 0.45) return '偏强';
  if (helpScore < total * 0.3) return '偏弱';
  return '中和';
}

/**
 * 判断缺失五行
 */
function getMissingWuxing(wuxing) {
  return Object.entries(wuxing)
    .filter(([, v]) => v === 0)
    .map(([k]) => k);
}

/**
 * 获取当前流年流月信息
 */
function getCurrentLiuNian() {
  const now = new Date();
  const solar = Solar.fromDate(now);
  const lunar = solar.getLunar();
  const yearGanZhi = lunar.getYearInGanZhiExact();
  const monthGanZhi = lunar.getMonthInGanZhiExact();
  const dayGanZhi = lunar.getDayInGanZhi();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    lunarYear: lunar.getYearInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
  };
}

/**
 * 阳干列表（用于判断大运顺逆）
 */
const YANG_GAN = ['甲', '丙', '戊', '庚', '壬'];

/**
 * 计算大运方向
 * 阳年男命 / 阴年女命 → 顺排
 * 阴年男命 / 阳年女命 → 逆排
 */
function getDayunDirection(yearGan, gender) {
  const isYangGan = YANG_GAN.includes(yearGan);
  const isMale = gender === 'male';
  return (isYangGan === isMale) ? '顺排' : '逆排';
}

/**
 * 主函数：计算八字
 * @param {number} year - 公历年
 * @param {number} month - 公历月 (1-12)
 * @param {number} day - 公历日
 * @param {number} shichenIndex - 时辰索引 (0=子时, 1=丑时, ..., 11=亥时)
 * @param {string} gender - 性别 ('male' 或 'female')
 * @returns {object} 八字详细信息
 */
function calculateBazi(year, month, day, shichenIndex, gender = 'male') {
  const hour = shichenToHour(shichenIndex);
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 四柱
  const yearZhu = eightChar.getYear();
  const monthZhu = eightChar.getMonth();
  const dayZhu = eightChar.getDay();
  const timeZhu = eightChar.getTime();

  // 天干地支拆分
  const yearGan = eightChar.getYearGan();
  const yearZhi = eightChar.getYearZhi();
  const monthGan = eightChar.getMonthGan();
  const monthZhi = eightChar.getMonthZhi();
  const dayGan = eightChar.getDayGan();
  const dayZhi = eightChar.getDayZhi();
  const timeGan = eightChar.getTimeGan();
  const timeZhi = eightChar.getTimeZhi();

  // 八字字符串
  const allChars = yearGan + yearZhi + monthGan + monthZhi + dayGan + dayZhi + timeGan + timeZhi;

  // 五行分布
  const wuxing = calcWuxing(allChars);

  // 日主（日柱天干）
  const dayWuxing = TIANGAN_WUXING[dayGan];
  const strength = analyzeRizhu(dayGan, wuxing);
  const missing = getMissingWuxing(wuxing);

  // 农历信息
  const lunarDate = {
    year: lunar.getYearInChinese(),
    month: lunar.getMonthInChinese(),
    day: lunar.getDayInChinese(),
  };

  // 流年信息
  const liuNian = getCurrentLiuNian();

  // 大运方向
  const dayunDirection = getDayunDirection(yearGan, gender);

  return {
    // 四柱
    fourPillars: {
      year: { gan: yearGan, zhi: yearZhi, full: yearZhu },
      month: { gan: monthGan, zhi: monthZhi, full: monthZhu },
      day: { gan: dayGan, zhi: dayZhi, full: dayZhu },
      time: { gan: timeGan, zhi: timeZhi, full: timeZhu },
    },
    // 日主
    dayMaster: {
      gan: dayGan,
      wuxing: dayWuxing,
      strength,
    },
    // 五行
    wuxing,
    missingWuxing: missing,
    // 农历
    lunarDate,
    // 原始时辰
    shichen: SHICHEN_MAP[shichenIndex],
    // 流年
    liuNian,
    // 输入的公历
    solarDate: { year, month, day },
    // 性别 & 大运
    gender,
    dayunDirection,
  };
}

module.exports = {
  calculateBazi,
  SHICHEN_MAP,
  TIANGAN_WUXING,
  DIZHI_WUXING,
  getCurrentLiuNian,
};
