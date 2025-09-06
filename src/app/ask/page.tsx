import { askDeepSeek } from "@/lib/deepseek";
import ModelBadge from "@/components/ModelBadge";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AskPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : Array.isArray(sp.q) ? sp.q[0] : "";
  let answer: string | null = null;
  let model: string | null = null;
  let error: string | null = null;
  if (q) {
    try {
      const resp = await askDeepSeek({ prompt: q });
      answer = resp.text;
      model = resp.model;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">AI 回答</h1>
      <form method="get" className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" name="q" defaultValue={q} placeholder="输入你的问题，例如：隔夜菜能不能吃？" />
        <button className="rounded bg-foreground text-background px-4 py-2" type="submit">提问</button>
      </form>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {answer ? (
        <div className="space-y-2">
          <ModelBadge model={model ?? "DeepSeek"} query={q} />
          <pre className="whitespace-pre-wrap text-sm bg-black/5 dark:bg-white/10 p-3 rounded">{answer}</pre>
        </div>
      ) : null}
    </div>
  );
}

