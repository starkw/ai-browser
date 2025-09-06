# 决策日志（Decisions)

## 2025-08-24 · 参考 Dia 的功能并落地到本项目
- 背景：用户需要一个“AI 浏览器”MVP，要求能够抽取网页、生成摘要，并逐步支持多标签整合问答与历史学习。
- 参考来源：Dia 的“智能交互地址栏、多标签整合问答、个性化历史学习”等核心能力。

### 我们的落地方案
- 智能交互地址栏（AI omnibox）
  - 输入统一入口：URL/搜索/自然语言命令（/sum、/qa、/open、/save）。
  - 快捷键：Cmd/Ctrl+K 呼出；Tab 在命令与搜索间切换。
  - 行为：URL → 打开并抽取；非 URL → 触发 QA/摘要；支持“在新标签打开”。
- 多标签整合问答
  - 范围：当前标签 / 所有打开标签 / 收藏集合。
  - 数据：为每个页面缓存抽取后的正文，QA 时做轻量检索并给出“引用原文段落+跳转链接”。
- 个性化历史学习（需用户同意）
  - 数据：近 7 天的标题、URL、正文摘要、时间。
  - 视图：主题回顾、时间轴、今日要点；支持一键清空/导出。

### 数据与接口草案
- 表结构（Prisma）
  - `Tab(id, userId, url, title, createdAt, closedAt?)`
  - `PageContent(id, tabId?, url, title, content, headings, createdAt)`
  - `Collection(id, userId, name)` 与 `CollectionItem(collectionId, pageContentId)`
  - `UserPrefs(userId, consentHistory:boolean, historyWindowDays:int)`
- API
  - `POST /api/omnibox`：解析输入并路由（open/search/qa/sum）
  - `POST /api/qa`：{ scope: current|tabs|collection, query }
  - `POST /api/history/toggle`、`GET /api/history/summary`

### 里程碑
- M1：顶部地址栏与斜杠命令、收藏集合、基础 QA 钩子（2–3 天）
- M2：多标签整合问答（抽取缓存+轻量检索+引用）（3–4 天）
- M3：历史学习（同意机制+时间轴/主题回顾）（3–4 天）
- M4（可选）：向量检索、模型切换、离线缓存与导出（>3 天）

### 现状
- 已实现：URL 抽取（直连+Jina 兜底）、DeepSeek 摘要（结构化输出）、/ai 页面、/tabs 示例、NextAuth。主页替换为导航页。
- 待实现：M1～M3 里程碑能力。