import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const links = await prisma.savedLink.findMany({ orderBy: { id: "desc" }, take: 100 });
  return (
    <div className="max-w-3xl mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">已保存的链接</h1>
      {!links.length ? (
        <div className="opacity-70">还没有保存的链接。你可以在任意页面按 Cmd/Ctrl+K，输入 /save URL 保存。</div>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id} className="border rounded p-3">
              <a className="underline" href={l.url} target="_blank" rel="noreferrer">
                {l.title || l.url}
              </a>
              <div className="text-xs opacity-60">#{l.id} · {new Date(l.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

