const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function askDeepSeek(params: {
  prompt: string;
  apiKey?: string;
  model?: string;
}): Promise<{ text: string; model: string }> {
  const apiKey = params.apiKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");
  const model = params.model || process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是谨慎可靠的助手。要求：1) 内容准确、必要时给出可执行建议；2) 无法确认时明确说明不确定并给出安全做法；3) 输出为【纯文本】，不要使用任何 Markdown 或装饰字符；禁止出现 *, **, #, _, `, >, 以及表情符号；4) 列表仅使用阿拉伯数字编号（1. 2. 3.）和短横线子项（- ），不要加粗/斜体/代码块；5) 保持中文标点与换行整洁。",
        },
        { role: "user", content: params.prompt },
      ],
      temperature: 0.2,
      stream: false,
      max_tokens: 800,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`DeepSeek API ${res.status}: ${t || res.statusText}`);
  }
  type DSMessage = { content?: string };
  type DSChoice = { message?: DSMessage };
  type DSResponse = { choices?: DSChoice[]; model?: string };
  const data = (await res.json()) as DSResponse;
  const output = (data?.choices?.[0]?.message?.content || "").trim();
  return { text: output, model: data?.model || model };
}

// 旧摘要能力已移除

export type DetailMode = "brief" | "standard" | "detailed";

export type DeepSeekSections = {
  key_points: string[];
  deep_insights: string[];
  learning_points: string[];
  action_items: string[];
  questions: string[];
};

export type DeepSeekStructuredResponse = {
  summary: string;
  sections: DeepSeekSections;
};

export async function analyzeWithDeepSeek(params: {
  content: string;
  title?: string;
  url?: string;
  apiKey: string;
  model?: string;
  mode?: DetailMode;
}): Promise<DeepSeekStructuredResponse> {
  const { content, title, url, apiKey } = params;
  const model = params.model || process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const mode: DetailMode = params.mode || "standard";

  const limits =
    mode === "brief"
      ? { kp: 4, di: 2, lp: 3, ai: 3, qs: 3, maxTokens: 400 }
      : mode === "detailed"
      ? { kp: 8, di: 6, lp: 6, ai: 6, qs: 6, maxTokens: 1200 }
      : { kp: 6, di: 4, lp: 5, ai: 5, qs: 4, maxTokens: 800 };

  const system =
    "你是资深信息分析师，请用中文输出结构化要点，内容准确、可执行、避免空话。只输出 JSON，不要任何额外文本。";
  const schema = {
    summary: "string",
    sections: {
      key_points: "string[]",
      deep_insights: "string[]",
      learning_points: "string[]",
      action_items: "string[]",
      questions: "string[]",
    },
  };

  const instruction = `请严格按下述 JSON Schema 输出中文结果，不要解释：\\n${JSON.stringify(
    schema
  )}\\n约束：要点分别不超过 {kp:${limits.kp}}, {di:${limits.di}}, {lp:${limits.lp}}, {ai:${limits.ai}}, {qs:${limits.qs}} 条，每条≤30字。`;

  const userParts = [title ? `标题：${title}` : null, url ? `URL：${url}` : null, `正文：${content}`]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${instruction}\n\n${userParts}` },
      ],
      temperature: 0.2,
      stream: false,
      max_tokens: limits.maxTokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek API ${res.status}: ${text || res.statusText}`);
  }

  type DSMessage = { content?: string };
  type DSChoice = { message?: DSMessage };
  type DSResponse = { choices?: DSChoice[] };
  const data = (await res.json()) as DSResponse;
  const output: string | undefined = data?.choices?.[0]?.message?.content;
  if (!output) throw new Error("DeepSeek 返回为空");

  // 解析为 JSON
  const tryParse = (text: string): DeepSeekStructuredResponse | null => {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj.summary === "string" && obj.sections) return obj;
      return null;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(output);
  if (!parsed) {
    const match = output.match(/\{[\s\S]*\}$/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed) {
    // 兜底：将整段输出塞到 summary，其他为空
    parsed = {
      summary: output.trim(),
      sections: {
        key_points: [],
        deep_insights: [],
        learning_points: [],
        action_items: [],
        questions: [],
      },
    };
  }
  return parsed;
}

