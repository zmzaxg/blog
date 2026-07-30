# 南凝小记记账系统 - 需求拆解文档

## 产品概述

- **产品类型**: 移动端个人记账应用（含收支记账、欠款管理、统计报表、资金总览）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 个人用户，用于日常收支记录、欠款管理和财务统计
- **核心价值**: 极简深色设计的个人记账工具，支持手动记账、欠款管理、消费报表分析和资金总览
- **界面语言**: 中文
- **主题偏好**: 深色（纯黑背景 + 深灰卡片 + 白色文字，与参考图完全一致）
- **导航模式**: 路径导航
- **导航布局**: 底部 Tab Bar（移动端风格，4 个 Tab：首页 / 报表 / 欠款 / 我的钱）
- **技术栈说明**: 用户明确要求以 Cloudflare Worker 项目形式生成，后端使用 Cloudflare Workers + KV/DB 存储，前端为移动端单页应用

> **参考截图**: 用户附带 6 张参考截图，分别展示首页、报表页（2种视角）、消费报表页、欠款页、我的钱页，需严格复刻视觉样式和交互。

---

## 页面结构总览

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 首页 | `HomePage.tsx` | `/` | 一级 | 底部导航 |
| 报表 | `ReportPage.tsx` | `/report` | 一级 | 底部导航 |
| 欠款 | `DebtPage.tsx` | `/debt` | 一级 | 底部导航 |
| 我的钱 | `MoneyPage.tsx` | `/money` | 一级 | 底部导航 |

> **说明**：4 个页面均为一级页面，通过底部 Tab Bar 切换，完全对应参考截图中的 4 个导航项。报表页整合了「消费报表」（含时间维度切换、月份选择、收支概览、结余卡片、收支对比图）和「支出分类 + 交易明细」两部分内容，在同一页内纵向滚动展示。

---

## 页面布局建议

### 整体布局模式
- **布局模式**: 移动端竖屏单栏布局（最大宽度约 430px，居中显示，模拟手机 App 效果）
- **视觉重心**: 数据卡片 + 操作入口，每个页面顶部为核心数据概览，中部为操作/列表区，底部为 Tab 导航
- **结果承载区**: 各页面数据均从后端 API 实时获取，初始态为骨架屏加载

### 各页面布局说明

| 页面 | 布局结构（从上到下） | 视觉重心 |
|-----|---------------------|---------|
| 首页 | 顶部导航栏 → 本月收支卡片 → 语音记账输入框 → 手动记账/记欠款按钮 → 后台管理入口 → 最近记录列表 → 底部Tab | 本月收支卡片 + 记账入口 |
| 报表 | 顶部标题栏 → 公告栏 → 时间维度切换(按天/按月/按年) → 月份选择 → 收支概览双卡片 → 结余高亮卡片 → 收支对比柱状图 → 支出分类列表 → 交易明细 → 底部Tab | 结余卡片 + 柱状图 + 分类排行 |
| 欠款 | 顶部标题栏 → 公告栏 → 我欠的/欠我的切换 → 待还总额卡片 → 添加欠款表单 → 欠款列表 → 底部Tab | 待还总额 + 添加表单 |
| 我的钱 | 顶部导航栏 → 口袋余额卡片 → 欠款双栏卡片 → 资金明细列表 → 记一笔/记欠款按钮 → 公式说明 → 底部Tab | 可支配资金高亮卡片 |

---

## 导航配置

- **导航布局**: 底部 Tab Bar（移动端风格，固定在底部）
- **导航项**（4 个一级页面）:

| 导航文字 | 路由 | 图标 | 选中态 |
|---------|------|------|--------|
| 首页 | `/` | 房子图标 | 白色高亮 |
| 报表 | `/report` | 柱状图图标 | 白色高亮 |
| 欠款 | `/debt` | 双人/人物图标 | 白色高亮 |
| 我的钱 | `/money` | 钱包图标 | 白色高亮 |

