"use client";
import { useEffect, useMemo, useState } from "react";

function isUrlLike(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(t);
}

type Suggestion = {
  id: "open" | "google" | "bing" | "toutiao" | "ask";
  href: string;
  query?: string; // for google/ask display
  urlLabel?: string; // for open display
  provider?: "Google" | "Bing" | "头条" | "Chat";
};

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo<Suggestion[]>(() => {
    const t = q.trim();
    if (!t) return [];
    if (isUrlLike(t)) {
      const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      return [{ id: "open", href: url, urlLabel: url }];
    }
    return [
      // 将 Chat 放到第一位
      { id: "ask", href: `/ask?q=${encodeURIComponent(t)}`, query: t, provider: "Chat" },
      { id: "google", href: `https://www.google.com/search?q=${encodeURIComponent(t)}`, query: t, provider: "Google" },
      { id: "bing", href: `https://www.bing.com/search?q=${encodeURIComponent(t)}`, query: t, provider: "Bing" },
      { id: "toutiao", href: `https://so.toutiao.com/search?keyword=${encodeURIComponent(t)}`, query: t, provider: "头条" },
    ];
  }, [q]);

  function go(href: string) {
    window.location.href = href;
  }

  useEffect(() => {
    setActive(0);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          // 确保在某些浏览器“后退返回”时未触发 onFocus 也能打开建议
          setFocused(true);
        }}
        onKeyDown={(e) => {
          if (!suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((x) => Math.min(x + 1, suggestions.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((x) => Math.max(x - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            go(suggestions[active].href);
          }
          if (e.key === "Escape") {
            setFocused(false);
          }
        }}
        placeholder="输入 URL 或问题，例如：隔夜菜能不能吃？"
        className="w-full border rounded-xl px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
      />
      {focused && suggestions.length ? (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl border bg-background/95 backdrop-blur shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.id}-${i}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(s.href)}
              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-4 ${
                i === active ? "bg-black/5 dark:bg-white/10" : ""
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs">
                  {s.id === "open" ? "🔗" : s.id === "ask" ? "💬" : "🔍"}
                </span>
                <span className="truncate">
                  {s.id === "open" ? `打开：${s.urlLabel}` : s.query}
                </span>
              </span>
              {s.id !== "open" ? (
                <span className="text-xs opacity-60 shrink-0">— {s.provider}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

