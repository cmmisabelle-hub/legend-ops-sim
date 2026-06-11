const MAX_DAY = 12;
const STORAGE_KEY = "legendCardOps.accounts.v1";
const LEGACY_STORAGE_KEY = "legendCardOps.v1";
const ACTIVE_ACCOUNT_KEY = "legendCardOps.activeAccount.v1";
const DEFAULT_ACCOUNT = "游客账号";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const money = (value) => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`;
  return `${sign}${abs.toLocaleString("zh-CN")}`;
};

const serverTypes = [
  {
    id: "green",
    name: "绿色服",
    tag: "低氪长线",
    desc: "不卖战力，靠口碑、外观和活跃慢慢滚流水。安全但爆发弱。",
    targetRevenue: 2600000,
    cash: 900000,
    active: 9200,
    reputation: 78,
    risk: 12,
    heat: 52,
    baseRevenue: 170000,
    payPower: 8,
    revenueRate: 0.86,
    dailyActive: 120,
    churn: -0.012,
    activityBias: { cosmetic: 1.2, rebate: 0.72, anticheat: 1.12, customer: 1.18 },
  },
  {
    id: "whale",
    name: "土豪服",
    tag: "大 R 竞技场",
    desc: "榜一榜二打架就是流水密码，但舆情和风险随时爆雷。",
    targetRevenue: 5800000,
    cash: 1500000,
    active: 6500,
    reputation: 48,
    risk: 36,
    heat: 68,
    baseRevenue: 430000,
    payPower: 22,
    revenueRate: 1.35,
    dailyActive: 40,
    churn: 0.01,
    activityBias: { rebate: 1.35, guild: 1.18, live: 1.12, customer: 1.22 },
  },
  {
    id: "brother",
    name: "兄弟服",
    tag: "行会江湖",
    desc: "帮会关系决定在线峰值，攻沙和直播容易出圈。",
    targetRevenue: 3900000,
    cash: 1100000,
    active: 8300,
    reputation: 58,
    risk: 24,
    heat: 70,
    baseRevenue: 270000,
    payPower: 14,
    revenueRate: 1.08,
    dailyActive: 90,
    churn: 0,
    activityBias: { guild: 1.35, live: 1.2, ads: 1.05 },
  },
  {
    id: "rolling",
    name: "滚服",
    tag: "快进快出",
    desc: "新增大、热度高、自然流失也快，适合短平快冲榜。",
    targetRevenue: 4400000,
    cash: 1000000,
    active: 12500,
    reputation: 42,
    risk: 45,
    heat: 82,
    baseRevenue: 320000,
    payPower: 11,
    revenueRate: 1.18,
    dailyActive: 260,
    churn: 0.028,
    activityBias: { ads: 1.28, rebate: 1.18, live: 1.14 },
  },
  {
    id: "classic",
    name: "怀旧服",
    tag: "老玩家回流",
    desc: "玩家更挑剔但留存好，适合稳运营和事件发酵。",
    targetRevenue: 3100000,
    cash: 850000,
    active: 7600,
    reputation: 72,
    risk: 18,
    heat: 48,
    baseRevenue: 220000,
    payPower: 10,
    revenueRate: 0.98,
    dailyActive: 70,
    churn: -0.006,
    activityBias: { guild: 1.16, cosmetic: 1.14, customer: 1.1, rebate: 0.82 },
  },
];

const activities = [
  {
    id: "ads",
    name: "信息流买量",
    tag: "拉新",
    cost: 320000,
    revenue: 260000,
    active: 1800,
    reputation: -2,
    risk: 4,
    heat: 13,
    desc: "砸素材买新增，短期见效快，但素材太土会被玩家嘲。",
  },
  {
    id: "live",
    name: "直播攻沙夜",
    tag: "出圈",
    cost: 260000,
    revenue: 340000,
    active: 900,
    reputation: 1,
    risk: 3,
    heat: 17,
    desc: "请主播带队攻城，在线和话题会涨，行会也容易被点燃。",
  },
  {
    id: "guild",
    name: "跨服帮战",
    tag: "活动",
    cost: 180000,
    revenue: 240000,
    active: 650,
    reputation: 2,
    risk: 1,
    heat: 10,
    desc: "把几个大帮派拉到同一张地图里，让他们自己制造内容。",
  },
  {
    id: "rebate",
    name: "限时充值返利",
    tag: "商业化",
    cost: 90000,
    revenue: 460000,
    active: -100,
    reputation: -7,
    risk: 9,
    heat: 5,
    desc: "流水很好看，但玩家会开始等下一次更狠的返利。",
  },
  {
    id: "customer",
    name: "客服沙龙",
    tag: "服务",
    cost: 220000,
    revenue: 120000,
    active: 260,
    reputation: 10,
    risk: 3,
    heat: 4,
    desc: "请大 R 和核心玩家线下喝茶，能修关系，也可能翻车。",
  },
  {
    id: "anticheat",
    name: "封挂扫荡",
    tag: "治理",
    cost: 240000,
    revenue: 70000,
    active: -380,
    reputation: 7,
    risk: -9,
    heat: -2,
    desc: "清理工作室和脚本号，在线会掉，但经济和口碑能缓过来。",
  },
  {
    id: "cosmetic",
    name: "外观坐骑上架",
    tag: "稳收",
    cost: 120000,
    revenue: 280000,
    active: 100,
    reputation: 2,
    risk: 2,
    heat: 6,
    desc: "不破坏战力的付费点，适合绿色服和怀旧服稳稳回血。",
  },
  {
    id: "merge",
    name: "合服预热",
    tag: "后期",
    cost: 380000,
    revenue: 300000,
    active: 2100,
    reputation: -3,
    risk: 6,
    heat: 14,
    unlockDay: 6,
    desc: "第 6 天后可用。鬼服救命药，但帮派矛盾会被一起带过来。",
  },
];

const eventCards = [
  {
    id: "hotDramaAds",
    type: "good",
    title: "热播剧买量窗口",
    text: "最近有热播剧，买量经理已提前锁定该剧进行买量。今日信息流买量收益翻倍。",
    weight: 10,
    effects: { heatDelta: 8, riskDelta: 2 },
    activityMultiplier: { ads: 2 },
    note: "如果今天做买量，剧集流量会把新增和流水一起抬起来。",
  },
  {
    id: "customerScandal",
    type: "bad",
    title: "客服沙龙翻车",
    text: "榜一大哥在客服沙龙中带女客服离场后被扫黄，本次客服活动被迫中止，若继续办沙龙将额外亏损 50 万。",
    weight: 7,
    effects: { reputationDelta: -10, riskDelta: 14, heatDelta: 8 },
    blockedActivity: "customer",
    blockedRevenueRate: 0.1,
    blockedCost: 500000,
    blockedText: "客服沙龙被迫中止，场地、赔偿和公关额外亏损 50 万。",
  },
  {
    id: "guildViral",
    type: "good",
    title: "帮战名场面预热",
    text: "两个大帮会在短视频平台互喷约战，今天如果开跨服帮战，热度和流水都会大幅提升。",
    weight: 9,
    effects: { activeDelta: 500, heatDelta: 10 },
    activityMultiplier: { guild: 1.85, live: 1.3 },
    note: "帮战相关活动获得额外传播。",
  },
  {
    id: "anchorBreach",
    type: "bad",
    title: "主播临时跳票",
    text: "约好的主播被竞品挖走，直播攻沙夜如果照常办，曝光缩水且需要临时补坑。",
    weight: 8,
    effects: { reputationDelta: -3, heatDelta: -5 },
    activityMultiplier: { live: 0.45 },
    activityCostDelta: { live: 180000 },
    note: "直播活动曝光下滑，还要临时补主播坑位。",
  },
  {
    id: "bossCharge",
    type: "good",
    title: "榜一回归",
    text: "消失三天的榜一突然回归，说今晚要把榜二打服。充值返利和外观上架收益提高。",
    weight: 8,
    effects: { heatDelta: 7, reputationDelta: -1 },
    activityMultiplier: { rebate: 1.65, cosmetic: 1.35, guild: 1.2 },
  },
  {
    id: "paymentCrash",
    type: "bad",
    title: "支付通道抽风",
    text: "晚高峰支付回调延迟，玩家充值不到账截图刷屏。今日总流水打折，客服压力上升。",
    weight: 8,
    effects: { revenueMultiplier: 0.72, costDelta: 80000, reputationDelta: -8, riskDelta: 5 },
    note: "支付问题会压低所有活动流水。",
  },
  {
    id: "platformCrackdown",
    type: "bad",
    title: "平台提示整改",
    text: "返利广告被平台提示整改，今日继续强推充值返利会被限流。",
    weight: 7,
    effects: { riskDelta: 11, reputationDelta: -2 },
    activityMultiplier: { rebate: 0.55 },
    activityCostDelta: { rebate: 120000 },
  },
  {
    id: "antiCheatPraise",
    type: "good",
    title: "散人联名求封挂",
    text: "散人玩家联名发帖要求清脚本，今天封挂扫荡会获得额外口碑收益。",
    weight: 9,
    effects: { heatDelta: 4 },
    activityMultiplier: { anticheat: 1.35 },
    activityEffects: { anticheat: { reputationDelta: 8, riskDelta: -5, activeDelta: 260 } },
  },
  {
    id: "competitorOpen",
    type: "bad",
    title: "竞品新区开门",
    text: "竞品突然开新区并打出高返利广告，今日自然流失增加，买量成本变贵。",
    weight: 8,
    effects: { activeDelta: -900, heatDelta: -7, reputationDelta: -2 },
    activityCostDelta: { ads: 140000 },
  },
  {
    id: "cosmeticTrend",
    type: "good",
    title: "坐骑皮肤出圈",
    text: "玩家自发剪了坐骑变装视频，今天上架外观坐骑会获得额外流水和口碑。",
    weight: 9,
    effects: { heatDelta: 6 },
    activityMultiplier: { cosmetic: 1.75 },
    activityEffects: { cosmetic: { reputationDelta: 4, activeDelta: 200 } },
  },
  {
    id: "regulatorRumor",
    type: "chaos",
    title: "监管传闻",
    text: "行业群流出一份监管传闻，真假未知。今天激进活动有风险，但保守运营会错过热度。",
    weight: 6,
    effects: { riskDelta: 6, heatDelta: 3 },
    activityMultiplier: { rebate: 1.22, ads: 1.15 },
    activityEffects: { rebate: { riskDelta: 8 }, ads: { riskDelta: 4 } },
  },
  {
    id: "quietDay",
    type: "neutral",
    title: "难得平静的一天",
    text: "玩家没有大规模开喷，竞品也没有动作。今天是按自己节奏经营的窗口。",
    weight: 10,
    effects: { reputationDelta: 1, heatDelta: -1 },
  },
];

const elements = {
  targetMetric: document.querySelector("#targetMetric"),
  serverFlavor: document.querySelector("#serverFlavor"),
  topReportTitle: document.querySelector("#topReportTitle"),
  dayMetric: document.querySelector("#dayMetric"),
  serverMetric: document.querySelector("#serverMetric"),
  cashMetric: document.querySelector("#cashMetric"),
  netMetric: document.querySelector("#netMetric"),
  revenueMetric: document.querySelector("#revenueMetric"),
  totalRevenueMetric: document.querySelector("#totalRevenueMetric"),
  targetProgressMetric: document.querySelector("#targetProgressMetric"),
  playerMetric: document.querySelector("#playerMetric"),
  riskMetric: document.querySelector("#riskMetric"),
  serverCards: document.querySelector("#serverCards"),
  drawButton: document.querySelector("#drawButton"),
  eventCard: document.querySelector("#eventCard"),
  activityCards: document.querySelector("#activityCards"),
  settleButton: document.querySelector("#settleButton"),
  continueButton: document.querySelector("#continueButton"),
  accountInput: document.querySelector("#accountInput"),
  switchAccountButton: document.querySelector("#switchAccountButton"),
  chooseServerButton: document.querySelector("#chooseServerButton"),
  dailyReport: document.querySelector("#dailyReport"),
  logList: document.querySelector("#logList"),
  resetButton: document.querySelector("#resetButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultKicker: document.querySelector("#resultKicker"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultStats: document.querySelector("#resultStats"),
  dialogResetButton: document.querySelector("#dialogResetButton"),
  stagePanels: document.querySelectorAll("[data-stage]"),
  steps: {
    server: document.querySelector("#stepServer"),
    draw: document.querySelector("#stepDraw"),
    operate: document.querySelector("#stepOperate"),
    settle: document.querySelector("#stepSettle"),
  },
};

function freshState() {
  return {
    serverId: null,
    day: 1,
    cash: 0,
    active: 0,
    reputation: 0,
    risk: 0,
    heat: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    todayExpense: 0,
    yesterdayNet: 0,
    currentEventId: null,
    selectedActivityId: null,
    lastReport: null,
    reportSeen: true,
    log: [],
    over: false,
  };
}

function loadState() {
  return loadAccountState(activeAccount);
}

function cleanAccountName(value) {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 18) || DEFAULT_ACCOUNT;
}

function loadAccounts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch (error) {
  }
  const accounts = {};
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy && typeof legacy === "object") {
      accounts[DEFAULT_ACCOUNT] = { ...freshState(), ...legacy };
      saveAccounts(accounts);
      saveActiveAccount(DEFAULT_ACCOUNT);
    }
  } catch (error) {
  }
  return accounts;
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function loadActiveAccount() {
  return cleanAccountName(localStorage.getItem(ACTIVE_ACCOUNT_KEY) || DEFAULT_ACCOUNT);
}

function saveActiveAccount(accountName) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, cleanAccountName(accountName));
}

function loadAccountState(accountName) {
  const accounts = loadAccounts();
  return accounts[accountName] ? { ...freshState(), ...accounts[accountName] } : freshState();
}

let activeAccount = loadActiveAccount();
let state = loadState();

function saveState() {
  const accounts = loadAccounts();
  accounts[activeAccount] = state;
  saveAccounts(accounts);
  saveActiveAccount(activeAccount);
}

function switchAccount(accountName) {
  activeAccount = cleanAccountName(accountName);
  state = loadAccountState(activeAccount);
  saveActiveAccount(activeAccount);
  render();
  scrollToStage(getVisibleStage());
}

function scrollToStage(stage) {
  const panel = document.querySelector(`[data-stage="${stage}"]`);
  if (!panel) return;
  window.setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

function getServer(id = state.serverId) {
  return serverTypes.find((server) => server.id === id) || null;
}

function getActivity(id = state.selectedActivityId) {
  return activities.find((activity) => activity.id === id) || null;
}

function getEvent(id = state.currentEventId) {
  return eventCards.find((event) => event.id === id) || null;
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight || 1;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function snapshot() {
  return {
    cash: state.cash,
    active: state.active,
    reputation: state.reputation,
    risk: state.risk,
    heat: state.heat,
    totalRevenue: state.totalRevenue,
  };
}

function startServer(serverId) {
  const server = getServer(serverId);
  if (!server) return;
  state = {
    ...freshState(),
    serverId: server.id,
    cash: server.cash,
    active: server.active,
    reputation: server.reputation,
    risk: server.risk,
    heat: server.heat,
    log: [
      {
        day: 1,
        title: `${server.name}开服`,
        text: server.desc,
      },
    ],
  };
  saveState();
  render();
  scrollToStage("draw");
}

function drawEvent() {
  if (!state.serverId || state.currentEventId || state.over) return;
  const event = weightedPick(eventCards);
  state.currentEventId = event.id;
  state.selectedActivityId = null;
  state.lastReport = null;
  state.reportSeen = true;
  saveState();
  render();
  scrollToStage("draw");
}

function selectActivity(activityId) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity || !state.currentEventId || state.over) return;
  if (activity.unlockDay && state.day < activity.unlockDay) return;
  state.selectedActivityId = activityId;
  saveState();
  render();
  scrollToStage("draw");
}

function applyActivityEventEffects(activity, event) {
  const extra = event.activityEffects?.[activity.id] || {};
  return {
    active: activity.active + (extra.activeDelta || 0),
    reputation: activity.reputation + (extra.reputationDelta || 0),
    risk: activity.risk + (extra.riskDelta || 0),
    heat: activity.heat + (extra.heatDelta || 0),
  };
}

function buildReportNotes(event, activity, activityMultiplier, activityCostDelta, blocked) {
  const notes = [];
  if (event.note) notes.push(event.note);
  if (activityMultiplier > 1.05) notes.push(`${activity.name}吃到事件红利，收益提高 ${Math.round((activityMultiplier - 1) * 100)}%。`);
  if (activityMultiplier < 0.95) notes.push(`${activity.name}被事件压制，收益只剩 ${Math.round(activityMultiplier * 100)}%。`);
  if (activityCostDelta > 0) notes.push(`事件导致额外支出 ${money(activityCostDelta)}。`);
  if (blocked && event.blockedText) notes.push(event.blockedText);
  if (!notes.length) notes.push("今天没有额外修正，主要看服务器底子和活动本身的效率。");
  return notes;
}

function getPlayerFeedback(report) {
  if (report.after.risk >= 85) return "玩家群开始流传“这服要被整改”的截图，客服私聊量上升。";
  if (report.reputationDelta <= -8) return "贴吧出现避雷帖，散人玩家质疑运营又在割韭菜。";
  if (report.activityId === "anticheat") return "世界频道有人刷“终于封挂了”，但工作室小号开始带节奏。";
  if (report.activityId === "guild" || report.activityId === "live") return "行会频道热闹起来，几个会长已经约下一场攻沙。";
  if (report.net > 350000) return "大 R 付费很果断，散人还在观望活动会不会继续加码。";
  if (report.net < -250000) return "玩家没觉得你亏了，但老板已经看到了财务报表。";
  return "玩家情绪暂时平稳，主要在讨论爆率、物价和下一轮活动。";
}

function getBossFeedback(report) {
  if (report.net > 500000) return "老板：今天这流水能上周报，明天继续找增长点。";
  if (report.net > 0 && report.after.reputation >= report.before.reputation) return "老板：赚了钱还没挨骂，这回合可以。";
  if (report.net < -400000) return "老板：一天亏这么多？明天必须给我一个回血方案。";
  if (report.after.risk > 80) return "老板：风险线太红了，再出事就不是运营事故，是项目事故。";
  return "老板：数据能看，但还没到能开香槟的时候。";
}

function getEventClass(type) {
  if (type === "good") return "good";
  if (type === "bad") return "bad";
  if (type === "chaos") return "chaos";
  return "neutral";
}

function settleDay() {
  const server = getServer();
  const event = getEvent();
  const activity = getActivity();
  if (!server || !event || !activity || state.over) return;

  const before = snapshot();
  const effects = event.effects || {};
  const blocked = event.blockedActivity === activity.id;
  const activityMultiplier = event.activityMultiplier?.[activity.id] || 1;
  const serverBias = server.activityBias?.[activity.id] || 1;
  const blockedRevenueRate = blocked ? event.blockedRevenueRate || 0.15 : 1;
  const activityCostDelta = (event.activityCostDelta?.[activity.id] || 0) + (blocked ? event.blockedCost || 0 : 0);
  const activityEffects = applyActivityEventEffects(activity, event);
  const baseRevenue = server.baseRevenue + state.active * server.payPower;
  const eventRevenueMultiplier = effects.revenueMultiplier || 1;
  const variance = randomBetween(0.92, 1.12);
  const revenue = Math.max(
    0,
    Math.round((baseRevenue + activity.revenue * activityMultiplier * blockedRevenueRate) * server.revenueRate * serverBias * eventRevenueMultiplier * variance + (effects.revenueDelta || 0))
  );
  const opsCost = Math.round(80000 + state.active * 2.8 + state.risk * 1200);
  const activityCost = activity.cost;
  const eventCost = (effects.costDelta || 0) + activityCostDelta;
  const expense = Math.max(0, Math.round(activityCost + opsCost + eventCost));
  const net = revenue - expense;
  const churnRate = clamp(0.045 - state.reputation / 2600 + state.risk / 1500 + server.churn, 0.015, 0.18);
  const churn = Math.round(state.active * churnRate);
  const activeAfter = Math.max(300, Math.round(state.active + server.dailyActive + activityEffects.active + (effects.activeDelta || 0) - churn));
  const reputationDelta = activityEffects.reputation + (effects.reputationDelta || 0) + (net < -300000 ? -3 : 0);
  const riskDelta = activityEffects.risk + (effects.riskDelta || 0);
  const heatDelta = activityEffects.heat + (effects.heatDelta || 0) + Math.min(8, revenue / 160000);

  state.cash += net;
  state.totalRevenue += revenue;
  state.todayRevenue = revenue;
  state.todayExpense = expense;
  state.yesterdayNet = net;
  state.active = activeAfter;
  state.reputation = clamp(state.reputation + reputationDelta, 0, 100);
  state.risk = clamp(state.risk + riskDelta, 0, 100);
  state.heat = clamp(state.heat * 0.88 + heatDelta, 0, 100);

  const report = {
    day: state.day,
    serverName: server.name,
    eventId: event.id,
    eventTitle: event.title,
    eventType: event.type,
    activityId: activity.id,
    activityName: activity.name,
    revenue,
    expense,
    net,
    activityCost,
    opsCost,
    eventCost,
    churn,
    before,
    after: snapshot(),
    reputationDelta,
    riskDelta,
    heatDelta,
    notes: buildReportNotes(event, activity, activityMultiplier, activityCostDelta, blocked),
  };
  report.playerFeedback = getPlayerFeedback(report);
  report.bossFeedback = getBossFeedback(report);
  state.lastReport = report;
  state.reportSeen = false;
  state.log.unshift({
    day: state.day,
    title: `${event.title} · ${activity.name}`,
    text: `流水 ${money(revenue)}，支出 ${money(expense)}，净收益 ${money(net)}。${report.bossFeedback}`,
  });

  const result = getSeasonResult();
  state.currentEventId = null;
  state.selectedActivityId = null;
  if (result) {
    state.over = true;
  } else {
    state.day += 1;
  }
  saveState();
  render();
  scrollToStage("report");
  if (result) showResult(result);
}

function getSeasonResult() {
  const server = getServer();
  if (!server) return null;
  if (state.cash < -800000) return { title: "资金链断裂", text: "渠道款、活动成本和客服赔偿一起压上来，项目组被迫暂停运营。", tone: "bad" };
  if (state.reputation <= 5) return { title: "全服骂退", text: "玩家社区形成共识：这服不能碰，新增再多也接不住。", tone: "bad" };
  if (state.risk >= 100) return { title: "被迫整改", text: "广告、返利、舆情和投诉叠满，平台要求停投整改。", tone: "bad" };
  if (state.day < MAX_DAY) return null;
  if (state.totalRevenue >= server.targetRevenue && state.cash > -300000 && state.reputation >= 25 && state.risk < 95) {
    return { title: "赛季达标", text: "你把这组服务器撑到了目标线，老板已经开始问下一组服什么时候开。", tone: "good" };
  }
  return { title: "赛季未达标", text: "服务器活到了最后一天，但流水、现金或玩家口碑没有达到老板预期。", tone: "normal" };
}

function getOperatorTitle() {
  const server = getServer();
  if (!server) return ["未开服", "先选服务器再说。"];
  if (state.totalRevenue >= server.targetRevenue && state.reputation >= 55 && state.risk < 75) return ["沙城金牌操盘手", "赚钱、留人、控风险三件事你都做到了。"];
  if (state.totalRevenue >= server.targetRevenue && state.reputation < 30) return ["氪金收割机", "流水很漂亮，玩家也真的很会骂。"];
  if (state.risk >= 85) return ["刀尖运营大师", "每一天都像在踩红线，但你确实把流水榨出来了。"];
  if (state.reputation >= 65) return ["散人守护者", "不一定最暴利，但玩家愿意继续留下。"];
  if (state.cash < 0) return ["亏损救火队长", "每天都在救急，账面却越来越难看。"];
  return ["首服值班经理", "这就是传奇运营：有爆点，也有事故。"];
}

function resetGame() {
  state = freshState();
  saveState();
  if (elements.resultDialog.open && typeof elements.resultDialog.close === "function") elements.resultDialog.close();
  render();
  scrollToStage("server");
}

function chooseServerAgain() {
  if (state.serverId) {
    const confirmed = window.confirm("重选服务器会清空当前账号本季进度，确定继续吗？");
    if (!confirmed) return;
  }
  resetGame();
}

function confirmResetGame() {
  if (state.serverId) {
    const confirmed = window.confirm("重开本账号会清空当前账号本季进度，确定继续吗？");
    if (!confirmed) return;
  }
  resetGame();
}

function renderSteps() {
  Object.values(elements.steps).forEach((item) => item.classList.remove("active", "done"));
  if (!state.serverId) {
    elements.steps.server.classList.add("active");
    return;
  }
  elements.steps.server.classList.add("done");
  if (state.lastReport && !state.reportSeen) {
    elements.steps.draw.classList.add("done");
    elements.steps.operate.classList.add("done");
    elements.steps.settle.classList.add("active");
    return;
  }
  if (!state.currentEventId && !state.selectedActivityId) elements.steps.draw.classList.add("active");
  if (state.currentEventId) elements.steps.draw.classList.add("done");
  if (state.currentEventId && !state.selectedActivityId) elements.steps.operate.classList.add("active");
  if (state.selectedActivityId) elements.steps.operate.classList.add("done");
  if (state.currentEventId && state.selectedActivityId) elements.steps.settle.classList.add("active");
}

function getVisibleStage() {
  if (!state.serverId) return "server";
  if (state.lastReport && !state.reportSeen) return "report";
  return "draw";
}

function renderStagePanels() {
  const visibleStage = getVisibleStage();
  elements.stagePanels.forEach((panel) => {
    panel.hidden = panel.dataset.stage !== visibleStage;
    if (panel.dataset.stage === "draw") {
      panel.classList.toggle("draw-only", !state.currentEventId);
      panel.classList.toggle("event-drawn", Boolean(state.currentEventId));
    }
  });
}

function renderMetrics() {
  const server = getServer();
  elements.accountInput.value = activeAccount;
  elements.targetMetric.textContent = server ? `目标 ${money(server.targetRevenue)} 流水` : "先选择服务器";
  elements.serverFlavor.textContent = server ? server.desc : "不同服务器决定玩家结构、付费强度和风险底色。";
  elements.dayMetric.textContent = server ? `D${Math.min(state.day, MAX_DAY)}/${MAX_DAY}` : "未开服";
  elements.serverMetric.textContent = server ? `${server.name} · ${server.tag}` : "未开服";
  elements.cashMetric.textContent = server ? money(state.cash) : "-";
  elements.netMetric.textContent = server ? money(state.yesterdayNet) : "-";
  elements.revenueMetric.textContent = server ? `流水 ${money(state.todayRevenue)} · 支出 ${money(state.todayExpense)}` : "流水 / 支出 -";
  elements.totalRevenueMetric.textContent = server ? `累计流水 ${money(state.totalRevenue)}` : "累计流水 -";
  elements.targetProgressMetric.textContent = server ? `目标进度 ${Math.round((state.totalRevenue / server.targetRevenue) * 100)}%` : "目标进度 -";
  elements.playerMetric.textContent = server ? `${Math.round(state.active).toLocaleString("zh-CN")} / ${Math.round(state.reputation)}` : "-";
  elements.riskMetric.textContent = server ? `风险 ${Math.round(state.risk)} · 热度 ${Math.round(state.heat)}` : "风险 -";
  if (!server) {
    elements.topReportTitle.textContent = "还没开服，先选一个服务器";
  } else if (state.currentEventId && state.selectedActivityId) {
    elements.topReportTitle.textContent = `已选择「${getActivity()?.name}」，点击结算当日流水`;
  } else if (state.currentEventId) {
    elements.topReportTitle.textContent = `抽到「${getEvent()?.title}」，现在选择运营活动`;
  } else if (state.lastReport) {
    elements.topReportTitle.textContent = `${state.lastReport.net >= 0 ? "昨日净赚" : "昨日净亏"} ${money(Math.abs(state.lastReport.net))} · ${state.lastReport.eventTitle}`;
  } else {
    elements.topReportTitle.textContent = `${server.name} D${state.day}：先抽今日事件卡`;
  }
  document.querySelector(".top-board").classList.toggle("settled", Boolean(state.lastReport));
}

function renderServers() {
  elements.serverCards.innerHTML = serverTypes
    .map(
      (server) => `
        <button class="server-card ${state.serverId === server.id ? "selected" : ""}" data-server="${server.id}">
          <div><span>${server.tag}</span><strong>${server.name}</strong></div>
          <p>${server.desc}</p>
          <small>初始现金 ${money(server.cash)} · 目标 ${money(server.targetRevenue)} · 口碑 ${server.reputation}</small>
        </button>`
    )
    .join("");
}

function renderEventCard() {
  const server = getServer();
  const event = getEvent();
  elements.drawButton.disabled = !server || Boolean(event) || state.over;
  if (!server) {
    elements.eventCard.className = "event-card empty-card";
    elements.eventCard.innerHTML = `<span>等待开服</span><strong>先选择一个服务器</strong><p>绿色服、土豪服、兄弟服等服务器会带来完全不同的运营底色。</p>`;
    return;
  }
  if (!event) {
    elements.eventCard.className = "event-card empty-card";
    elements.eventCard.innerHTML = `<span>未抽卡</span><strong>点击“抽今日事件”</strong><p>抽到好卡就顺势放大收益，抽到坏卡就想办法止损。抽完卡后才会开放今日运营活动。</p>`;
    return;
  }
  elements.eventCard.className = `event-card ${getEventClass(event.type)}`;
  elements.eventCard.innerHTML = `<span>${event.type === "good" ? "正面事件" : event.type === "bad" ? "负面事件" : event.type === "chaos" ? "混沌事件" : "普通事件"}</span><strong>${event.title}</strong><p>${event.text}</p><small>卡面事件已生效，请根据这张卡选择今日运营活动。</small>`;
}

function renderActivities() {
  const canOperate = Boolean(state.currentEventId) && !state.over;
  const activityPanel = document.querySelector(".activity-panel");
  activityPanel.hidden = !canOperate;
  elements.activityCards.innerHTML = activities
    .map((activity) => {
      const locked = activity.unlockDay && state.day < activity.unlockDay;
      const disabled = !canOperate || locked;
      return `
        <button class="activity-card ${state.selectedActivityId === activity.id ? "selected" : ""} ${disabled ? "disabled" : ""}" data-activity="${activity.id}" ${disabled ? "disabled" : ""}>
          <div class="activity-top"><strong>${activity.name}</strong><span>${activity.tag}</span></div>
          <p>${activity.desc}</p>
          <div class="activity-meta">
            <span>成本 ${money(activity.cost)}</span>
            <span>基础流水 ${money(activity.revenue)}</span>
            <span>${locked ? `第 ${activity.unlockDay} 天解锁` : `活跃 ${activity.active >= 0 ? "+" : ""}${activity.active}`}</span>
          </div>
        </button>`;
    })
    .join("");
  elements.settleButton.disabled = !state.currentEventId || !state.selectedActivityId || state.over;
  activityPanel.classList.toggle("locked-panel", !state.currentEventId);
}

function renderReport() {
  const report = state.lastReport;
  if (!report) {
    elements.dailyReport.innerHTML = `<div class="empty-state">抽取事件并选择运营活动后，会在这里生成当日流水、支出、净收益和反馈。</div>`;
    return;
  }
  elements.dailyReport.innerHTML = `
    <div class="report-summary ${report.net >= 0 ? "good" : "bad"}">
      <span>D${report.day} · ${report.serverName}</span>
      <strong>${report.net >= 0 ? "净赚" : "净亏"} ${money(Math.abs(report.net))}</strong>
      <p>${report.eventTitle} 后选择了 ${report.activityName}。</p>
    </div>
    <div class="report-grid">
      <div><span>当日流水</span><strong>${money(report.revenue)}</strong></div>
      <div><span>当日支出</span><strong>${money(report.expense)}</strong></div>
      <div><span>活动成本</span><strong>${money(report.activityCost)}</strong></div>
      <div><span>运营成本</span><strong>${money(report.opsCost)}</strong></div>
      <div><span>事件成本</span><strong>${money(report.eventCost)}</strong></div>
      <div><span>流失玩家</span><strong>${report.churn.toLocaleString("zh-CN")}</strong></div>
    </div>
    <div class="report-lines">
      ${report.notes.map((note) => `<p>${note}</p>`).join("")}
      <p><strong>玩家反馈：</strong>${report.playerFeedback}</p>
      <p><strong>老板反馈：</strong>${report.bossFeedback}</p>
    </div>`;
}

function renderLog() {
  elements.logList.innerHTML = state.log.length
    ? state.log.map((item) => `<li><strong>D${item.day} · ${item.title}</strong><span>${item.text}</span></li>`).join("")
    : `<li><strong>等待开服</strong><span>选择服务器后开始记录每一天的运营事故和名场面。</span></li>`;
}

function render() {
  renderStagePanels();
  renderSteps();
  renderMetrics();
  renderServers();
  renderEventCard();
  renderActivities();
  renderReport();
  renderLog();
}

function showResult(result) {
  const server = getServer();
  const [operatorTitle, operatorText] = getOperatorTitle();
  elements.resultKicker.textContent = `${server?.name || "赛季"} · D${Math.min(state.day, MAX_DAY)} 结算`;
  elements.resultTitle.textContent = `${result.title} · ${operatorTitle}`;
  elements.resultText.innerHTML = `${result.text}<br><strong>${operatorText}</strong>`;
  elements.resultStats.innerHTML = [
    ["累计流水", money(state.totalRevenue)],
    ["目标流水", money(server?.targetRevenue || 0)],
    ["剩余现金", money(state.cash)],
    ["活跃 / 口碑", `${Math.round(state.active).toLocaleString("zh-CN")} / ${Math.round(state.reputation)}`],
    ["风险 / 热度", `${Math.round(state.risk)} / ${Math.round(state.heat)}`],
  ]
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  if (typeof elements.resultDialog.showModal === "function") {
    elements.resultDialog.showModal();
  } else {
    elements.resultDialog.setAttribute("open", "");
  }
}

elements.serverCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-server]");
  if (!card) return;
  if (state.serverId && state.serverId !== card.dataset.server) {
    const confirmed = window.confirm("切换服务器会重开本季，确定要换服吗？");
    if (!confirmed) return;
  }
  startServer(card.dataset.server);
});

elements.activityCards.addEventListener("click", (event) => {
  const card = event.target.closest("[data-activity]");
  if (!card) return;
  selectActivity(card.dataset.activity);
});

elements.drawButton.addEventListener("click", drawEvent);
elements.settleButton.addEventListener("click", settleDay);
elements.continueButton.addEventListener("click", () => {
  state.reportSeen = true;
  saveState();
  render();
  scrollToStage("draw");
});
elements.switchAccountButton.addEventListener("click", () => switchAccount(elements.accountInput.value));
elements.accountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") switchAccount(elements.accountInput.value);
});
elements.chooseServerButton.addEventListener("click", chooseServerAgain);
elements.resetButton.addEventListener("click", confirmResetGame);
elements.dialogResetButton.addEventListener("click", resetGame);

render();
