import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  input: string;
  userId?: string;
};

function isUrlLike(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return false; // 含空格则不是 URL
  if (/^https?:\/\//i.test(t)) return true; // 明确带协议
  // 典型域名形式：包含点的主域 + 顶级域，避免将中文句子误判为 URL
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(t);
}

function buildSearchUrl(query: string): string {
  const q = query.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export async function POST(req: NextRequest) {
  const { input, userId } = (await req.json()) as Payload;
  const raw = (input || "").trim();
  if (!raw) return Response.json({ error: "input is required" }, { status: 400 });

  // slash commands: /open /sum /save
  const isSlash = raw.startsWith("/");
  const [cmd, ...rest] = isSlash ? raw.slice(1).split(/\s+/) : ["", raw];
  const arg = rest.join(" ").trim();

  // /open: return a URL to navigate
  if (cmd === "open") {
    const target = isUrlLike(arg) ? (/^https?:\/\//i.test(arg) ? arg : `https://${arg}`) : `/ai?url=${encodeURIComponent(arg)}`;
    return Response.json({ action: "navigate", target });
  }

  // /sum: go to /ai with url or keywords
  if (cmd === "sum") {
    const target = `/ai?url=${encodeURIComponent(arg)}`;
    return Response.json({ action: "navigate", target });
  }

  // /save: store a link
  if (cmd === "save") {
    if (!isUrlLike(arg)) return Response.json({ error: "not a valid url" }, { status: 400 });
    const url = /^https?:\/\//i.test(arg) ? arg : `https://${arg}`;
    try {
      await prisma.savedLink.create({ data: { url } });
      return Response.json({ action: "saved", url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // default: if looks like url → open; otherwise go to our AI answer page
  if (isUrlLike(raw)) {
    const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return Response.json({ action: "navigate", target });
  }
  return Response.json({ action: "navigate", target: `/ask?q=${encodeURIComponent(raw)}` });
}

export async function GET(req: NextRequest) {
  // 允许首页使用 <form method="get" action="/api/omnibox"> 提交
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.redirect(new URL("/", req.url));

  const isUrlLikeQ = isUrlLike(q);
  const target = isUrlLikeQ ? (/^https?:\/\//i.test(q) ? q : `https://${q}`) : `/ask?q=${encodeURIComponent(q)}`;
  // 302 重定向到目标（支持站内与外链）
  try {
    return NextResponse.redirect(target);
  } catch {
    // 对于站内相对链接，补全域名
    return NextResponse.redirect(new URL(target, req.url));
  }
}

