"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Omnibox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function isEditable(target: EventTarget | null) {
    try {
      const element = target as Element | null;
      const el = element && typeof element.closest === "function" ? element.closest("input, textarea, [contenteditable='true']") : null;
      return Boolean(el);
    } catch {
      return false;
    }
  }

  const onKey = useCallback((e: KeyboardEvent) => {
    const mac = navigator.platform.toLowerCase().includes("mac");
    const metaOrCtrl = mac ? e.metaKey : e.ctrlKey;
    if (metaOrCtrl && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    if (metaOrCtrl && e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    if (!metaOrCtrl && e.key === "/" && !isEditable(e.target)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    if (open) {
      setTimeout(() => ref.current?.focus(), 0);
    }
  }, [open]);

  // Fallback: 打开链接 `/?cmdk=1` 或 `/#cmdk` 自动唤起
  useEffect(() => {
    function checkUrl() {
      try {
        const u = new URL(window.location.href);
        if (u.searchParams.get("cmdk") === "1" || u.hash === "#cmdk") {
          setOpen(true);
        }
      } catch {}
    }
    (window as unknown as { omniOpen?: () => void }).omniOpen = () => setOpen(true);
    window.addEventListener("hashchange", checkUrl);
    window.addEventListener("popstate", checkUrl);
    checkUrl();
    return () => {
      window.removeEventListener("hashchange", checkUrl);
      window.removeEventListener("popstate", checkUrl);
    };
  }, []);

  async function submit() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/omnibox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      if (data.action === "navigate" && data.target) {
        window.location.href = data.target as string;
      }
      if (data.action === "saved") {
        alert("已保存: " + data.url);
        setOpen(false);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          className="fixed right-4 bottom-4 z-40 rounded-full shadow bg-foreground text-background text-sm px-3 py-2 opacity-80 hover:opacity-100"
          title="打开命令面板（/ 或 Ctrl/Cmd+K, Ctrl/Cmd+Shift+K）"
          onClick={() => setOpen(true)}
        >
          ⌘K
        </button>
      ) : null}

      {!open ? null : (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24">
      <div className="bg-background text-foreground rounded shadow w-[min(680px,92vw)] p-4">
        <div className="text-sm opacity-70 mb-2">输入 URL、搜索或命令（/open /sum /save） · Esc 关闭 · / 或 Ctrl/Cmd(+Shift)+K 打开</div>
        <input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          className="w-full border rounded px-3 py-2"
          placeholder="如：/sum https://example.com 或 生成型 AI 浏览器"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button className="border rounded px-3 py-1" onClick={() => setOpen(false)} disabled={loading}>
            取消 (Esc)
          </button>
          <button className="bg-foreground text-background rounded px-3 py-1" onClick={submit} disabled={loading}>
            {loading ? "执行中…" : "执行 (Enter)"}
          </button>
        </div>
      </div>
    </div>
      )}
    </>
  );
}