> **说明**: 导航样式严格复刻参考图——图标在上、文字在下，深灰背景，选中项为白色高亮，未选中为灰色。

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 记账记录（收支流水） | real-api | Cloudflare Worker 后端 API（`/api/transactions`），支持 CRUD，存储于 KV/DB | 初始 4 条 source='mock' 示例数据（与参考图一致） |
| 欠款记录（我欠的/欠我的） | real-api | Cloudflare Worker 后端 API（`/api/debts`），支持 CRUD，存储于 KV/DB | 初始 1 条 source='mock' 示例数据（姐 ¥2500） |
| 收支统计（月度汇总、分类统计） | real-api | Cloudflare Worker 后端 API（`/api/stats`），基于交易记录实时计算返回 | 按 mock 交易数据计算 |
| 公告数据 | real-api | Cloudflare Worker 后端 API（`/api/announcements`） | 初始 1 条 source='mock'「测试公告0」 |
| 语音记账（一句话记账） | real-plugin | capabilityClient 调 ai-text-to-json 实例，传入用户语音转写文本，流式输出解析后的记账结构化数据（金额、分类、收支类型、备注） | 失败提示（toast "语音识别暂不可用"） |
| 数据持久化（后端侧） | real-api | Cloudflare Worker + KV 命名空间 / D1 数据库，所有数据通过 REST API 读写 | 无（后端真实存储） |

> **Cloudflare Worker 项目结构说明**: 后端为 Worker 函数，通过路由分发处理 API 请求；前端为静态资源（HTML/JS/CSS），由 Worker 直接 serve。数据存储使用 Cloudflare KV（或 D1 数据库），通过环境变量绑定。

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| 语音记账解析 | ai-text-to-json | 将用户输入的自然语言（如「昨天午饭58元」）解析为结构化的记账数据（金额、分类、收支类型、日期、备注） | unary | 首页 |

> **说明**: 首页语音记账输入框对应此插件能力。用户输入一句话后，调用插件解析为记账数据，确认后提交保存。

---

## 功能列表

### 页面：首页（HomePage）

- **页面目标**: 展示本月收支概览，提供快速记账入口，查看最近记录
- **功能点**:
  - **本月收支概览**: 展示当月结余金额、收入总额、支出总额，数据从后端 API 获取
  - **语音/一句话记账**: 输入框支持自然语言输入（如「昨天午饭58元」），调用 AI 插件解析为结构化记账数据，确认后保存
  - **手动记账 / 记欠款切换**: 两个胶囊按钮切换记账模式，手动记账弹出收支表单，记欠款跳转至欠款页
  - **最近记录列表**: 展示最近 4 条收支记录，含分类、备注、日期、金额，支持编辑和删除操作
  - **查看全部**: 点击「查看全部」跳转至报表页交易明细区域
  - **后台管理入口**: 盾牌图标 + 「后台管理」文字，右侧「公告/用户」小字（入口按钮，点击可展开管理面板）

### 页面：报表（ReportPage）

- **页面目标**: 多维度展示消费统计，包括收支对比图、支出分类排行、交易明细
- **功能点**:
  - **公告栏**: 顶部展示系统公告，带喇叭图标和关闭按钮
  - **时间维度切换**: 按天/按月/按年三段式切换，切换后数据和图表联动刷新
  - **月份切换**: 左右箭头切换月份，中间显示当前年月
  - **收支概览卡片**: 双栏展示收入和支出总额
  - **结余高亮卡片**: 白色突出显示当月结余金额和交易笔数
  - **收支对比柱状图**: 展示每日收支金额对比的柱状图，横轴日期纵轴金额，深色风格
  - **支出分类排行**: 按金额从高到低展示 6 个支出分类，含排名、分类名、进度条、金额
  - **交易明细列表**: 按时间倒序展示交易记录，含分类标签、名称、日期、金额

### 页面：欠款（DebtPage）

