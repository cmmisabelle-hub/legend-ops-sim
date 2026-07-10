const MAX_DAY = 7;
const STORAGE_KEY = "legendCardOps.accounts.v1";
const LEGACY_STORAGE_KEY = "legendCardOps.v1";
const ACTIVE_ACCOUNT_KEY = "legendCardOps.activeAccount.v1";
const DEFAULT_ACCOUNT = "游客账号";
const MAX_ACTIVITY_REROLLS = 3;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const money = (value) => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`;
  return `${sign}${abs.toLocaleString("zh-CN")}`;
};

const rarityConfig = {
  red: { label: "红色负面", tone: "谨慎 · 后期投放", className: "red" },
  green: { label: "绿色小赚", tone: "稳健回血", className: "green" },
  purple: { label: "紫色中赚", tone: "节奏起飞", className: "purple" },
  gold: { label: "金色大赚", tone: "爆款庆祝", className: "gold" },
};

const storySteps = [
  {
    title: "停服前夜",
    text: "凌晨两点，沙城服务器还亮着红灯。老板把一份报表推到你面前：买量费烧穿、行会群在吵、榜一说要退服。这个项目只剩 7 天窗口，救不回来就关服止损。",
  },
  {
    title: "旧城新盘",
    text: "你接手的不是一款新游戏，而是一座还在喘气的老城。散人要公平，大 R 要排面，渠道要流水，平台要合规。每一个按钮背后，都有人在等你的选择。",
  },
  {
    title: "七日军令",
    text: "财务只给了一个数字：7 天目标流水。达标，项目组继续开新区；失败，复盘会后团队解散。你每天只能先抽一张运营卡，再从有限活动里做选择。",
  },
  {
    title: "开服令",
    text: "城门已经挂起战旗，渠道群等着素材，玩家群等着公告。确认账号、看完引导、选定服务器后，这一局就正式开服。",
  },
];

const guideSteps = [
  {
    title: "欢迎接手项目",
    text: "你有 7 天时间把服务器流水做到目标线。先确认账号，再选服，之后每天抽运营卡并做经营决策。",
  },
  {
    title: "第一步：确认账号",
    text: "账号就是你的存档位。不同账号之间现金、流水、服务器和排行榜数据互不影响。",
  },
  {
    title: "第二步：创角选服",
    text: "绿色服稳、土豪服爆发高、滚服节奏快。选服后，选服模块会自然消失，进入运营卡池。",
  },
  {
    title: "第三步：抽运营卡",
    text: "系统会先判断必出条件，再从卡池随机。落后可能补金卡，领先可能吃红卡，近 3 天不会重复出同一张卡。",
  },
  {
    title: "第四步：做经营决策",
    text: "每天只随机发 1 个运营活动。你可以直接执行，也可以点“换一个”，每天最多换 3 次。7 天内达标就起飞。",
  },
];

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
    rarity: "gold",
    cardPool: "random",
    culture: "社会事件 · 热点买量",
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
    rarity: "red",
    cardPool: "random",
    culture: "社会事件 · 公关危机",
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
    id: "platformFeature",
    type: "good",
    rarity: "gold",
    cardPool: "random",
    culture: "玩家涌现 · 平台扶持",
    title: "平台首页推荐",
    text: "平台运营看到你的服数据抬头，临时给了首页推荐位。今天直播、买量和跨服活动都能吃到爆量红利。",
    weight: 5,
    effects: { activeDelta: 1600, heatDelta: 18, reputationDelta: 3 },
    activityMultiplier: { ads: 1.8, live: 1.75, guild: 1.45, cosmetic: 1.25 },
    note: "平台推荐会把新增、热度和付费一起推高，是典型金色大赚窗口。",
  },
  {
    id: "guildViral",
    type: "good",
    rarity: "purple",
    cardPool: "random",
    culture: "玩家涌现 · 行会自传播",
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
    rarity: "red",
    cardPool: "random",
    culture: "投放事故 · 达人违约",
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
    rarity: "purple",
    cardPool: "fixed",
    culture: "付费生态 · 大 R 回流",
    title: "榜一回归",
    text: "消失三天的榜一突然回归，说今晚要把榜二打服。充值返利和外观上架收益提高。",
    weight: 8,
    effects: { heatDelta: 7, reputationDelta: -1 },
    activityMultiplier: { rebate: 1.65, cosmetic: 1.35, guild: 1.2 },
  },
  {
    id: "paymentCrash",
    type: "bad",
    rarity: "red",
    cardPool: "random",
    culture: "基础设施 · 支付事故",
    title: "支付通道抽风",
    text: "晚高峰支付回调延迟，玩家充值不到账截图刷屏。今日总流水打折，客服压力上升。",
    weight: 8,
    effects: { revenueMultiplier: 0.72, costDelta: 80000, reputationDelta: -8, riskDelta: 5 },
    note: "支付问题会压低所有活动流水。",
  },
  {
    id: "platformCrackdown",
    type: "bad",
    rarity: "red",
    cardPool: "fixed",
    culture: "合规风险 · 平台整改",
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
    rarity: "green",
    cardPool: "random",
    culture: "口碑治理 · 反外挂",
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
    rarity: "red",
    cardPool: "random",
    culture: "竞品压力 · 市场抢量",
    title: "竞品新区开门",
    text: "竞品突然开新区并打出高返利广告，今日自然流失增加，买量成本变贵。",
    weight: 8,
    effects: { activeDelta: -900, heatDelta: -7, reputationDelta: -2 },
    activityCostDelta: { ads: 140000 },
  },
  {
    id: "cosmeticTrend",
    type: "good",
    rarity: "purple",
    cardPool: "random",
    culture: "内容出圈 · 外观消费",
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
    rarity: "green",
    cardPool: "fixed",
    culture: "行业风向 · 风险博弈",
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
    rarity: "green",
    cardPool: "random",
    culture: "口碑沉淀 · 稳态经营",
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
  goalTitle: document.querySelector("#goalTitle"),
  goalPercent: document.querySelector("#goalPercent"),
  goalProgressBar: document.querySelector("#goalProgressBar"),
  goalProgressText: document.querySelector("#goalProgressText"),
  goalPaceText: document.querySelector("#goalPaceText"),
  playerMetric: document.querySelector("#playerMetric"),
  riskMetric: document.querySelector("#riskMetric"),
  serverCards: document.querySelector("#serverCards"),
  drawButton: document.querySelector("#drawButton"),
  eventCard: document.querySelector("#eventCard"),
  activityCards: document.querySelector("#activityCards"),
  rerollActivityButton: document.querySelector("#rerollActivityButton"),
  activityRerollMetric: document.querySelector("#activityRerollMetric"),
  settleButton: document.querySelector("#settleButton"),
  continueButton: document.querySelector("#continueButton"),
  startStoryButton: document.querySelector("#startStoryButton"),
  startGuideButton: document.querySelector("#startGuideButton"),
  accountInput: document.querySelector("#accountInput"),
  switchAccountButton: document.querySelector("#switchAccountButton"),
  confirmAccountButton: document.querySelector("#confirmAccountButton"),
  chooseServerButton: document.querySelector("#chooseServerButton"),
  topAccountInput: document.querySelector("#topAccountInput"),
  topSwitchAccountButton: document.querySelector("#topSwitchAccountButton"),
  topChooseServerButton: document.querySelector("#topChooseServerButton"),
  topResetButton: document.querySelector("#topResetButton"),
  leaderboardCount: document.querySelector("#leaderboardCount"),
  leaderboardList: document.querySelector("#leaderboardList"),
  mentorTitle: document.querySelector("#mentorTitle"),
  mentorText: document.querySelector("#mentorText"),
  mentorActionButton: document.querySelector("#mentorActionButton"),
  guideButton: document.querySelector("#guideButton"),
  guideDialog: document.querySelector("#guideDialog"),
  guideTitle: document.querySelector("#guideTitle"),
  guideText: document.querySelector("#guideText"),
  guideProgress: document.querySelector("#guideProgress"),
  guidePrevButton: document.querySelector("#guidePrevButton"),
  guideNextButton: document.querySelector("#guideNextButton"),
  guideSkipButton: document.querySelector("#guideSkipButton"),
  storyDialog: document.querySelector("#storyDialog"),
  storyTitle: document.querySelector("#storyTitle"),
  storyText: document.querySelector("#storyText"),
  storyProgress: document.querySelector("#storyProgress"),
  storyPrevButton: document.querySelector("#storyPrevButton"),
  storyNextButton: document.querySelector("#storyNextButton"),
  dailyReport: document.querySelector("#dailyReport"),
  logList: document.querySelector("#logList"),
  resetButton: document.querySelector("#resetButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultKicker: document.querySelector("#resultKicker"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultStats: document.querySelector("#resultStats"),
  dialogResetButton: document.querySelector("#dialogResetButton"),
  celebrationLayer: document.querySelector("#celebrationLayer"),
  topBoard: document.querySelector(".top-board"),
  ruleSteps: document.querySelectorAll(".rules [data-step]"),
  stagePanels: document.querySelectorAll("[data-stage]"),
  steps: {
    account: document.querySelector("#stepAccount"),
    story: document.querySelector("#stepStory"),
    guide: document.querySelector("#stepGuide"),
    server: document.querySelector("#stepServer"),
    draw: document.querySelector("#stepDraw"),
    operate: document.querySelector("#stepOperate"),
    settle: document.querySelector("#stepSettle"),
  },
};

const stepOrder = ["account", "story", "guide", "server", "draw", "operate", "settle"];

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
    offeredActivityId: null,
    activityRerollsUsed: 0,
    storySeen: false,
    guideSeen: false,
    lastReport: null,
    reportSeen: true,
    eventHistory: [],
    lastDrawReason: null,
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
let accountConfirmed = false;
let storyIndex = 0;
let storyMandatory = false;
let guideIndex = 0;
let guideMandatory = false;

function saveState() {
  const accounts = loadAccounts();
  accounts[activeAccount] = state;
  saveAccounts(accounts);
  saveActiveAccount(activeAccount);
}

function openStory(index = 0, options = {}) {
  storyMandatory = Boolean(options.mandatory);
  storyIndex = clamp(index, 0, storySteps.length - 1);
  renderStory();
  if (typeof elements.storyDialog.showModal === "function") {
    elements.storyDialog.showModal();
  } else {
    elements.storyDialog.setAttribute("open", "");
  }
  window.setTimeout(() => elements.storyNextButton.focus({ preventScroll: true }), 80);
}

function closeStory() {
  if (storyMandatory && !state.storySeen) return;
  if (elements.storyDialog.open && typeof elements.storyDialog.close === "function") {
    elements.storyDialog.close();
  } else {
    elements.storyDialog.removeAttribute("open");
  }
  storyMandatory = false;
}

function completeStory() {
  state.storySeen = true;
  saveState();
  closeStory();
  render();
  scrollToNextAction();
  maybeOpenGuide();
}

function renderStory() {
  const step = storySteps[storyIndex];
  elements.storyTitle.textContent = step.title;
  elements.storyText.textContent = step.text;
  elements.storyProgress.textContent = `${storyIndex + 1} / ${storySteps.length}`;
  elements.storyPrevButton.disabled = storyIndex === 0;
  elements.storyNextButton.textContent = storyIndex === storySteps.length - 1 ? "接下军令" : "下一幕";
}

function maybeOpenStory() {
  if (!accountConfirmed || state.storySeen || elements.storyDialog.open) return;
  window.setTimeout(() => {
    if (accountConfirmed && !state.storySeen && !elements.storyDialog.open) openStory(0, { mandatory: true });
  }, 120);
}

function openGuide(index = 0, options = {}) {
  guideMandatory = Boolean(options.mandatory);
  guideIndex = clamp(index, 0, guideSteps.length - 1);
  renderGuide();
  if (typeof elements.guideDialog.showModal === "function") {
    elements.guideDialog.showModal();
  } else {
    elements.guideDialog.setAttribute("open", "");
  }
  window.setTimeout(() => elements.guideNextButton.focus({ preventScroll: true }), 80);
}

function closeGuide() {
  if (guideMandatory && !state.guideSeen) return;
  if (elements.guideDialog.open && typeof elements.guideDialog.close === "function") {
    elements.guideDialog.close();
  } else {
    elements.guideDialog.removeAttribute("open");
  }
  guideMandatory = false;
}

function completeGuide() {
  state.guideSeen = true;
  saveState();
  closeGuide();
  render();
  scrollToNextAction();
}

function renderGuide() {
  const step = guideSteps[guideIndex];
  elements.guideTitle.textContent = step.title;
  elements.guideText.textContent = step.text;
  elements.guideProgress.textContent = `${guideIndex + 1} / ${guideSteps.length}`;
  elements.guidePrevButton.disabled = guideIndex === 0;
  elements.guideNextButton.textContent = guideIndex === guideSteps.length - 1 ? "开始经营" : "下一条";
  elements.guideSkipButton.hidden = guideMandatory;
  elements.guideSkipButton.disabled = guideMandatory;
}

function maybeOpenGuide() {
  if (!accountConfirmed || !state.storySeen || state.guideSeen || elements.guideDialog.open) return;
  window.setTimeout(() => {
    if (accountConfirmed && state.storySeen && !state.guideSeen && !elements.guideDialog.open) openGuide(0, { mandatory: true });
  }, 120);
}

function switchAccount(accountName) {
  activeAccount = cleanAccountName(accountName);
  state = loadAccountState(activeAccount);
  accountConfirmed = true;
  saveState();
  saveActiveAccount(activeAccount);
  render();
  scrollToNextAction();
  maybeOpenStory();
  maybeOpenGuide();
}

function scrollToStage(stage) {
  const panel = document.querySelector(`[data-stage="${stage}"]`);
  if (!panel) return;
  window.setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}

function scrollToElement(element) {
  if (!element) return;
  window.setTimeout(() => {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof element.focus === "function") element.focus({ preventScroll: true });
  }, 80);
}

function getNextActionElement() {
  if (!accountConfirmed) return elements.confirmAccountButton;
  if (!state.storySeen) return elements.startStoryButton;
  if (!state.guideSeen) return elements.startGuideButton;
  if (!state.serverId) return elements.serverCards.querySelector("[data-server]");
  if (state.lastReport && !state.reportSeen) return elements.continueButton;
  if (!state.currentEventId) return elements.drawButton;
  if (!state.selectedActivityId) return elements.activityCards.querySelector("[data-activity]:not([disabled])") || elements.rerollActivityButton;
  return elements.settleButton;
}

function scrollToNextAction() {
  scrollToElement(getNextActionElement() || document.querySelector(`[data-stage="${getVisibleStage()}"]`));
}

function getServer(id = state.serverId) {
  return serverTypes.find((server) => server.id === id) || null;
}

function getActivity(id = state.selectedActivityId) {
  return activities.find((activity) => activity.id === id) || null;
}

function getAvailableActivities() {
  return activities.filter((activity) => !activity.unlockDay || state.day >= activity.unlockDay);
}

function pickActivityOffer(excludeId = null) {
  let pool = getAvailableActivities().filter((activity) => activity.id !== excludeId);
  if (!pool.length) pool = getAvailableActivities();
  return pool[Math.floor(Math.random() * pool.length)] || activities[0];
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

function getTargetProgress() {
  const server = getServer();
  if (!server) return 0;
  return clamp(state.totalRevenue / server.targetRevenue, 0, 1.25);
}

function getExpectedProgress() {
  return clamp((state.day - 1) / MAX_DAY, 0, 1);
}

function getForcedRarity() {
  const progress = getTargetProgress();
  const expected = getExpectedProgress();
  if (state.day === MAX_DAY && progress < 1) return { rarity: "gold", reason: "第七天保底：最后冲刺必出金色大赚卡。" };
  if (progress < expected - 0.18) return { rarity: "gold", reason: "进度滞后补偿：系统给你一次金色翻盘机会。" };
  if (progress > expected + 0.32 && state.day > 2) return { rarity: "red", reason: "进度超前惩罚：项目太顺，风险开始找上门。" };
  return null;
}

function getFixedCardTrigger(recentIds) {
  const progress = getTargetProgress();
  const expected = getExpectedProgress();
  const fixedRules = [
    {
      id: "platformCrackdown",
      when: () => state.risk >= 68,
      reason: "固定卡触发：风险值过高，平台整改压力必然出现。",
    },
    {
      id: "bossCharge",
      when: () => getServer()?.id === "whale" && state.day >= 3 && progress < expected,
      reason: "固定卡触发：土豪服进度落后，榜一回归带来付费变量。",
    },
    {
      id: "regulatorRumor",
      when: () => state.day === 4 && progress >= expected - 0.05,
      reason: "固定卡触发：中盘节点出现行业风向，考验你是否激进。",
    },
  ];
  const rule = fixedRules.find((item) => item.when() && !recentIds.has(item.id));
  if (!rule) return null;
  const event = eventCards.find((card) => card.id === rule.id);
  return event ? { event, reason: rule.reason } : null;
}

function pickEventCard() {
  const forced = getForcedRarity();
  const recentIds = new Set((state.eventHistory || []).slice(-3));
  let pool = eventCards.filter((event) => !recentIds.has(event.id));
  if (!pool.length) pool = eventCards;
  if (forced) {
    const forcedPool = pool.filter((event) => event.rarity === forced.rarity);
    const fallbackForcedPool = eventCards.filter((event) => event.rarity === forced.rarity);
    return { event: weightedPick(forcedPool.length ? forcedPool : fallbackForcedPool.length ? fallbackForcedPool : pool), reason: forced.reason };
  }
  const fixed = getFixedCardTrigger(recentIds);
  if (fixed) return fixed;
  const randomPool = pool.filter((event) => event.cardPool !== "fixed");
  const event = weightedPick(randomPool.length ? randomPool : pool);
  return { event, reason: "常规随机：从运营卡池中抽取，近 3 日出现过的卡不会重复。" };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function celebrateGoldCard() {
  if (elements.celebrationLayer) {
    elements.celebrationLayer.innerHTML = Array.from({ length: 22 }, (_, index) => `<i style="--x:${Math.random() * 100}%;--d:${Math.random() * 0.5 + index * 0.018}s"></i>`).join("");
    elements.celebrationLayer.classList.add("show");
    window.setTimeout(() => elements.celebrationLayer.classList.remove("show"), 1400);
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audio = new AudioContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "triangle";
      oscillator.connect(gain);
      gain.connect(audio.destination);
      const start = audio.currentTime + index * 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
    window.setTimeout(() => audio.close(), 900);
  } catch (error) {
  }
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
  if (!server || !state.storySeen || !state.guideSeen) return;
  state = {
    ...freshState(),
    storySeen: true,
    guideSeen: true,
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
  scrollToNextAction();
}

function drawEvent() {
  if (!state.serverId || state.currentEventId || state.over) return;
  const draw = pickEventCard();
  const event = draw.event;
  const offeredActivity = pickActivityOffer();
  state.currentEventId = event.id;
  state.selectedActivityId = null;
  state.offeredActivityId = offeredActivity.id;
  state.activityRerollsUsed = 0;
  state.lastReport = null;
  state.reportSeen = true;
  state.lastDrawReason = draw.reason;
  state.eventHistory = [...(state.eventHistory || []), event.id].slice(-6);
  saveState();
  render();
  if (event.rarity === "gold") celebrateGoldCard();
  scrollToNextAction();
}

function selectActivity(activityId) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity || !state.currentEventId || state.over) return;
  if (activity.id !== state.offeredActivityId) return;
  if (activity.unlockDay && state.day < activity.unlockDay) return;
  state.selectedActivityId = activityId;
  saveState();
  render();
  scrollToNextAction();
}

function rerollActivity() {
  if (!state.currentEventId || state.selectedActivityId || state.over) return;
  if ((state.activityRerollsUsed || 0) >= MAX_ACTIVITY_REROLLS) return;
  const offeredActivity = pickActivityOffer(state.offeredActivityId);
  state.offeredActivityId = offeredActivity.id;
  state.activityRerollsUsed = (state.activityRerollsUsed || 0) + 1;
  saveState();
  render();
  scrollToNextAction();
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
  if (activityMultiplier > 1.05) notes.push(`${activity.name}吃到运营卡红利，收益提高 ${Math.round((activityMultiplier - 1) * 100)}%。`);
  if (activityMultiplier < 0.95) notes.push(`${activity.name}被卡面风险压制，收益只剩 ${Math.round(activityMultiplier * 100)}%。`);
  if (activityCostDelta > 0) notes.push(`卡面风险导致额外支出 ${money(activityCostDelta)}。`);
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
  const event = typeof type === "object" ? type : null;
  if (event?.rarity) return event.rarity;
  if (type === "good") return "green";
  if (type === "bad") return "red";
  if (type === "chaos") return "purple";
  return "green";
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
  state.offeredActivityId = null;
  state.activityRerollsUsed = 0;
  if (result) {
    state.over = true;
  } else {
    state.day += 1;
  }
  saveState();
  render();
  scrollToNextAction();
  if (result) showResult(result);
}

function getSeasonResult() {
  const server = getServer();
  if (!server) return null;
  if (state.cash < -800000) return { title: "资金链断裂", text: "渠道款、活动成本和客服赔偿一起压上来，项目组被迫暂停运营。", tone: "bad" };
  if (state.reputation <= 5) return { title: "全服骂退", text: "玩家社区形成共识：这服不能碰，新增再多也接不住。", tone: "bad" };
  if (state.risk >= 100) return { title: "被迫整改", text: "广告、返利、舆情和投诉叠满，平台要求停投整改。", tone: "bad" };
  if (state.totalRevenue >= server.targetRevenue && state.cash > -300000 && state.reputation >= 25 && state.risk < 95) {
    const fast = state.day <= 3 ? "运气爆棚，3 天内就完成了老板的 7 天流水目标。" : "你把这组服务器撑到了 7 天目标线。";
    return { title: "提前达标", text: `${fast} 项目组已经开始讨论下一组服怎么复制。`, tone: "good" };
  }
  if (state.day < MAX_DAY) return null;
  return { title: "项目卒", text: "7 天冲刺结束，目标流水没完成。老板把复盘会命名为“为什么又差一点”。", tone: "bad" };
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
  scrollToNextAction();
  maybeOpenStory();
  maybeOpenGuide();
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

function getCurrentStep() {
  if (!accountConfirmed) return "account";
  if (!state.storySeen) return "story";
  if (!state.guideSeen) return "guide";
  if (!state.serverId) return "server";
  if (state.lastReport && !state.reportSeen) return "settle";
  if (!state.currentEventId) return "draw";
  if (!state.selectedActivityId) return "operate";
  return "settle";
}

function syncStepItem(item, key, currentStep, currentIndex) {
  const itemIndex = stepOrder.indexOf(key);
  if (itemIndex < 0) return;
  item.hidden = itemIndex > currentIndex;
  item.classList.toggle("done", itemIndex < currentIndex);
  item.classList.toggle("active", key === currentStep);
  if (key === currentStep) {
    item.setAttribute("aria-current", "step");
  } else {
    item.removeAttribute("aria-current");
  }
}

function renderSteps() {
  const currentStep = getCurrentStep();
  const currentIndex = stepOrder.indexOf(currentStep);
  stepOrder.forEach((key) => syncStepItem(elements.steps[key], key, currentStep, currentIndex));
  elements.ruleSteps.forEach((item) => syncStepItem(item, item.dataset.step, currentStep, currentIndex));
  document.body.dataset.currentStep = currentStep;
}

function getVisibleStage() {
  if (!accountConfirmed) return "account";
  if (!state.storySeen) return "story";
  if (!state.guideSeen) return "guide";
  if (!state.serverId) return "server";
  if (state.lastReport && !state.reportSeen) return "report";
  return "draw";
}

function renderStagePanels() {
  const visibleStage = getVisibleStage();
  document.body.dataset.visibleStage = visibleStage;
  elements.topBoard.hidden = !state.lastReport;
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
  const progress = server ? getTargetProgress() : 0;
  const progressPercent = Math.min(100, Math.round(progress * 100));
  elements.accountInput.value = activeAccount;
  elements.topAccountInput.value = activeAccount;
  elements.targetMetric.textContent = server ? `7 天目标 ${money(server.targetRevenue)} 流水` : "先选择服务器";
  elements.serverFlavor.textContent = server ? server.desc : "不同服务器决定玩家结构、付费强度和风险底色。";
  elements.dayMetric.textContent = server ? `D${Math.min(state.day, MAX_DAY)}/${MAX_DAY}` : "未开服";
  elements.serverMetric.textContent = server ? `${server.name} · ${server.tag}` : "未开服";
  elements.cashMetric.textContent = server ? money(state.cash) : "-";
  elements.netMetric.textContent = server ? money(state.yesterdayNet) : "-";
  elements.revenueMetric.textContent = server ? `流水 ${money(state.todayRevenue)} · 支出 ${money(state.todayExpense)}` : "流水 / 支出 -";
  elements.totalRevenueMetric.textContent = server ? `累计流水 ${money(state.totalRevenue)}` : "累计流水 -";
  elements.targetProgressMetric.textContent = server ? `目标进度 ${progressPercent}%` : "目标进度 -";
  elements.playerMetric.textContent = server ? `${Math.round(state.active).toLocaleString("zh-CN")} / ${Math.round(state.reputation)}` : "-";
  elements.riskMetric.textContent = server ? `风险 ${Math.round(state.risk)} · 热度 ${Math.round(state.heat)}` : "风险 -";
  if (!server) {
    elements.topReportTitle.textContent = accountConfirmed ? "还没开服，先选一个服务器" : "先确认当前账号，再开始本季运营";
  } else if (state.currentEventId && state.selectedActivityId) {
    elements.topReportTitle.textContent = `已选择「${getActivity()?.name}」，点击结算当日流水`;
  } else if (state.currentEventId) {
    elements.topReportTitle.textContent = `抽到「${getEvent()?.title}」，现在选择运营活动`;
  } else if (state.lastReport) {
    elements.topReportTitle.textContent = `${state.lastReport.net >= 0 ? "昨日净赚" : "昨日净亏"} ${money(Math.abs(state.lastReport.net))} · ${state.lastReport.eventTitle}`;
  } else {
    elements.topReportTitle.textContent = `${server.name} D${state.day}：先抽运营卡`;
  }
  elements.goalTitle.textContent = server ? `${server.name} 7 天目标：${money(server.targetRevenue)}` : "确认账号并选服后生成目标";
  elements.goalPercent.textContent = `${progressPercent}%`;
  elements.goalProgressBar.style.width = `${progressPercent}%`;
  elements.goalProgressText.textContent = server ? `累计流水 ${money(state.totalRevenue)} / 目标 ${money(server.targetRevenue)}` : "累计流水 - / 目标 -";
  elements.goalPaceText.textContent = server
    ? progress >= 1
      ? "目标已达成，项目起飞"
      : state.day >= MAX_DAY
        ? "最后一天未达标将项目卒"
        : `剩余 ${Math.max(0, MAX_DAY - state.day + 1)} 天，落后时可能触发金卡补偿`
    : "7 天内达标，否则项目卒";
  elements.topBoard.classList.toggle("settled", Boolean(state.lastReport));
}

function renderLeaderboard() {
  const accounts = loadAccounts();
  const rows = Object.entries(accounts)
    .map(([name, accountState]) => {
      const server = accountState.serverId ? getServer(accountState.serverId) : null;
      return {
        name,
        totalRevenue: accountState.totalRevenue || 0,
        cash: accountState.cash || 0,
        day: accountState.serverId ? Math.min(accountState.day || 1, MAX_DAY) : 0,
        serverName: server?.name || "未开服",
      };
    })
    .sort((left, right) => right.totalRevenue - left.totalRevenue || right.cash - left.cash || left.name.localeCompare(right.name, "zh-CN"));
  elements.leaderboardCount.textContent = `${rows.length} 个账号`;
  elements.leaderboardList.innerHTML = rows.length
    ? rows
        .slice(0, 5)
        .map(
          (row, index) => `
            <li class="${row.name === activeAccount ? "current" : ""}">
              <span class="rank">${index + 1}</span>
              <strong>${row.name}</strong>
              <small>${row.serverName} · D${row.day || "-"} · 现金 ${money(row.cash)}</small>
              <b>${money(row.totalRevenue)}</b>
            </li>`
        )
        .join("")
    : `<li class="empty-rank"><strong>暂无账号流水</strong><small>确认账号并开始运营后会进入排行榜。</small></li>`;
}

function getMentorState() {
  const server = getServer();
  if (!accountConfirmed) {
    return {
      title: "任务 1：确认账号",
      text: "先输入账号名并确认。确认后会进入本局背景故事，再完成引导和创角选服。",
      action: "确认账号",
      stage: "account",
    };
  }
  if (!state.storySeen) {
    return {
      title: "任务 2：听完背景故事",
      text: "这一局开始前，先看清你接手的是怎样一个传奇项目。故事结束后才会进入新手引导。",
      action: "进入故事",
      stage: "story",
    };
  }
  if (!state.guideSeen) {
    return {
      title: "任务 3：完成开局引导",
      text: "每局开始前必须看完引导。完成后才会开放创角选服。",
      action: "开始引导",
      stage: "guide",
    };
  }
  if (!server) {
    return {
      title: "任务 4：选择首服类型",
      text: "选服决定 7 天目标和玩家结构。绿色服稳，土豪服爆发强，滚服冲榜快。",
      action: "去选服",
      stage: "server",
    };
  }
  if (state.lastReport && !state.reportSeen) {
    return {
      title: "任务 7：查看当日结算",
      text: "先看流水、支出和反馈，再进入下一天。别忘了看目标进度条是否落后。",
      action: "查看结算",
      stage: "report",
    };
  }
  if (!state.currentEventId) {
    return {
      title: `任务 5：D${state.day} 抽运营卡`,
      text: "抽卡前会先判定必出条件：落后补金卡，领先可能吃红卡，最近 3 天不重复。",
      action: "去抽卡",
      stage: "draw",
    };
  }
  if (!state.selectedActivityId) {
    return {
      title: "任务 6：按卡面做运营",
      text: "系统每天随机给 1 个运营活动。你可以直接选，也可以点“换一个”，每天最多换 3 次。",
      action: "选活动",
      stage: "draw",
    };
  }
  return {
    title: "任务 7：结算当日流水",
    text: "活动已选好，现在结算当日流水。净收益会推进 7 天赚钱进度条。",
    action: "去结算",
    stage: "draw",
  };
}

function renderMentor() {
  const mentor = getMentorState();
  elements.mentorTitle.textContent = mentor.title;
  elements.mentorText.textContent = mentor.text;
  elements.mentorActionButton.textContent = mentor.action;
  elements.mentorActionButton.dataset.stage = mentor.stage;
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
    elements.eventCard.innerHTML = `<span>未抽卡</span><strong>点击“立刻抽取运营卡”</strong><p>先判定是否触发必出条件，再从运营卡池随机。抽完卡后才会开放今日运营活动。</p>`;
    return;
  }
  const rarity = rarityConfig[event.rarity] || rarityConfig.green;
  elements.eventCard.className = `event-card ${getEventClass(event)}`;
  elements.eventCard.innerHTML = `
    <span>${rarity.label} · ${event.cardPool === "fixed" ? "固定卡" : "随机卡"}</span>
    <strong>${event.title}</strong>
    <em>${event.culture} · ${rarity.tone}</em>
    <p>${event.text}</p>
    <small>${state.lastDrawReason || "运营卡已生效，请根据卡面选择活动。"}</small>`;
}

function renderActivities() {
  const canOperate = Boolean(state.currentEventId) && !state.over;
  const activityPanel = document.querySelector(".activity-panel");
  activityPanel.hidden = !canOperate;
  const rerollsUsed = state.activityRerollsUsed || 0;
  const rerollsLeft = Math.max(0, MAX_ACTIVITY_REROLLS - rerollsUsed);
  const offeredActivity = getActivity(state.offeredActivityId) || (canOperate ? pickActivityOffer() : null);
  if (canOperate && offeredActivity && !state.offeredActivityId) {
    state.offeredActivityId = offeredActivity.id;
    saveState();
  }
  elements.activityCards.classList.toggle("single-activity", Boolean(canOperate));
  elements.activityRerollMetric.textContent = state.selectedActivityId ? "已锁定活动" : `今日还能换 ${rerollsLeft} 次`;
  elements.rerollActivityButton.disabled = !canOperate || Boolean(state.selectedActivityId) || rerollsLeft <= 0;
  elements.activityCards.innerHTML = offeredActivity
    ? `
        <button class="activity-card ${state.selectedActivityId === offeredActivity.id ? "selected" : ""}" data-activity="${offeredActivity.id}" ${!canOperate ? "disabled" : ""}>
          <div class="activity-top"><strong>${offeredActivity.name}</strong><span>${offeredActivity.tag}</span></div>
          <p>${offeredActivity.desc}</p>
          <div class="activity-meta">
            <span>成本 ${money(offeredActivity.cost)}</span>
            <span>基础流水 ${money(offeredActivity.revenue)}</span>
            <span>活跃 ${offeredActivity.active >= 0 ? "+" : ""}${offeredActivity.active}</span>
          </div>
        </button>`
    : `<div class="empty-state">抽取运营卡后，系统会随机发 1 个今日运营活动。</div>`;
  elements.settleButton.disabled = !state.currentEventId || !state.selectedActivityId || state.over;
  activityPanel.classList.toggle("locked-panel", !state.currentEventId);
}

function renderReport() {
  const report = state.lastReport;
  if (!report) {
    elements.dailyReport.innerHTML = `<div class="empty-state">抽取运营卡并选择运营活动后，会在这里生成当日流水、支出、净收益和反馈。</div>`;
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
      <div><span>卡面成本</span><strong>${money(report.eventCost)}</strong></div>
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
  renderLeaderboard();
  renderMentor();
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
elements.rerollActivityButton.addEventListener("click", rerollActivity);
elements.settleButton.addEventListener("click", settleDay);
elements.continueButton.addEventListener("click", () => {
  state.reportSeen = true;
  saveState();
  render();
  scrollToNextAction();
});
elements.switchAccountButton.addEventListener("click", () => switchAccount(elements.accountInput.value));
elements.confirmAccountButton.addEventListener("click", () => switchAccount(elements.accountInput.value));
elements.accountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") switchAccount(elements.accountInput.value);
});
elements.topSwitchAccountButton.addEventListener("click", () => switchAccount(elements.topAccountInput.value));
elements.topAccountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") switchAccount(elements.topAccountInput.value);
});
elements.chooseServerButton.addEventListener("click", chooseServerAgain);
elements.topChooseServerButton.addEventListener("click", chooseServerAgain);
elements.resetButton.addEventListener("click", confirmResetGame);
elements.topResetButton.addEventListener("click", confirmResetGame);
elements.dialogResetButton.addEventListener("click", resetGame);
elements.startStoryButton.addEventListener("click", () => openStory(0, { mandatory: true }));
elements.storyDialog.addEventListener("cancel", (event) => {
  if (storyMandatory && !state.storySeen) event.preventDefault();
});
elements.storyPrevButton.addEventListener("click", () => {
  storyIndex = Math.max(0, storyIndex - 1);
  renderStory();
});
elements.storyNextButton.addEventListener("click", () => {
  if (storyIndex >= storySteps.length - 1) {
    completeStory();
    return;
  }
  storyIndex += 1;
  renderStory();
});
elements.startGuideButton.addEventListener("click", () => openGuide(0, { mandatory: true }));
elements.guideButton.addEventListener("click", () => {
  if (accountConfirmed && !state.storySeen) {
    openStory(0, { mandatory: true });
    return;
  }
  openGuide(0);
});
elements.guideDialog.addEventListener("cancel", (event) => {
  if (guideMandatory && !state.guideSeen) event.preventDefault();
});
elements.guidePrevButton.addEventListener("click", () => {
  guideIndex = Math.max(0, guideIndex - 1);
  renderGuide();
});
elements.guideNextButton.addEventListener("click", () => {
  if (guideIndex >= guideSteps.length - 1) {
    if (guideMandatory) {
      completeGuide();
    } else {
      closeGuide();
      scrollToNextAction();
    }
    return;
  }
  guideIndex += 1;
  renderGuide();
});
elements.guideSkipButton.addEventListener("click", closeGuide);
elements.mentorActionButton.addEventListener("click", () => {
  const mentor = getMentorState();
  if (!accountConfirmed) {
    elements.accountInput.focus();
  } else if (!state.storySeen) {
    openStory(0, { mandatory: true });
    return;
  } else if (!state.guideSeen) {
    openGuide(0, { mandatory: true });
    return;
  }
  scrollToStage(mentor.stage);
});

render();
scrollToNextAction();
maybeOpenStory();
maybeOpenGuide();
