const MAX_DAY = 12;
const TARGET_REVENUE = 1200000;
const TURN_AP = 5;
const SAVE_PREFIX = "legendOpsSim.save.";
const ACTIVE_ACCOUNT_KEY = "legendOpsSim.activeAccount";
const DEFAULT_ACCOUNT = "默认指挥官";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const money = (value) => {
  const abs = Math.abs(Math.round(value));
  const sign = value < 0 ? "-" : "";
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`;
  return `${sign}${abs.toLocaleString("zh-CN")}`;
};
const percent = (value) => `${Math.round(value)}%`;

function parseMetricValue(raw) {
  const text = String(raw ?? "").trim().replace(/,/g, "").replace(/，/g, "");
  if (!text) return Number.NaN;
  const multiplier = text.endsWith("万") ? 10000 : 1;
  const normalized = text.replace(/万/g, "").replace(/%/g, "");
  return Number(normalized) * multiplier;
}

function normalizeAccountName(name) {
  const normalized = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  return normalized || DEFAULT_ACCOUNT;
}

const baseState = () => {
  const initial = {
    day: 1,
    cash: 320000,
    totalRevenue: 0,
    lastRevenue: 0,
    players: 5200,
    online: 820,
    reputation: 58,
    hype: 64,
    economy: 56,
    cheat: 24,
    whaleMood: 52,
    guildBalance: 50,
    serverHealth: 74,
    risk: 18,
    history: [],
    log: [
      {
        day: 1,
        title: "首服开门",
        text: "沙域一区开启，散人和行会都在观望。前几个回合买量效率最高，但经济系统也最脆弱。",
      },
    ],
    selected: new Set(),
    ended: false,
  };
  initial.mission = createMissionForState(initial);
  return initial;
};

const actions = [
  {
    id: "ads",
    tag: "拉新",
    name: "信息流买量",
    cost: 65000,
    ap: 2,
    desc: "短期灌入新玩家，服务器热闹起来，但素材太土会伤口碑。",
    meta: ["+新增", "+热度", "-现金"],
    apply: (mods, state) => {
      mods.acquisition += 1250 + state.hype * 8;
      mods.hype += 7;
      mods.reputation -= state.day > 5 ? 2 : 1;
    },
  },
  {
    id: "streamer",
    tag: "拉新",
    name: "主播攻沙夜",
    cost: 90000,
    ap: 3,
    desc: "请主播带队攻城，能制造话题，也会激化行会资源争夺。",
    meta: ["+在线", "+流水", "行会波动"],
    apply: (mods) => {
      mods.acquisition += 900;
      mods.online += 0.05;
      mods.revenue += 0.1;
      mods.hype += 11;
      mods.guildBalance -= 7;
    },
  },
  {
    id: "rebate",
    tag: "商业化",
    name: "限时充值返利",
    cost: 18000,
    ap: 1,
    desc: "本回合流水会很漂亮，但玩家会开始等下一次更狠的返利。",
    meta: ["+流水", "-信任", "+风险"],
    apply: (mods) => {
      mods.revenue += 0.28;
      mods.payRate += 0.014;
      mods.reputation -= 4;
      mods.risk += 4;
      mods.whaleMood += 3;
    },
  },
  {
    id: "skin",
    tag: "商业化",
    name: "外观坐骑上架",
    cost: 26000,
    ap: 1,
    desc: "不破坏战力的付费点。流水不如返利猛，但更稳。",
    meta: ["+流水", "+口碑", "稳健"],
    apply: (mods) => {
      mods.revenue += 0.12;
      mods.payRate += 0.006;
      mods.reputation += 2;
      mods.economy += 1;
    },
  },
  {
    id: "dropUp",
    tag: "数值",
    name: "调高祖玛爆率",
    cost: 12000,
    ap: 1,
    desc: "散人爽感上升，装备会加速贬值，大 R 会担心投入缩水。",
    meta: ["+留存", "-经济", "大R不满"],
    apply: (mods) => {
      mods.retention += 0.026;
      mods.reputation += 4;
      mods.economy -= 9;
      mods.whaleMood -= 5;
    },
  },
  {
    id: "dropDown",
    tag: "数值",
    name: "收紧高级爆率",
    cost: 9000,
    ap: 1,
    desc: "装备稀缺性提升，短期刺激付费，但散人可能骂暗改。",
    meta: ["+付费", "+经济", "-口碑"],
    apply: (mods) => {
      mods.revenue += 0.11;
      mods.economy += 8;
      mods.reputation -= 5;
      mods.retention -= 0.014;
      mods.whaleMood += 4;
    },
  },
  {
    id: "banwave",
    tag: "治理",
    name: "封挂专项",
    cost: 42000,
    ap: 2,
    desc: "清理工作室和外挂号，在线会掉一截，但生态能恢复。",
    meta: ["-外挂", "+口碑", "-在线"],
    apply: (mods) => {
      mods.cheat -= 20;
      mods.reputation += 6;
      mods.acquisition -= 180;
      mods.players -= 260;
      mods.economy += 5;
    },
  },
  {
    id: "support",
    tag: "服务",
    name: "客服补偿包",
    cost: 36000,
    ap: 2,
    desc: "处理卡顿、充值、掉线投诉。不能赚钱，但能把骂声压下去。",
    meta: ["+口碑", "+健康", "-现金"],
    apply: (mods) => {
      mods.reputation += 9;
      mods.serverHealth += 10;
      mods.retention += 0.011;
      mods.risk -= 2;
    },
  },
  {
    id: "siege",
    tag: "活动",
    name: "沙城争霸赛",
    cost: 56000,
    ap: 2,
    desc: "行会玩家会热血上线，若平衡太差，弱势阵营会直接退服。",
    meta: ["+在线", "+热度", "看行会"],
    apply: (mods, state) => {
      mods.online += 0.08;
      mods.hype += 9;
      mods.revenue += state.guildBalance > 42 ? 0.09 : -0.02;
      mods.reputation += state.guildBalance > 42 ? 3 : -5;
      mods.guildBalance += state.guildBalance > 42 ? 2 : -8;
    },
  },
  {
    id: "merge",
    tag: "后期",
    name: "筹备合服",
    cost: 76000,
    ap: 3,
    desc: "适合中后期救活鬼服。合服会带来冲突，也会让市场重新流动。",
    meta: ["+玩家", "+经济", "冲突"],
    unlockDay: 6,
    apply: (mods) => {
      mods.acquisition += 1500;
      mods.hype += 8;
      mods.economy += 7;
      mods.guildBalance -= 9;
      mods.reputation -= 2;
    },
  },
];

const randomEvents = [
  {
    title: "外挂脚本扩散",
    text: "半夜出现自动打金脚本，材料价格被砸穿。",
    weight: (s) => 0.7 + s.cheat / 28,
    apply: (s) => {
      s.cheat = clamp(s.cheat + 12, 0, 100);
      s.economy = clamp(s.economy - 8, 0, 100);
      s.reputation = clamp(s.reputation - 5, 0, 100);
    },
  },
  {
    title: "大 R 放话退服",
    text: "榜一认为装备保值不足，在行会群里公开要求运营给说法。",
    weight: (s) => (s.whaleMood < 42 ? 2.3 : 0.35),
    apply: (s) => {
      s.whaleMood = clamp(s.whaleMood - 13, 0, 100);
      s.lastRevenue *= 0.86;
      s.reputation = clamp(s.reputation - 4, 0, 100);
    },
  },
  {
    title: "散人逆袭出圈",
    text: "一名散人爆出极品武器，短视频评论区开始刷屏求服。",
    weight: (s) => (s.reputation > 55 && s.economy > 35 ? 1.5 : 0.4),
    apply: (s) => {
      s.hype = clamp(s.hype + 10, 0, 100);
      s.players += 460;
      s.reputation = clamp(s.reputation + 3, 0, 100);
    },
  },
  {
    title: "充值通道波动",
    text: "晚高峰支付回调延迟，客服群被未到账截图刷屏。",
    weight: (s) => (s.serverHealth < 48 ? 1.8 : 0.5),
    apply: (s) => {
      s.lastRevenue *= 0.78;
      s.serverHealth = clamp(s.serverHealth - 9, 0, 100);
      s.reputation = clamp(s.reputation - 7, 0, 100);
      s.risk = clamp(s.risk + 5, 0, 100);
    },
  },
  {
    title: "竞品开新区",
    text: "同档竞品突然开新区并打出高返利广告，部分玩家被挖走。",
    weight: (s) => (s.day > 3 ? 1.1 : 0.25),
    apply: (s) => {
      const loss = Math.round(s.players * 0.055);
      s.players = Math.max(0, s.players - loss);
      s.hype = clamp(s.hype - 7, 0, 100);
    },
  },
  {
    title: "攻沙名场面",
    text: "两大行会打到凌晨，世界频道和直播间一起沸腾。",
    weight: (s) => (s.guildBalance > 45 && s.hype > 45 ? 1.4 : 0.25),
    apply: (s) => {
      s.online = Math.round(s.online * 1.16);
      s.hype = clamp(s.hype + 12, 0, 100);
      s.lastRevenue *= 1.08;
    },
  },
  {
    title: "监管提示",
    text: "广告投放素材被平台提示整改，继续硬冲可能引发停投。",
    weight: (s) => (s.risk > 58 ? 1.5 : 0.2),
    apply: (s) => {
      s.risk = clamp(s.risk + 11, 0, 100);
      s.reputation = clamp(s.reputation - 2, 0, 100);
    },
  },
];

const planNames = {
  steady: "稳健续命",
  growth: "猛砸买量",
  profit: "压榨流水",
  survival: "救火优先",
  selected: "沿用当前选中动作",
  none: "不主动操作",
};

function getSelectedAP(target = state) {
  return actions
    .filter((action) => target.selected.has(action.id))
    .reduce((sum, action) => sum + action.ap, 0);
}

function createMissionForState(target) {
  if (target.cheat >= 55) {
    return {
      id: "antiCheat",
      title: "清剿脚本号",
      text: `回合结束时外挂压力不高于 ${Math.round(target.cheat + 2)}。`,
      rewardText: "奖励：经济 +5，口碑 +2",
      maxCheat: Math.round(target.cheat + 2),
    };
  }
  if (target.reputation < 42) {
    return {
      id: "saveReputation",
      title: "止损公关战",
      text: `回合结束时口碑至少达到 ${Math.round(target.reputation + 3)}。`,
      rewardText: "奖励：现金 +2万，热度 +4",
      minReputation: Math.round(target.reputation + 3),
    };
  }

  const missionIndex = (target.day - 1) % 5;
  if (missionIndex === 0) {
    return {
      id: "revenueSprint",
      title: "冲击流水榜",
      text: `本回合流水达到 ${money(Math.max(90000, target.lastRevenue * 1.12, TARGET_REVENUE / MAX_DAY * 0.7))}。`,
      rewardText: "奖励：现金 +2.5万，热度 +4",
      targetRevenue: Math.round(Math.max(90000, target.lastRevenue * 1.12, TARGET_REVENUE / MAX_DAY * 0.7)),
    };
  }
  if (missionIndex === 1) {
    return {
      id: "keepPlayers",
      title: "稳住散人盘",
      text: `活跃玩家不低于 ${Math.round(target.players * 0.96).toLocaleString("zh-CN")}，且口碑不跌破 ${Math.round(target.reputation - 1)}。`,
      rewardText: "奖励：口碑 +4，经济 +3",
      minPlayers: Math.round(target.players * 0.96),
      minReputation: Math.round(target.reputation - 1),
    };
  }
  if (missionIndex === 2) {
    return {
      id: "onlinePeak",
      title: "制造在线峰值",
      text: `峰值在线达到 ${Math.round(target.online * 1.08).toLocaleString("zh-CN")}。`,
      rewardText: "奖励：行会平衡 +5，大R心态 +3",
      targetOnline: Math.round(target.online * 1.08),
    };
  }
  if (missionIndex === 3) {
    return {
      id: "cashControl",
      title: "预算纪律",
      text: `回合结束时现金不低于 ${money(target.cash - 35000)}，监管风险不高于 ${Math.round(target.risk + 4)}。`,
      rewardText: "奖励：现金 +2万，监管风险 -3",
      minCash: Math.round(target.cash - 35000),
      maxRisk: Math.round(target.risk + 4),
    };
  }
  return {
    id: "economyCare",
    title: "守住交易市场",
    text: `经济健康不低于 ${Math.round(target.economy - 1)}，外挂压力不高于 ${Math.round(target.cheat + 4)}。`,
    rewardText: "奖励：经济 +6，口碑 +1",
    minEconomy: Math.round(target.economy - 1),
    maxCheat: Math.round(target.cheat + 4),
  };
}

function isMissionComplete(mission, before, after) {
  if (!mission) return false;
  if (mission.id === "antiCheat") return after.cheat <= mission.maxCheat;
  if (mission.id === "saveReputation") return after.reputation >= mission.minReputation;
  if (mission.id === "revenueSprint") return after.lastRevenue >= mission.targetRevenue;
  if (mission.id === "keepPlayers") return after.players >= mission.minPlayers && after.reputation >= mission.minReputation;
  if (mission.id === "onlinePeak") return after.online >= mission.targetOnline;
  if (mission.id === "cashControl") return after.cash >= mission.minCash && after.risk <= mission.maxRisk;
  if (mission.id === "economyCare") return after.economy >= mission.minEconomy && after.cheat <= mission.maxCheat;
  return false;
}

function applyMissionReward(mission, target) {
  if (!mission) return "";
  if (mission.id === "antiCheat") {
    target.economy = clamp(target.economy + 5, 0, 100);
    target.reputation = clamp(target.reputation + 2, 0, 100);
    return "经济 +5，口碑 +2";
  }
  if (mission.id === "saveReputation") {
    target.cash += 20000;
    target.hype = clamp(target.hype + 4, 0, 100);
    return "现金 +2万，热度 +4";
  }
  if (mission.id === "revenueSprint") {
    target.cash += 25000;
    target.hype = clamp(target.hype + 4, 0, 100);
    return "现金 +2.5万，热度 +4";
  }
  if (mission.id === "keepPlayers") {
    target.reputation = clamp(target.reputation + 4, 0, 100);
    target.economy = clamp(target.economy + 3, 0, 100);
    return "口碑 +4，经济 +3";
  }
  if (mission.id === "onlinePeak") {
    target.guildBalance = clamp(target.guildBalance + 5, 0, 100);
    target.whaleMood = clamp(target.whaleMood + 3, 0, 100);
    return "行会平衡 +5，大R心态 +3";
  }
  if (mission.id === "cashControl") {
    target.cash += 20000;
    target.risk = clamp(target.risk - 3, 0, 100);
    return "现金 +2万，监管风险 -3";
  }
  target.economy = clamp(target.economy + 6, 0, 100);
  target.reputation = clamp(target.reputation + 1, 0, 100);
  return "经济 +6，口碑 +1";
}

function resolveMission(mission, before, target) {
  const completed = isMissionComplete(mission, before, target);
  const reward = completed ? applyMissionReward(mission, target) : "未获得奖励";
  return { completed, reward };
}

function getSaveKey(accountName = activeAccount) {
  return `${SAVE_PREFIX}${encodeURIComponent(normalizeAccountName(accountName))}`;
}

function serializeState(target) {
  return {
    ...target,
    selected: Array.from(target.selected || []),
  };
}

function hydrateState(rawState) {
  const hydrated = {
    ...baseState(),
    ...rawState,
    selected: new Set(Array.isArray(rawState?.selected) ? rawState.selected : []),
    history: Array.isArray(rawState?.history) ? rawState.history : [],
    log: Array.isArray(rawState?.log) ? rawState.log : [],
    ended: Boolean(rawState?.ended),
  };
  hydrated.mission = rawState?.mission || createMissionForState(hydrated);
  return hydrated;
}

function loadAccountState(accountName) {
  const saved = localStorage.getItem(getSaveKey(accountName));
  if (!saved) return baseState();
  try {
    return hydrateState(JSON.parse(saved));
  } catch (error) {
    return baseState();
  }
}

function saveCurrentAccount() {
  if (!state) return;
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccount);
  localStorage.setItem(getSaveKey(), JSON.stringify(serializeState(state)));
}

function updateAccountUI() {
  elements.activeAccountLabel.textContent = activeAccount;
  elements.accountNameInput.value = activeAccount;
  elements.accountHint.textContent = `当前账号：${activeAccount}。本账号进度会自动保存在这台设备的浏览器里。`;
}

function switchAccount() {
  const nextAccount = normalizeAccountName(elements.accountNameInput.value);
  saveCurrentAccount();
  activeAccount = nextAccount;
  state = loadAccountState(activeAccount);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccount);
  updateAccountUI();
  render();
}

function deleteCurrentAccount() {
  const confirmed = window.confirm(`确定删除账号“${activeAccount}”的本地存档吗？此操作不可恢复。`);
  if (!confirmed) return;
  localStorage.removeItem(getSaveKey());
  if (activeAccount !== DEFAULT_ACCOUNT) {
    activeAccount = DEFAULT_ACCOUNT;
    state = loadAccountState(activeAccount);
  } else {
    state = baseState();
  }
  saveCurrentAccount();
  updateAccountUI();
  render();
}

let activeAccount = normalizeAccountName(localStorage.getItem(ACTIVE_ACCOUNT_KEY));
let state = loadAccountState(activeAccount);

const elements = {
  dayLabel: document.querySelector("#dayLabel"),
  cashMetric: document.querySelector("#cashMetric"),
  cashHint: document.querySelector("#cashHint"),
  revenueMetric: document.querySelector("#revenueMetric"),
  totalRevenueMetric: document.querySelector("#totalRevenueMetric"),
  playersMetric: document.querySelector("#playersMetric"),
  onlineMetric: document.querySelector("#onlineMetric"),
  reputationMetric: document.querySelector("#reputationMetric"),
  cheatMetric: document.querySelector("#cheatMetric"),
  activeAccountLabel: document.querySelector("#activeAccountLabel"),
  accountHint: document.querySelector("#accountHint"),
  accountNameInput: document.querySelector("#accountNameInput"),
  switchAccountButton: document.querySelector("#switchAccountButton"),
  resetAccountButton: document.querySelector("#resetAccountButton"),
  deleteAccountButton: document.querySelector("#deleteAccountButton"),
  actions: document.querySelector("#actions"),
  selectedCount: document.querySelector("#selectedCount"),
  commandSummary: document.querySelector("#commandSummary"),
  commandSlots: document.querySelector("#commandSlots"),
  turnPreview: document.querySelector("#turnPreview"),
  gauges: document.querySelector("#gauges"),
  phaseLabel: document.querySelector("#phaseLabel"),
  phaseText: document.querySelector("#phaseText"),
  missionTitle: document.querySelector("#missionTitle"),
  missionText: document.querySelector("#missionText"),
  missionReward: document.querySelector("#missionReward"),
  chart: document.querySelector("#chart"),
  log: document.querySelector("#log"),
  nextDayButton: document.querySelector("#nextDayButton"),
  autoButton: document.querySelector("#autoButton"),
  resetButton: document.querySelector("#resetButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultKicker: document.querySelector("#resultKicker"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultStats: document.querySelector("#resultStats"),
  dialogResetButton: document.querySelector("#dialogResetButton"),
  turnReportDialog: document.querySelector("#turnReportDialog"),
  turnReportKicker: document.querySelector("#turnReportKicker"),
  turnReportTitle: document.querySelector("#turnReportTitle"),
  turnReportStats: document.querySelector("#turnReportStats"),
  turnReportEvents: document.querySelector("#turnReportEvents"),
  turnReportButton: document.querySelector("#turnReportButton"),
  historyInput: document.querySelector("#historyInput"),
  historyCash: document.querySelector("#historyCash"),
  historyTotalRevenue: document.querySelector("#historyTotalRevenue"),
  forecastDays: document.querySelector("#forecastDays"),
  forecastPlan: document.querySelector("#forecastPlan"),
  forecastButton: document.querySelector("#forecastButton"),
  importHistoryButton: document.querySelector("#importHistoryButton"),
  historyFeedback: document.querySelector("#historyFeedback"),
  forecastSummary: document.querySelector("#forecastSummary"),
  forecastTable: document.querySelector("#forecastTable"),
};

function createMods() {
  return {
    acquisition: 0,
    retention: 0,
    payRate: 0,
    revenue: 0,
    online: 0,
    players: 0,
    reputation: 0,
    hype: 0,
    economy: 0,
    cheat: 0,
    whaleMood: 0,
    guildBalance: 0,
    serverHealth: 0,
    risk: 0,
  };
}

function getPhase() {
  if (state.day <= 3) {
    return ["开服冲刺期", "玩家尝鲜热情高，买量有效，但活动过猛会快速透支信任。"];
  }
  if (state.day <= 8) {
    return ["生态拉扯期", "行会、大 R、散人开始互相影响。重点是控制外挂、经济和口碑。"];
  }
  return ["衰退续命期", "自然流失会加速，合服、活动和稳定服务决定服务器能否续命。"];
}

function renderActions() {
  const selectedAP = getSelectedAP();
  elements.actions.innerHTML = actions
    .map((action) => {
      const locked = action.unlockDay && state.day < action.unlockDay;
      const selected = state.selected.has(action.id);
      const disabled = locked || (!selected && selectedAP + action.ap > TURN_AP);
      const lockText = locked ? `第 ${action.unlockDay} 回合解锁` : `${action.ap} AP · 成本 ${money(action.cost)}`;
      return `
        <button class="action-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}" data-action="${action.id}" ${locked ? "disabled" : ""}>
          <div class="action-top">
            <h3>${action.name}</h3>
            <span class="tag">${action.tag}</span>
          </div>
          <p>${action.desc}</p>
          <div class="action-meta">
            <span class="pill">${lockText}</span>
            ${action.meta.map((item) => `<span class="pill">${item}</span>`).join("")}
          </div>
        </button>`;
    })
    .join("");
}

function renderCommandPanel() {
  const selected = actions.filter((action) => state.selected.has(action.id));
  const ap = getSelectedAP();
  const cost = selected.reduce((sum, action) => sum + action.cost, 0);
  elements.commandSummary.textContent = selected.length ? `${selected.length} 张指令 · ${ap}/${TURN_AP} AP` : "等待部署";
  elements.commandSlots.innerHTML = Array.from({ length: TURN_AP }, (_, index) => {
    let cursor = 0;
    const occupying = selected.find((action) => {
      const start = cursor;
      cursor += action.ap;
      return index >= start && index < cursor;
    });
    return `<div class="command-slot ${occupying ? "filled" : ""}">${occupying ? occupying.name.slice(0, 2) : index + 1}</div>`;
  }).join("");

  if (!selected.length) {
    elements.turnPreview.textContent = "选择行动牌后，会在这里显示本回合的成本和战略意图。";
    return;
  }

  const tags = Array.from(new Set(selected.map((action) => action.tag))).join(" / ");
  elements.turnPreview.textContent = `已部署 ${tags} 策略，预计消耗 ${money(cost)}，剩余 ${TURN_AP - ap} AP。`;
}

function renderMission() {
  const mission = state.mission || createMissionForState(state);
  state.mission = mission;
  elements.missionTitle.textContent = mission.title;
  elements.missionText.textContent = mission.text;
  elements.missionReward.textContent = mission.rewardText;
}

function renderGauges() {
  const gaugeData = [
    ["热度", state.hype],
    ["经济健康", state.economy],
    ["大R心态", state.whaleMood],
    ["行会平衡", state.guildBalance],
    ["服务器稳定", state.serverHealth],
    ["监管风险", state.risk, true],
  ];

  elements.gauges.innerHTML = gaugeData
    .map(([label, value, inverted]) => {
      const dangerValue = inverted ? value : 100 - value;
      const level = dangerValue > 62 ? "danger" : dangerValue > 42 ? "warning" : "";
      return `
        <div class="gauge ${level}">
          <div class="gauge-top"><span>${label}</span><strong>${percent(value)}</strong></div>
          <div class="bar"><span style="width:${clamp(value, 0, 100)}%"></span></div>
        </div>`;
    })
    .join("");
}

function renderChart() {
  const history = state.history.slice(-12);
  if (!history.length) {
    elements.chart.innerHTML = "";
    return;
  }

  const width = 720;
  const height = 290;
  const pad = 30;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const maxRevenue = Math.max(...history.map((d) => d.revenue), 1);
  const maxOnline = Math.max(...history.map((d) => d.online), 1);
  const toPoints = (getter, max) =>
    history
      .map((item, index) => {
        const x = pad + (history.length === 1 ? plotW : (index / (history.length - 1)) * plotW);
        const y = height - pad - (getter(item) / max) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  elements.chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img">
      <polyline points="${toPoints((d) => d.revenue, maxRevenue)}" fill="none" stroke="#ff4d5e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="${toPoints((d) => d.online, maxOnline)}" fill="none" stroke="#58f0ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <polyline points="${toPoints((d) => d.reputation, 100)}" fill="none" stroke="#48d778" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      ${history
        .map((item, index) => {
          const x = pad + (history.length === 1 ? plotW : (index / (history.length - 1)) * plotW);
          return `<text x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="#b9c2d3" font-size="16">${item.day}</text>`;
        })
        .join("")}
    </svg>`;
}

