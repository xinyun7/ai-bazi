const CATEGORIES = {
  comprehensive: '综合运势',
  career: '事业运势',
  wealth: '财运',
  love: '感情运势',
  health: '健康运势',
};

/**
 * 格式化八字信息为提示文本
 */
function formatBaziInfo(bazi) {
  const { fourPillars, dayMaster, wuxing, missingWuxing, lunarDate, shichen, liuNian, solarDate, gender, dayunDirection } = bazi;
  const genderLabel = gender === 'female' ? '女（坤造）' : '男（乾造）';

  return `
【命主信息】
性别：${genderLabel}
公历生日：${solarDate.year}年${solarDate.month}月${solarDate.day}日
农历生日：${lunarDate.year}年${lunarDate.month}月${lunarDate.day}
出生时辰：${shichen.name}（${shichen.desc}）

【四柱八字】
年柱：${fourPillars.year.full}
月柱：${fourPillars.month.full}
日柱：${fourPillars.day.full}
时柱：${fourPillars.time.full}

【日主分析】
日主天干：${dayMaster.gan}（${dayMaster.wuxing}）
日主强弱：${dayMaster.strength}
大运方向：${dayunDirection}

【五行分布】
金：${wuxing['金']}  木：${wuxing['木']}  水：${wuxing['水']}  火：${wuxing['火']}  土：${wuxing['土']}
${missingWuxing.length > 0 ? `五行缺：${missingWuxing.join('、')}` : '五行俱全'}

【当前流年信息】
公历：${liuNian.year}年${liuNian.month}月${liuNian.day}日
农历：${liuNian.lunarYear}年${liuNian.lunarMonth}月${liuNian.lunarDay}
流年干支：${liuNian.yearGanZhi}
流月干支：${liuNian.monthGanZhi}
流日干支：${liuNian.dayGanZhi}
`.trim();
}

/**
 * 获取系统 prompt
 */
function getSystemPrompt() {
  return `你是"天机阁"的首席命理师，精通周易、八字命理、五行学说、十神分析、大运流年推算。你有数十年的命理实践经验，学贯古今，融合了《滴天髓》《子平真诠》《穷通宝鉴》等经典著作的智慧。

你的分析风格：
1. 专业而不晦涩——用通俗易懂的方式解释命理术语
2. 客观而有温度——既指出挑战也给出积极的应对建议
3. 理论有据——每个判断都基于八字命理的理论依据
4. 实用导向——给出具体可行的建议，而非空洞的论述

重要原则：
- 基于提供的八字信息和流年流月进行分析，确保逻辑自洽
- 区分乾造（男命）和坤造（女命），男命看官杀财星，女命看官星财星，桃花分析也要区分性别
- 大运排列方向已给出（顺排/逆排），请据此推算当前所行大运
- 分析近期运势时，要结合流年流月干支与命局的相互作用
- 给出的建议要具体、可操作
- 语气温和、有人情味，像一位智慧长者在指引后辈
- 适当引用经典命理口诀或古语增添韵味
- 最后附上免责：命理分析仅供参考，人定胜天，命运掌握在自己手中`;
}

/**
 * 获取领域分析的 prompt
 */
function getCategoryPrompt(category) {
  const prompts = {
    comprehensive: `请为命主进行【综合运势】分析，包含以下板块：

## 🔮 命局总评
简要分析八字格局特点、日主强弱对命主性格和人生倾向的影响。

## 📅 近期运势概览
结合当前流年流月干支与命局的生克关系，分析最近1-3个月的整体运势走向。

## 🌟 近期吉事预告
列举3-5件近期可能遇到的好事或有利时机，说明原因。

## ⚠️ 近期注意事项
列举3-5件需要注意或防范的事项，给出具体建议。

## 💡 开运指南
给出具体的开运建议，包括：
- 幸运方位
- 幸运颜色
- 适宜做的事
- 应该避免的事
- 贵人特征

## 📝 寄语
一段温暖有力量的寄语。`,

    career: `请为命主进行【事业运势】专项分析：

## 💼 事业命局分析
分析八字中与事业相关的信息（官星、印星、食伤等），命主适合的职业方向。

## 📊 近期事业运势
结合流年流月，分析近1-3个月事业方面的运势走向。

## 🌟 事业机遇
近期事业上可能出现的好机会、贵人助力、晋升可能等。

## ⚠️ 职场注意
需要警惕的职场风险，如小人、决策失误等，以及化解方法。

## 💡 事业建议
具体的事业发展建议和行动指南。`,

    wealth: `请为命主进行【财运】专项分析：

## 💰 财运命局分析
分析八字中的正财、偏财格局，命主的财运特点和理财倾向。

## 📈 近期财运走势
结合流年流月，分析近1-3个月的财运变化。

## 🌟 进财机遇
近期可能的进财渠道和有利时机。

## ⚠️ 破财风险
需要注意的财务风险和破财隐患，以及防范建议。

## 💡 理财建议
具体的理财策略和求财方向建议。`,

    love: `请为命主进行【感情运势】专项分析（注意区分乾造/坤造）：

## 💕 感情命局分析
分析八字中与感情相关的信息。男命（乾造）重点看财星（正财为妻），女命（坤造）重点看官星（正官为夫），同时分析桃花星、红鸾天喜等。

## 💑 近期感情运势
结合流年流月，分析近1-3个月的感情运势走向。

## 🌟 桃花机缘
近期可能出现的感情机遇，有利于感情发展的时机。

## ⚠️ 感情注意
感情方面需要注意的问题和可能的波折。

## 💡 感情建议
改善感情运势的具体建议和行动指南。`,

    health: `请为命主进行【健康运势】专项分析：

## 🏥 健康命局分析
根据五行分布分析命主体质特点和容易出现的健康问题。

## 🌡️ 近期健康运势
结合流年流月，分析近1-3个月的健康状况。

## 🌟 健康利好
近期有利于健康的因素和调养时机。

## ⚠️ 健康警示
需要特别注意的健康风险，容易出问题的身体部位。

## 💡 养生建议
具体的养生保健建议，包括饮食、运动、作息等方面。`,
  };

  return prompts[category] || prompts.comprehensive;
}

/**
 * 构建完整的消息数组
 */
function buildMessages(bazi, category) {
  const baziInfo = formatBaziInfo(bazi);
  const categoryPrompt = getCategoryPrompt(category);

  return [
    { role: 'system', content: getSystemPrompt() },
    {
      role: 'user',
      content: `以下是命主的八字信息和当前时间信息：

${baziInfo}

${categoryPrompt}

请基于以上八字信息，运用周易命理知识进行详细分析。分析要有理有据，引用命理理论支撑你的判断。`
    }
  ];
}

module.exports = {
  CATEGORIES,
  buildMessages,
  formatBaziInfo,
};
