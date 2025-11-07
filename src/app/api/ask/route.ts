import { NextResponse } from "next/server";
import { chatGPT, type ChatMessage } from "@/lib/gpt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; attachments?: string[] };
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }
    // 将附件解析文本（直接传过来的纯文本）拼入上下文
    const attachText = Array.isArray(body.attachments) ? body.attachments.filter(Boolean).join("\n\n") : "";
    const finalMessages: ChatMessage[] = attachText
      ? [{ role: "system", content: `以下是与用户问题相关的文件内容，请结合回答：\n${attachText}` }, ...messages]
      : messages;
    const result = await chatGPT({ messages: finalMessages });
    console.log('🔍 [API] 请求模型:', process.env.GPT5_MODEL || 'gpt-5-chat-latest');
    console.log('🔍 [API] 返回模型:', result.model);
    console.log('🔍 [API] 返回内容:', result.text.substring(0, 100) + '...');
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