function renderLog() {
  elements.log.innerHTML = state.log
    .slice(0, 12)
    .map((item) => `<li><strong>R${item.day} · ${item.title}</strong>${item.text}</li>`)
    .join("");
}

function render() {
  elements.dayLabel.textContent = state.day;
  elements.cashMetric.textContent = money(state.cash);
  elements.cashHint.textContent = state.cash < 60000 ? "现金吃紧，谨慎烧钱" : "可用运营预算";
  elements.revenueMetric.textContent = money(state.lastRevenue);
  elements.totalRevenueMetric.textContent = `累计流水 ${money(state.totalRevenue)}`;
  elements.playersMetric.textContent = Math.round(state.players).toLocaleString("zh-CN");
  elements.onlineMetric.textContent = `峰值在线 ${Math.round(state.online).toLocaleString("zh-CN")}`;
  elements.reputationMetric.textContent = `${Math.round(state.reputation)} / ${Math.round(state.cheat)}`;
  elements.cheatMetric.textContent = state.cheat > 60 ? "外挂压力危险" : "外挂压力可控";
  elements.selectedCount.textContent = getSelectedAP();
  elements.selectedCount.parentElement.style.setProperty("--ap-used", `${(getSelectedAP() / TURN_AP) * 100}%`);

  const [phaseLabel, phaseText] = getPhase();
  elements.phaseLabel.textContent = phaseLabel;
  elements.phaseText.textContent = phaseText;

  renderActions();
  renderCommandPanel();
  renderMission();
  renderGauges();
  renderChart();
  renderLog();
}

