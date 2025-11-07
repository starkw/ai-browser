# AI Browser MVP 功能清单

## 核心功能
- URL 正文抽取与预览（/ai）
  - 参数：`?url=`，抓取页面并提取标题、描述、H1/H2、主体文本
  - UI：输入框 + 结果区（标题/描述/链接/heading 列表/正文预览）
- AI 摘要
  - 接口：`POST /api/summarize { content, title }`
  - 前端：`/ai` 页面按钮触发，显示摘要结果
- 账户与会话
  - NextAuth（Credentials Provider）
  - 页面：`/me` 登录/查看会话；全局 `SessionProvider`
- 笔记示例（Prisma + Server Actions）
  - 页面：`/tabs` 创建/列表 Note（`revalidatePath`）

## 工程与配置
- 数据库：Prisma + SQLite；`prisma/schema.prisma`、`prisma/migrations/`
- 环境变量：`.env.example`（`DATABASE_URL`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`）
- 文档：README Quickstart；本功能清单文档
- 质量：ESLint（Next + TS）、TypeScript 严格模式、`npm run build` 通过

## 启动与验证
1. 复制环境配置：`cp .env.example .env`
2. 安装依赖：`npm install`
3. 迁移数据库：`npx prisma migrate dev --name init`
4. 启动：`npm run dev`
5. 访问：
   - `http://localhost:3000/ai?url=https://example.com`
   - `http://localhost:3000/tabs`
   - `http://localhost:3000/me`

## 约束与后续计划（建议）
- 抽取算法：当前为 DOM 简易抽取（cheerio），后续可替换为 Readability/Boilerpipe 等
- 摘要：当前为规则型截取示例，可接入真实大模型（OpenAI GPT-5、Claude 等）
- 功能扩展：多标签导航、历史记录/收藏、分页摘要、导出/分享

