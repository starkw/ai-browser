"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ChatMessage } from "@/lib/deepseek";

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: "你是耐心、简洁的中文助手。" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedTexts, setUploadedTexts] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(prompt?: string) {
    const q = (prompt ?? input).trim();
    if (!q || loading) return;
    if (!prompt) setInput("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    setFiles([]); // 清空选择
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, attachments: uploadedTexts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setMessages((m) => [...m, { role: "assistant", content: data.text }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [...m, { role: "assistant", content: `出错：${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  // 首页跳转带 q 时，自动发起首轮问答
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && messages.length === 1 && !loading) {
      // 立即触发一次
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 pt-4 pb-28 space-y-4 max-w-3xl w-full mx-auto">
        {messages
          .filter((m) => m.role !== "system")
          .map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm " +
                  (m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-black/5 dark:bg-white/10")
                }
              >
                {m.content}
              </div>
            </div>
          ))}
        {loading ? (
          <div className="text-left">
            <div className="inline-block bg-black/5 dark:bg-white/10 rounded-2xl px-4 py-2.5 text-sm">正在思考…</div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      {/* 底部浮动胶囊输入条 */}
      <div className="fixed left-0 right-0 bottom-4 z-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-2 rounded-full border bg-background/90 backdrop-blur shadow-xl px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="天马行空什么都可以问"
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 px-2 py-1"
            />
            {/* 上传附件：图片/文件 */}
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                if (list.length) setFiles(list);
              }}
            />
            <button
              title="上传图片或文件"
              className="text-xl opacity-70 hover:opacity-100 px-1"
              type="button"
              onClick={async () => {
                const el = document.getElementById("file-input") as HTMLInputElement | null;
                el?.click();
                // 等待用户选择后上传
                setTimeout(async () => {
                  const filesNow = (document.getElementById("file-input") as HTMLInputElement | null)?.files;
                  if (!filesNow || !filesNow.length) return;
                  const arr = Array.from(filesNow);
                  const texts: string[] = [];
                  for (const f of arr) {
                    const fd = new FormData();
                    fd.append("file", f);
                    const r = await fetch("/api/upload", { method: "POST", body: fd });
                    const j = await r.json();
                    if (r.ok && j.text) texts.push(`# ${j.name}\n${j.text}`);
                  }
                  setUploadedTexts(texts);
                }, 50);
              }}
            >
              ＋
            </button>
            <button
              onClick={() => void send()}
              disabled={loading || input.trim().length === 0}
              className="rounded-full bg-foreground text-background px-3 py-2 text-sm disabled:opacity-50"
            >
              发送
            </button>
          </div>
          {/* 附件预览 chips */}
          {files.length ? (
            <div className="px-4 pt-2 flex gap-2 flex-wrap text-xs opacity-80">
              {files.map((f, i) => (
                <span key={`${f.name}-${i}`} className="px-2 py-1 rounded-full border">
                  {f.name} · {Math.round(f.size / 1024)}KB
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