function addLog(title, text) {
  state.log.unshift({ day: state.day, title, text });
}

function pickRandomEvent() {
  if (Math.random() > 0.38) return null;
  const weighted = randomEvents.map((event) => ({ event, weight: Math.max(0.05, event.weight(state)) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.event;
  }
  return weighted[0].event;
}

function applyModsToTarget(target, mods) {
  for (const key of ["reputation", "hype", "economy", "cheat", "whaleMood", "guildBalance", "serverHealth", "risk"]) {
    target[key] = clamp(target[key] + mods[key], 0, 100);
  }
  target.players = Math.max(0, target.players + mods.players);
}

function applyActionMods(mods) {
  applyModsToTarget(state, mods);
}

function setHistoryFeedback(message, status = "") {
  elements.historyFeedback.textContent = message;
  elements.historyFeedback.className = `feedback ${status}`.trim();
}

function parseHistoryRows(raw) {
  const lines = String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!lines.length) throw new Error("请至少输入一行历史数据。");

  return lines
    .map((line, index) => {
      const usesComma = /[,，|;；\t]/.test(line);
      const columns = (usesComma ? line.split(/[,，|;；\t]+/) : line.split(/\s+/)).map((item) => item.trim()).filter(Boolean);
      if (columns.length < 8) throw new Error(`第 ${index + 1} 行字段不足，需要 8 个数值。`);

      const values = columns.slice(0, 8).map(parseMetricValue);
      if (values.some((value) => !Number.isFinite(value))) throw new Error(`第 ${index + 1} 行包含无法识别的数值。`);

      const [day, players, online, revenue, reputation, cheat, economy, hype] = values;
      return {
        day: Math.max(1, Math.round(day)),
        players: Math.max(0, Math.round(players)),
        online: Math.max(0, Math.round(online)),
        revenue: Math.max(0, Math.round(revenue)),
        reputation: clamp(reputation, 0, 100),
        cheat: clamp(cheat, 0, 100),
        economy: clamp(economy, 0, 100),
        hype: clamp(hype, 0, 100),
      };
    })
    .sort((a, b) => a.day - b.day);
}

function buildSnapshotFromHistory() {
  const rows = parseHistoryRows(elements.historyInput.value);
  const last = rows[rows.length - 1];
  const previousRows = rows.slice(0, -1);
  const averageRevenue = previousRows.length
    ? previousRows.reduce((sum, row) => sum + row.revenue, 0) / previousRows.length
    : Math.max(last.revenue, 1);
  const revenueTrend = averageRevenue > 0 ? last.revenue / averageRevenue : 1;
  const activeRatio = last.players > 0 ? last.online / last.players : 0;
  const cash = parseMetricValue(elements.historyCash.value);
  const totalRevenueInput = parseMetricValue(elements.historyTotalRevenue.value);
  const totalRevenue = Number.isFinite(totalRevenueInput)
    ? totalRevenueInput
    : rows.reduce((sum, row) => sum + row.revenue, 0);

  if (!Number.isFinite(cash)) throw new Error("当前现金不能为空，例如 32万 或 320000。");

  const snapshot = {
    day: clamp(last.day + 1, 1, MAX_DAY),
    cash: Math.round(cash),
    totalRevenue: Math.max(0, Math.round(totalRevenue)),
    lastRevenue: last.revenue,
    players: last.players,
    online: last.online,
    reputation: last.reputation,
    hype: last.hype,
    economy: last.economy,
    cheat: last.cheat,
    whaleMood: clamp(48 + (revenueTrend - 1) * 20 + (last.economy - 50) * 0.45 + (last.reputation - 50) * 0.25, 0, 100),
    guildBalance: clamp(48 + (activeRatio - 0.14) * 180 + (last.reputation - 50) * 0.22, 0, 100),
    serverHealth: clamp(78 - last.online / 190 - last.cheat * 0.35 + (last.reputation - 50) * 0.28, 0, 100),
    risk: clamp(18 + totalRevenue / 90000 + Math.max(0, 40 - last.reputation) * 0.8 + Math.max(0, last.cheat - 60) * 0.45, 0, 100),
    history: rows.map((row) => ({
      day: row.day,
      revenue: row.revenue,
      online: row.online,
      reputation: row.reputation,
    })),
    log: [
      {
        day: last.day,
        title: "历史导入",
        text: `已导入 ${rows.length} 回合历史数据，下一步从 R${last.day + 1} 开始运营。`,
      },
    ],
    selected: new Set(),
    ended: false,
  };
  snapshot.mission = createMissionForState(snapshot);
  return snapshot;
}

function fitActionIds(target, ids) {
  const fitted = [];
  let spending = 0;
  let ap = 0;

  for (const id of ids) {
    const action = actions.find((item) => item.id === id);
    if (!action || fitted.includes(id) || ap + action.ap > TURN_AP) continue;
    if (action.unlockDay && target.day < action.unlockDay) continue;
    if (target.cash - spending - action.cost < -90000) continue;
    fitted.push(id);
    spending += action.cost;
    ap += action.ap;
  }

  return fitted;
}

function getForecastActionIds(target, plan) {
  if (plan === "none") return [];
  if (plan === "selected") return fitActionIds(target, Array.from(state.selected));

  const candidates = [];
  if (plan === "growth") {
    candidates.push("ads");
    if (target.cash > 220000) candidates.push("streamer");
    if (target.risk < 72 && target.reputation > 36) candidates.push("rebate");
    if (target.guildBalance > 40) candidates.push("siege");
  }

  if (plan === "profit") {
    if (target.risk < 78 && target.reputation > 30) candidates.push("rebate");
    candidates.push("skin");
    if (target.economy < 62) candidates.push("dropDown");
    if (target.guildBalance > 42) candidates.push("siege");
  }

  if (plan === "survival") {
    if (target.cheat > 30) candidates.push("banwave");
    candidates.push("support");
    if (target.players < 3000) candidates.push("merge");
    if (target.economy < 35) candidates.push("dropDown");
    if (target.reputation < 42 && target.economy > 42) candidates.push("dropUp");
    if (target.cash > 120000 && target.players < 3600) candidates.push("ads");
  }

  if (plan === "steady") {
    if (target.cheat > 45) candidates.push("banwave");
    if (target.reputation < 46 || target.serverHealth < 54) candidates.push("support");
    if (target.totalRevenue < TARGET_REVENUE * (target.day / MAX_DAY)) candidates.push("skin");
    if (target.players < 3800 && target.cash > 130000) candidates.push("ads");
    if (target.economy < 38) candidates.push("dropDown");
    if (target.guildBalance > 48 && target.hype > 45) candidates.push("siege");
  }

  return fitActionIds(target, candidates);
}

function simulateForecastDay(target, actionIds) {
  const forecastDay = target.day;
  const mods = createMods();
  const chosen = actions.filter((action) => actionIds.includes(action.id));
  const cost = chosen.reduce((sum, action) => sum + action.cost, 0);
  chosen.forEach((action) => action.apply(mods, target));
  target.cash -= cost;
  applyModsToTarget(target, mods);

  const naturalDecay = forecastDay <= 3 ? 0.965 : forecastDay <= 8 ? 0.948 : 0.925;
  const baseAcquisition = 180 + target.hype * 11 + (target.reputation - 45) * 8;
  const acquisition = Math.max(0, Math.round((baseAcquisition + mods.acquisition) * (target.serverHealth / 115)));
  const churnRate = clamp(
    0.075 - target.reputation / 1700 + target.cheat / 1300 + (50 - target.economy) / 1800 - mods.retention,
    0.018,
    0.22
  );
  const churned = Math.round(target.players * churnRate);

  target.players = Math.max(0, Math.round(target.players * naturalDecay + acquisition - churned));
  target.online = Math.max(
    0,
    Math.round(target.players * (0.12 + target.hype / 900 + target.guildBalance / 1300 + mods.online))
  );

  const payRate = clamp(0.028 + target.whaleMood / 5200 + target.economy / 7200 + mods.payRate, 0.012, 0.13);
  const arppu = 84 + target.whaleMood * 1.9 + target.economy * 0.8;
  const revenueMood = 0.78 + target.reputation / 190 + target.serverHealth / 450;
  target.lastRevenue = Math.max(0, Math.round(target.players * payRate * arppu * revenueMood * (1 + mods.revenue) * 1.18));

  const opsCost = 26000 + target.players * 2.1 + Math.max(0, target.cheat - 55) * 780;
  target.cash += target.lastRevenue - opsCost;
  target.totalRevenue += target.lastRevenue;

  target.hype = clamp(target.hype * 0.95 + acquisition / 260, 0, 100);
  target.serverHealth = clamp(target.serverHealth - target.online / 1600 - target.cheat / 950 + 0.8, 0, 100);
  target.cheat = clamp(target.cheat + target.players / 10000 + (target.economy < 35 ? 2.6 : 0.8), 0, 100);
  target.reputation = clamp(target.reputation + (target.serverHealth - 60) / 38 - target.cheat / 80, 0, 100);
  target.economy = clamp(target.economy - target.cheat / 120 + (target.whaleMood - 48) / 120, 0, 100);
  target.whaleMood = clamp(target.whaleMood + (target.economy - 52) / 40 - (target.reputation < 35 ? 1.5 : 0), 0, 100);
  target.guildBalance = clamp(target.guildBalance + (target.reputation - 50) / 52 - (target.hype > 70 ? 0.8 : 0), 0, 100);
  target.risk = clamp(target.risk + (target.totalRevenue > 800000 ? 0.75 : 0) + (target.reputation < 30 ? 1.4 : 0) - 0.2, 0, 100);

  const row = {
    day: forecastDay,
    revenue: target.lastRevenue,
    players: target.players,
    online: target.online,
    reputation: target.reputation,
    risk: target.risk,
    cash: target.cash,
    actions: chosen.map((action) => action.name),
  };

  target.history.push({
    day: forecastDay,
    revenue: target.lastRevenue,
    online: target.online,
    reputation: target.reputation,
  });
  target.day += 1;
  return row;
}

function getForecastVerdict(target, rows, initial) {
  const finalRow = rows[rows.length - 1];
  const playerLoss = initial.players - finalRow.players;
  if (target.cash < -120000) return ["现金流会断裂，需要降低买量或补资金。", true];
  if (target.risk >= 95) return ["监管风险逼近爆表，应停止高返利和激进投放。", true];
  if (target.reputation < 25) return ["口碑会进入危险区，继续压榨会导致加速流失。", true];
  if (playerLoss > initial.players * 0.28) return ["玩家下滑过快，需要增加留存、封挂或合服动作。", true];
  if (target.totalRevenue >= TARGET_REVENUE && target.reputation >= 35 && target.risk < 95) {
    return ["预测能达成赛季流水目标，但仍要盯住口碑和风险。", false];
  }
  return ["走势可控，建议继续比较不同策略的现金和玩家留存差异。", false];
}

function renderForecastOutput(rows, target, plan, initial) {
  if (!rows.length) {
    elements.forecastSummary.innerHTML = `<div class="empty-state">没有生成预测结果。</div>`;
    elements.forecastTable.innerHTML = "";
    return;
  }

  const finalRow = rows[rows.length - 1];
  const [verdict, warning] = getForecastVerdict(target, rows, initial);
  elements.forecastSummary.innerHTML = `
    <div class="forecast-card"><span>策略</span><strong>${planNames[plan]}</strong></div>
    <div class="forecast-card"><span>预计流水</span><strong>${money(target.totalRevenue)}</strong></div>
    <div class="forecast-card"><span>剩余现金</span><strong>${money(target.cash)}</strong></div>
    <div class="forecast-card"><span>活跃玩家</span><strong>${Math.round(finalRow.players).toLocaleString("zh-CN")}</strong></div>
    <div class="forecast-verdict ${warning ? "warning" : ""}">${verdict}</div>`;
  elements.forecastTable.innerHTML = rows
    .map(
      (row) => `
        <div class="forecast-row">
          <strong>R${row.day}</strong>
          <span>流水 ${money(row.revenue)}</span>
          <span>活跃 ${Math.round(row.players).toLocaleString("zh-CN")}</span>
          <span>在线 ${Math.round(row.online).toLocaleString("zh-CN")}</span>
          <span>口碑 ${Math.round(row.reputation)} / 风险 ${Math.round(row.risk)}</span>
          <span>${row.actions.length ? row.actions.join("、") : "无动作"}</span>
        </div>`
    )
    .join("");
}

function runForecast() {
  try {
    const snapshot = buildSnapshotFromHistory();
    const remainingTurns = Math.max(1, MAX_DAY - snapshot.day + 1);
    const days = clamp(parseInt(elements.forecastDays.value, 10) || 5, 1, remainingTurns);
    const plan = elements.forecastPlan.value;
    const target = {
      ...snapshot,
      history: snapshot.history.map((item) => ({ ...item })),
      log: [],
      selected: new Set(),
    };
    const rows = [];

    elements.forecastDays.value = days;
    for (let i = 0; i < days; i += 1) {
      const actionIds = getForecastActionIds(target, plan);
      rows.push(simulateForecastDay(target, actionIds));
      if (target.cash < -180000 || target.risk >= 100 || target.reputation <= 0 || target.players <= 0) break;
    }

    renderForecastOutput(rows, target, plan, snapshot);
    setHistoryFeedback(`已基于 ${snapshot.history.length} 回合历史数据估算 ${rows.length} 回合未来走势。`, "good");
  } catch (error) {
    setHistoryFeedback(error.message, "bad");
  }
}

function importHistory() {
  try {
    const snapshot = buildSnapshotFromHistory();
    state = {
      ...snapshot,
      history: snapshot.history.map((item) => ({ ...item })),
      log: snapshot.log.map((item) => ({ ...item })),
      selected: new Set(),
      ended: false,
    };
    saveCurrentAccount();
    render();
    setHistoryFeedback(`已导入历史数据，当前局从 R${state.day} 开始。`, "good");
  } catch (error) {
    setHistoryFeedback(error.message, "bad");
  }
}

function snapshotState(target) {
  return {
    cash: target.cash,
    totalRevenue: target.totalRevenue,
    lastRevenue: target.lastRevenue,
    players: target.players,
    online: target.online,
    reputation: target.reputation,
    cheat: target.cheat,
    economy: target.economy,
    hype: target.hype,
    risk: target.risk,
  };
}

function deltaText(after, before, formatter = (value) => Math.round(value).toLocaleString("zh-CN")) {
  const delta = after - before;
  const sign = delta >= 0 ? "+" : "";
  return `${formatter(after)} (${sign}${formatter(delta)})`;
}

function showTurnReport(report) {
  elements.turnReportKicker.textContent = `R${report.turn} 回合结算`;
  elements.turnReportTitle.textContent = report.mission.completed ? "挑战完成" : "回合结束";
  elements.turnReportStats.innerHTML = [
    ["本回合流水", money(report.after.lastRevenue)],
    ["现金变化", deltaText(report.after.cash, report.before.cash, money)],
    ["活跃玩家", deltaText(report.after.players, report.before.players)],
    ["口碑 / 外挂", `${Math.round(report.after.reputation)} / ${Math.round(report.after.cheat)}`],
  ]
    .map(([label, value]) => `<div class="dialog-stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  elements.turnReportEvents.innerHTML = `
    <div class="report-line"><strong>执行指令</strong><span>${report.actions.length ? report.actions.join("、") : "无主动操作"}</span></div>
    <div class="report-line"><strong>玩家流动</strong><span>新增 ${report.acquisition.toLocaleString("zh-CN")}，流失 ${report.churned.toLocaleString("zh-CN")}</span></div>
    <div class="report-line ${report.mission.completed ? "good" : "bad"}"><strong>${report.mission.title}</strong><span>${
      report.mission.completed ? `完成，${report.mission.reward}` : "未完成，未获得挑战奖励"
    }</span></div>
    ${report.event ? `<div class="report-line"><strong>${report.event.title}</strong><span>${report.event.text}</span></div>` : ""}`;
  if (typeof elements.turnReportDialog.showModal === "function") {
    elements.turnReportDialog.showModal();
  } else {
    elements.turnReportDialog.setAttribute("open", "");
  }
}

function simulateDay(manual = true) {
  if (state.ended) return;

  const turn = state.day;
  const before = snapshotState(state);
  const mission = state.mission || createMissionForState(state);
  const mods = createMods();
  const chosen = actions.filter((action) => state.selected.has(action.id));
  const cost = chosen.reduce((sum, action) => sum + action.cost, 0);
  chosen.forEach((action) => action.apply(mods, state));
  state.cash -= cost;
  applyActionMods(mods);

  const naturalDecay = state.day <= 3 ? 0.965 : state.day <= 8 ? 0.948 : 0.925;
  const baseAcquisition = 180 + state.hype * 11 + (state.reputation - 45) * 8;
  const acquisition = Math.max(0, Math.round((baseAcquisition + mods.acquisition) * (state.serverHealth / 115)));
  const churnRate = clamp(
    0.075 - state.reputation / 1700 + state.cheat / 1300 + (50 - state.economy) / 1800 - mods.retention,
    0.018,
    0.22
  );
  const churned = Math.round(state.players * churnRate);

  state.players = Math.max(0, Math.round(state.players * naturalDecay + acquisition - churned));
  state.online = Math.max(
    0,
    Math.round(state.players * (0.12 + state.hype / 900 + state.guildBalance / 1300 + mods.online))
  );

  const payRate = clamp(0.028 + state.whaleMood / 5200 + state.economy / 7200 + mods.payRate, 0.012, 0.13);
  const arppu = 84 + state.whaleMood * 1.9 + state.economy * 0.8;
  const revenueMood = 0.78 + state.reputation / 190 + state.serverHealth / 450;
  state.lastRevenue = Math.max(0, Math.round(state.players * payRate * arppu * revenueMood * (1 + mods.revenue) * 1.18));

  const opsCost = 26000 + state.players * 2.1 + Math.max(0, state.cheat - 55) * 780;
  state.cash += state.lastRevenue - opsCost;
  state.totalRevenue += state.lastRevenue;

  state.hype = clamp(state.hype * 0.95 + acquisition / 260, 0, 100);
  state.serverHealth = clamp(state.serverHealth - state.online / 1600 - state.cheat / 950 + 0.8, 0, 100);
  state.cheat = clamp(state.cheat + state.players / 10000 + (state.economy < 35 ? 2.6 : 0.8), 0, 100);
  state.reputation = clamp(state.reputation + (state.serverHealth - 60) / 38 - state.cheat / 80, 0, 100);
  state.economy = clamp(state.economy - state.cheat / 120 + (state.whaleMood - 48) / 120, 0, 100);
  state.whaleMood = clamp(state.whaleMood + (state.economy - 52) / 40 - (state.reputation < 35 ? 1.5 : 0), 0, 100);
  state.guildBalance = clamp(state.guildBalance + (state.reputation - 50) / 52 - (state.hype > 70 ? 0.8 : 0), 0, 100);
  state.risk = clamp(state.risk + (state.totalRevenue > 800000 ? 0.75 : 0) + (state.reputation < 30 ? 1.4 : 0) - 0.2, 0, 100);

  const event = pickRandomEvent();
  if (event) {
    const revenueBeforeEvent = state.lastRevenue;
    event.apply(state);
    const revenueDelta = state.lastRevenue - revenueBeforeEvent;
    state.cash += revenueDelta;
    state.totalRevenue += revenueDelta;
    addLog(event.title, event.text);
  }

  const missionResult = resolveMission(mission, before, state);
  addLog(
    missionResult.completed ? "挑战完成" : "挑战失败",
    `${mission.title}：${missionResult.completed ? `获得 ${missionResult.reward}。` : "未达成目标，错过奖励。"}`
  );

  const actionText = chosen.length ? `执行：${chosen.map((action) => action.name).join("、")}。` : "本回合没有主动操作，团队观察数据自然变化。";
  addLog(
    "回合结算",
    `${actionText} 新增 ${acquisition.toLocaleString("zh-CN")} 人，流失 ${churned.toLocaleString("zh-CN")} 人，流水 ${money(
      state.lastRevenue
    )}，运营成本 ${money(opsCost)}。`
  );

  state.history.push({
    day: state.day,
    revenue: state.lastRevenue,
    online: state.online,
    reputation: state.reputation,
  });
  const after = snapshotState(state);
  const report = {
    turn,
    before,
    after,
    actions: chosen.map((action) => action.name),
    acquisition,
    churned,
    event,
    mission: {
      title: mission.title,
      completed: missionResult.completed,
      reward: missionResult.reward,
    },
  };
  state.selected.clear();

  const result = checkResult();
  if (result) {
    state.ended = true;
    showResult(result);
  } else {
    state.day += 1;
    state.mission = createMissionForState(state);
  }

  saveCurrentAccount();
  if (manual) render();
  if (manual && !result) showTurnReport(report);
}

function checkResult() {
  if (state.cash < -120000) {
    return ["现金流断裂", "服务器还没熬到回本，渠道款、客服和机房成本已经压垮团队。"];
  }
  if (state.reputation <= 8) {
    return ["口碑崩盘", "玩家社区形成共识：这服不能碰。新增买量再多也接不住。"];
  }
  if (state.risk >= 95) {
    return ["风险爆表", "投放、返利和投诉叠加触发平台强制整改，赛季提前结束。"];
  }
  if (state.players < 420 && state.day > 4) {
    return ["鬼服停运", "在线人数撑不起行会战和交易市场，玩家最后一次集体转服。"];
  }
  if (state.day >= MAX_DAY) {
    if (state.totalRevenue >= TARGET_REVENUE && state.reputation >= 35 && state.risk < 95) {
      return ["赛季成功", "你把首服撑成了现金牛：玩家还在骂，但他们每回合都准时上线攻沙。"];
    }
    return ["赛季平庸", "服务器活到了结算日，但流水或口碑没有达到老板的预期。"];
  }
  return null;
}

function showResult([title, text]) {
  elements.resultKicker.textContent = `R${state.day} 赛季结算`;
  elements.resultTitle.textContent = title;
  elements.resultText.textContent = text;
  elements.resultStats.innerHTML = [
    ["累计流水", money(state.totalRevenue)],
    ["剩余现金", money(state.cash)],
    ["活跃玩家", Math.round(state.players).toLocaleString("zh-CN")],
    ["口碑 / 风险", `${Math.round(state.reputation)} / ${Math.round(state.risk)}`],
  ]
    .map(([label, value]) => `<div class="dialog-stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  if (typeof elements.resultDialog.showModal === "function") {
    elements.resultDialog.showModal();
  } else {
    elements.resultDialog.setAttribute("open", "");
  }
}

function toggleAction(id) {
  const action = actions.find((item) => item.id === id);
  if (!action || (action.unlockDay && state.day < action.unlockDay)) return;
  if (state.selected.has(id)) {
    state.selected.delete(id);
  } else if (getSelectedAP() + action.ap <= TURN_AP) {
    state.selected.add(id);
  }
  saveCurrentAccount();
  render();
}

function autoSelect() {
  state.selected.clear();
  const candidates = [];
  if (state.cheat > 48) candidates.push("banwave");
  if (state.reputation < 42 || state.serverHealth < 48) candidates.push("support");
  if (state.players < 2300 && state.day >= 6) candidates.push("merge");
  if (state.cash > 150000 && state.hype < 62) candidates.push("ads");
  if (state.economy < 36) candidates.push("dropDown");
  if (state.totalRevenue < TARGET_REVENUE * (state.day / MAX_DAY)) candidates.push("skin");
  if (state.cash > 90000 && state.guildBalance > 44) candidates.push("siege");

  for (const id of candidates) {
    const action = actions.find((item) => item.id === id);
    if (!action || (action.unlockDay && state.day < action.unlockDay)) continue;
    if (getSelectedAP() + action.ap <= TURN_AP) state.selected.add(id);
  }
}

function resetGame() {
  state = baseState();
  saveCurrentAccount();
  if (elements.resultDialog.open && typeof elements.resultDialog.close === "function") {
    elements.resultDialog.close();
  } else {
    elements.resultDialog.removeAttribute("open");
  }
  if (elements.turnReportDialog.open && typeof elements.turnReportDialog.close === "function") {
    elements.turnReportDialog.close();
  } else {
    elements.turnReportDialog.removeAttribute("open");
  }
  render();
}

function resetCurrentAccount() {
  const confirmed = window.confirm(`确定重置账号“${activeAccount}”的运营进度吗？账号名会保留，当前进度会恢复到初始状态。`);
  if (!confirmed) return;
  resetGame();
  elements.accountHint.textContent = `账号“${activeAccount}”已重置为初始进度。后续进度会继续自动保存。`;
}

elements.actions.addEventListener("click", (event) => {
  const card = event.target.closest(".action-card");
  if (!card) return;
  toggleAction(card.dataset.action);
});

elements.nextDayButton.addEventListener("click", () => simulateDay());
elements.resetButton.addEventListener("click", resetGame);
elements.dialogResetButton.addEventListener("click", resetGame);
elements.switchAccountButton.addEventListener("click", switchAccount);
elements.resetAccountButton.addEventListener("click", resetCurrentAccount);
elements.deleteAccountButton.addEventListener("click", deleteCurrentAccount);
elements.accountNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") switchAccount();
});
elements.turnReportButton.addEventListener("click", () => {
  if (elements.turnReportDialog.open && typeof elements.turnReportDialog.close === "function") {
    elements.turnReportDialog.close();
  } else {
    elements.turnReportDialog.removeAttribute("open");
  }
});
elements.forecastButton.addEventListener("click", runForecast);
elements.importHistoryButton.addEventListener("click", importHistory);
elements.autoButton.addEventListener("click", () => {
  for (let i = 0; i < 3; i += 1) {
    if (state.ended) break;
    autoSelect();
    simulateDay(false);
  }
  render();
});

updateAccountUI();
saveCurrentAccount();
render();
