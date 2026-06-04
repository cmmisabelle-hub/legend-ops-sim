# 做了个传奇

一个类传奇 MMO 运营题材的回合制经营模拟器。

## 玩法

- 12 回合赛季。
- 每回合 5 AP 行动点。
- 选择运营行动牌，消耗 AP 和现金。
- 回合结束时结算流水、玩家、口碑、外挂、经济、风险和随机事件。
- 每回合有动态挑战任务，完成后获得奖励。
- 支持输入历史数据并估算未来走势。

## 本地打开

直接双击 `index.html`，或在浏览器打开：

```text
file:///C:/legend-ops-sim/index.html
```

## 发布到 GitHub Pages

1. 新建 GitHub 仓库，例如 `legend-ops-sim`。
2. 上传 `index.html`、`styles.css`、`game.js`、`README.md` 到仓库根目录。
3. 进入仓库 `Settings`。
4. 进入 `Pages`。
5. `Source` 选择 `Deploy from a branch`。
6. `Branch` 选择 `main`，目录选择 `/root`。
7. 保存后等待 GitHub 生成访问地址。

最终地址通常类似：

```text
https://你的用户名.github.io/legend-ops-sim/
```

## 文件说明

- `index.html`：页面结构。
- `styles.css`：游戏 HUD 风格样式。
- `game.js`：核心玩法、回合结算、任务、预测逻辑。
