"use client";
import { useState } from "react";

export default function ModelBadge({ model, query }: { model: string; query?: string }) {
  const [open, setOpen] = useState(false);
  const searchUrl = query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : undefined;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition"
        title={`模型：${model}`}
      >
        <span className="text-yellow-500">⚡</span>
        <span className="opacity-80">AI</span>
      </button>
      {!open ? null : (
        <div className="absolute z-50 mt-2 w-60 rounded border bg-background shadow p-3">
          <div className="text-xs font-medium mb-1">Answer</div>
          <div className="text-xs opacity-80 mb-2">Responds with AI</div>
          <div className="text-xs mb-3">Used <span className="font-medium">{model}</span></div>
          {searchUrl ? (
            <a
              href={searchUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-xs underline opacity-80 hover:opacity-100"
            >
              Use Web Search instead
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

