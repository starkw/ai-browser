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
- 已实现：URL 抽取（直连+Jina 兜底）、GPT-5 摘要（结构化输出）、/ai 页面、/tabs 示例、NextAuth。主页替换为导航页。
- 待实现：M1～M3 里程碑能力。

---

## 2025-09-16 · v0.2.0 聊天界面与文件处理重大更新

### 版本概述
- 版本：v0.2.0
- 部署状态：✅ 已成功部署到 https://aiseach.top
- 核心改进：聊天式 AI 交互 + 完整文件处理能力

### 🎨 UI/UX 重构
**AI 问答页面全面改版**
- 采用现代聊天界面设计（参考 Dia 风格）
- 底部固定输入框，支持连续多轮对话
- 移除顶部标题和模型徽章，界面更简洁
- 输入框占位符优化为"天马行空什么都可以问"
- 全局隐藏滚动条，保持功能完整

**搜索建议优化**
- 首页搜索建议重排序，"Chat" 优先显示
- 保持 Google、Bing、头条等多源搜索选项

### 📁 文件处理能力（迭代A+B）
**上传功能**
- 新增"+"按钮文件上传入口
- 支持多文件同时上传
- 文件预览：显示文件名和大小

**解析格式支持**
- 📄 文档：PDF、Word (.docx)、Excel (.xlsx)、PowerPoint (.pptx)
- 📝 文本：TXT、Markdown (.md)
- 🖼️ 图片：PNG、JPG、JPEG、WebP、BMP（OCR 预留）

**AI 集成**
- 服务端自动解析文件内容
- 解析结果自动参与 AI 问答上下文
- 错误处理和用户友好提示

### 🔧 技术架构优化
**部署稳定性**
- 解决 Next.js SSR 预渲染问题
- 组件拆分：`/ask` 页面分离为容器和内容组件
- 动态导入避免构建时模块加载错误
- 修复所有 TypeScript 类型错误

**API 接口完善**
- `/api/upload`：文件上传和解析服务
- `/api/ask`：支持多轮对话和文件附件
- 动态模块导入优化性能

**环境配置**
- 完善 GPT-5 API 集成
- Prisma + SQLite 数据库稳定运行
- 成功绑定自定义域名 aiseach.top

### 🚀 用户体验提升
**交互流程**
- 首页搜索无缝跳转到聊天界面
- 自动发送首页查询并显示 AI 回答
- Enter 发送，Shift+Enter 换行
- 消息自动滚动到最新位置

**功能完整性**
- ✅ 保留所有原有功能
- 🆕 新增完整文件处理链路
- 🔄 向后兼容所有 API 和 URL
- 🎨 统一现代化设计语言

### 📊 本版本统计
- **新增功能**：9 个主要模块
- **优化改进**：20+ 具体改进点
- **修复问题**：7 个部署相关技术问题
- **支持格式**：8 种文件类型

### 下一步规划
- 图片 OCR 功能完善（需要 Tesseract.js 或云服务）
- 文件解析性能优化和缓存机制
- 多标签整合问答能力（M2 里程碑）
- 个性化历史学习功能（M3 里程碑）