- **页面目标**: 管理个人借贷记录，包括我欠的和欠我的两类
- **功能点**:
  - **公告栏**: 顶部展示系统公告，可关闭
  - **分类切换**: 「我欠的」/「欠我的」胶囊切换器，切换后数据联动
  - **待还/待收总额卡片**: 展示总额、未结清代笔数、已结清代笔数
  - **添加欠款表单**: 含债主姓名、金额、日期选择、备注（选填）4 个输入项，表单验证通过后「添加」按钮可用
  - **欠款列表**: 展示未结清欠款记录，含圆形选择框、债主姓名、日期、金额，支持编辑和删除
  - **结清操作**: 点击圆形选择框可标记为已结清，已结清记录移至已结清分组

### 页面：我的钱（MoneyPage）

- **页面目标**: 资金总览，展示余额、欠款、可支配资金等综合财务数据
- **功能点**:
  - **口袋余额卡片**: 展示当前余额，下方分列总收入和总支出
  - **欠款双栏卡片**: 左侧「我欠别人的」金额和笔数，右侧「别人欠我的」金额和笔数
  - **资金明细列表**: 4 项明细——总收入、总支出、欠款净额、可支配资金（白色高亮卡片突出显示），每项含图标、说明、金额
  - **快捷操作按钮**: 「记一笔」和「记欠款」两个大按钮，分别跳转首页记账和欠款页
  - **公式说明**: 底部小字展示可支配资金计算公式

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_nn_transactions` | 收支交易记录列表，类型为 `ITransaction[]` | 首页、报表、我的钱 |
| `__global_nn_debts` | 欠款记录列表，类型为 `IDebt[]` | 欠款页、我的钱 |
| `__global_nn_announcements` | 系统公告列表，类型为 `IAnnouncement[]` | 报表页、欠款页 |
| `__global_nn_currentMonth` | 当前选中月份，类型为 `string`（YYYY-MM） | 报表页 |

```ts
interface ITransaction {
  id: string;
  type: 'income' | 'expense';  // 收入/支出
  category: string;             // 分类：购物/餐饮/日用/服饰/交通/其他
  amount: number;               // 金额（正数）
  note?: string;                // 备注
  date: string;                 // 日期 YYYY-MM-DD
  createdAt: string;
  source?: 'mock' | 'api';
}

interface IDebt {
  id: string;
  direction: 'i_owe' | 'owe_me'; // 我欠的/欠我的
  personName: string;            // 对方姓名
  amount: number;                // 金额
  date: string;                  // 发生日期 YYYY-MM-DD
  note?: string;                 // 备注
  status: 'pending' | 'settled'; // 未结清/已结清
  createdAt: string;
  source?: 'mock' | 'api';
}

