This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Quickstart
1. 复制环境配置
   - 复制 `.env.example` 为 `.env`（SQLite 默认 `file:./dev.db`）
2. 安装依赖并启动
   ```bash
   npm install
   npm run dev
   ```
3. 初始化数据库（首次或 schema 变更后）
   ```bash
   npx prisma migrate dev --name init
   ```
4. 访问示例页
   - 打开 `http://localhost:3000/tabs` 创建/查看 Note
   - 使用全局命令面板：进入首页按 `/` 或 Cmd+K，支持 /open /save

## 文档
- [AI Browser MVP 功能清单](docs/MVP.md)
- [决策日志：Dia 功能参考与落地方案](docs/DECISIONS.md)

## 命令面板与路由
- `/open <url|关键词>`：若是 URL 直接打开，否则跳到解析页
- `/save <url>`：保存链接，查看 `/saved`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