interface IAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  source?: 'mock' | 'api';
}
```

---

## Cloudflare Worker 后端 API 规划

> **说明**: 以下为后端 API 接口定义，供 Code Agent 实现 Worker 时参考。数据存储使用 Cloudflare KV（命名空间如 `NN_KV`），或 D1 SQLite 数据库。

| API 路径 | 方法 | 功能 | 请求体 | 返回 |
|---------|------|------|--------|------|
| `/api/transactions` | GET | 获取交易记录列表（支持月份筛选） | query: `?month=2026-07` | `{ data: ITransaction[] }` |
| `/api/transactions` | POST | 新增交易记录 | `ITransaction`（不含 id/createdAt） | `{ data: ITransaction }` |
| `/api/transactions/:id` | PUT | 更新交易记录 | `Partial<ITransaction>` | `{ data: ITransaction }` |
| `/api/transactions/:id` | DELETE | 删除交易记录 | - | `{ success: true }` |
| `/api/debts` | GET | 获取欠款列表 | query: `?direction=i_owe\|owe_me` | `{ data: IDebt[] }` |
| `/api/debts` | POST | 新增欠款 | `IDebt`（不含 id/createdAt） | `{ data: IDebt }` |
| `/api/debts/:id` | PUT | 更新欠款（含结清） | `Partial<IDebt>` | `{ data: IDebt }` |
| `/api/debts/:id` | DELETE | 删除欠款 | - | `{ success: true }` |
| `/api/stats` | GET | 获取统计数据（月度汇总、分类统计） | query: `?month=2026-07&period=day\|month\|year` | `{ income, expense, balance, count, categoryStats, dailyStats }` |
| `/api/announcements` | GET | 获取公告列表 | - | `{ data: IAnnouncement[] }` |

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Exact Reference —— 用户要求"一模一样的样子"，6 张截图为成品 UI，视觉、布局、组件形态全部从图中抽取。
- **核心情绪 / 应用类型**: 个人记账工具（收支 + 欠款 + 报表 + 资金总览），深色极简、克制、数据聚焦。
- **独特记忆点**: 纯黑底 + 深灰卡片 + 白色高亮结余卡的三段对比；"入/出/欠/钱"圆形字标作为分类视觉锚点。

## 2. Art Direction

- **方向名**: 极简深色记账
- **Design Style**: Minimal Dark + Rounded Soft —— 纯黑背景降低夜间用眼负担，大圆角卡片营造温和手感，符合个人财务工具的私密与克制。
- **DNA 参数**: 圆角 `rounded-2xl`（卡片）/ `rounded-full`（按钮、输入框、切换器）；阴影 `shadow-none`（靠边界与底色分层）；间距 `gap-4` / `p-5`（紧凑移动端密度）；字体方向 无衬线中等字重、数字等宽；装饰手法 仅靠黑白灰对比与卡片层级。
- **应用类型**: Tool —— 底部 Tab 导航的移动端单页应用，内容纵向滚动。

## 3. Color System

**色彩关系**: 纯黑背景 + 深灰卡片承载面 + 纯白主交互/高亮，全黑白灰单色系，无彩色主色，靠明度差建立层级。
**配色设计理由**: 参考图为纯深色模式记账 App，primary 以纯白承担 CTA、tab 激活、结余高亮卡；深灰 card 与黑底形成柔和分层；textMuted 用于次要元信息，保证长时间浏览不刺眼。
**主色推导**: 从参考图抽取——纯白 `hsl(0 0% 100%)` 作为 primary（主按钮、选中态、结余卡），深灰 `hsl(0 0% 12%)` 为 card 面，近黑 `hsl(0 0% 7%)` 为页面底，整体无彩色倾向。
**使用比例**: 70% 黑灰中性 / 20% 卡片深灰 / 10% 纯白 primary；primary 仅用于主按钮、tab 激活、结余高亮卡、关键金额，不滥用。

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(0 0% 7%) | 页面纯黑底 |
| card | `--card` | `bg-card` | hsl(0 0% 12%) | 卡片、表单、弹层、图表容器 |
| text | `--foreground` | `text-foreground` | hsl(0 0% 98%) | 标题与正文 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(0 0% 55%) | 占位符、说明、辅助元信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(0 0% 100%) | 主按钮、tab 激活、结余高亮卡、关键金额 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 8%) | primary 上的文字（黑字白底） |
| accent | `--accent` | `bg-accent` | hsl(0 0% 18%) | hover/focus 浅底、选中浅底、菜单项状态 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(0 0% 85%) | accent 上的文字和图标 |
| border | `--border` | `border-border` | hsl(0 0% 18%) | 输入框、卡片、菜单边界（极弱） |

**语义色提示**: 收入绿 `hsl(142 70% 55%)`——bg: hsl(142 40% 12%) / border: hsl(142 50% 25%) / text: hsl(142 70% 65%)；支出红 `hsl(0 70% 60%)`——bg: hsl(0 30% 12%) / border: hsl(0 40% 25%) / text: hsl(0 75% 68%)；两者饱和度均控制在中低水平，与黑白主色的克制感对齐，不喧宾夺主。

## 4. 字体与节奏

- **font-display**: Noto Sans SC —— 与参考图的中文无衬线气质一致，数字清晰、字形中性。
- **font-body**: Noto Sans SC —— 正文与标题统一字体，保持极简统一感。
- **字号**: 金额大字 text-4xl ~ text-5xl；卡片标题 text-lg ~ text-xl；body text-base；muted text-sm。
- **圆角**: 大圆角（卡片 `rounded-2xl`，按钮/输入框/切换器 `rounded-full`）—— 参考图胶囊按钮与圆润卡片特征。

## 5. 全局布局契约

- **Reference Layout Use**: Exact —— 底部 4 Tab 导航、顶部标题栏、卡片纵向堆叠、双栏收支卡、结余高亮卡、分类进度条列表、欠款表单 + 列表、资金明细 4 项等布局全部来自参考图。
- **Page / Section Order**: 首页 / 报表 / 欠款 / 我的钱 四个主页面，与底部 Tab 一一对应。
- **Standard Content Zone**: 移动端 `max-w-md` + `mx-auto`，模拟手机 App 宽度；桌面端居中显示，两侧留黑。
- **Shell / Frame Alignment**: 底部 Tab Bar 固定，内容区独立滚动，安全区内边距 `px-4`。
- **Padding & Rhythm**: `px-4 py-4`，卡片间距 `gap-4`，section 标题与内容间距 `gap-3`，保持 4px 倍数节奏。
- **Full-bleed Zones**: 底部 Tab Bar 全宽；结余高亮卡、公告条与内容区同宽。
- **Local Narrowing**: 表单输入区在卡片内自然收窄，不额外设置 max-w。
- **Overflow Strategy**: 分类列表、交易记录、欠款列表均纵向滚动；柱状图横向自适应。
- **Flexibility Boundary**: 允许移动端卡片内边距和字号微调；不允许改变黑白灰主色、圆角系统、底部 Tab 结构。

## 6. 视觉与动效

- **装饰**: 无装饰，纯靠卡片层级与明度对比
- **阴影/边界**: 无阴影，靠 `border` 极弱描边与底色差分层
- **动效**: 克制 —— tab 切换与页面切换使用淡入；按钮按下轻微缩放；柱状图入场从底部生长；无多余动效

## 7. 组件原则

- 按钮分三级：纯白填充主按钮（记欠款、添加等 CTA）、深灰填充次级按钮（手动记账、记一笔）、幽灵文字按钮（查看全部）。
- 输入框为深灰胶囊形，左侧图标 + 占位文字，无边框高光。
- 分段切换器为胶囊容器，选中项为白色填充黑字，未选中为深灰灰字。
- 列表项为圆角深灰卡片，左侧圆形"入/出/欠/钱"字标，中间分类+备注，右侧金额+操作图标。
- 加载与空状态延续深灰卡片 + 浅灰占位文字，不引入彩色骨架。

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、黑白灰对比与"入/出/欠/钱"圆形字标建立视觉记忆点。
- **Image Art Direction**: 无强制图片需求
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免任何彩色插画、渐变背景、装饰性图案，保持极简深色纯文字界面。

## 9. Anti-patterns

- **Color invasion**: 引入蓝色/紫色/绿色等品牌色做主按钮；本产品 primary 是纯白，彩色只用于收入/支出语义且低饱和。
- **Shadow creep**: 给卡片加阴影提升层级；参考图靠底色差和极弱描边分层，阴影会破坏纯黑极简感。
- **Rounded mismatch**: 卡片用小圆角、按钮用中圆角；统一为卡片 `rounded-2xl`、交互元素 `rounded-full`。
- **Tab bar drift**: 底部导航改成侧边栏或顶部 Tab；必须保留底部 4 图标 + 文字的移动端 Tab Bar。
- **Mono-hue tyranny**: 白色同时用于主按钮、tab 图标、边框、链接、金额；按权重分配——纯白给 CTA 和结余卡，浅灰给次级文字，深灰给边界与 accent。
- **Status color drift**: 收入绿支出红饱和度过高，在黑白界面中刺眼；语义色饱和度控制在 50-70%，明度偏中高，与整体克制感对齐。