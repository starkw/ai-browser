const DEFAULT_BASE_URL = "https://api.getgoapi.com/v1";

const buildChatUrl = () => {
  const base = (process.env.GPT5_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  return `${base}/chat/completions`;
};

const DEFAULT_MODEL = process.env.GPT5_MODEL || "gpt-5-chat-latest";

const ensureApiKey = (provided?: string) => {
  const apiKey = provided || process.env.GPT5_API_KEY;
  if (!apiKey) throw new Error("Missing GPT5_API_KEY");
  return apiKey;
};

type GPTMessage = { role: "system" | "user" | "assistant"; content: string };
type GPTChoice = { message?: GPTMessage };
type GPTResponse = { choices?: GPTChoice[]; model?: string };

type ChatRequest = {
  messages: GPTMessage[];
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
};

const defaultChatOptions = {
  temperature: 0.2,
  maxTokens: 800,
  stream: false,
};

async function postChat(request: ChatRequest) {
  const apiKey = ensureApiKey(request.apiKey);
  const model = request.model || DEFAULT_MODEL;
  const url = buildChatUrl();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? defaultChatOptions.temperature,
      stream: request.stream ?? defaultChatOptions.stream,
      max_tokens: request.maxTokens ?? defaultChatOptions.maxTokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GPT API ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as GPTResponse;
  const output = (data?.choices?.[0]?.message?.content || "").trim();

  return { text: output, model: data?.model || model };
}

export async function askGPT(params: {
  prompt: string;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
}): Promise<{ text: string; model: string }> {
  const systemPrompt =
    params.systemPrompt ||
    "你是谨慎可靠的助手。要求：1) 内容准确、必要时给出可执行建议；2) 无法确认时明确说明不确定并给出安全做法；3) 输出为【纯文本】，不要使用任何 Markdown 或装饰字符；禁止出现 *, **, #, _, `, >, 以及表情符号；4) 列表仅使用阿拉伯数字编号（1. 2. 3.）和短横线子项（- ），不要加粗/斜体/代码块；5) 保持中文标点与换行整洁。";

  return postChat({
    apiKey: params.apiKey,
    model: params.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: params.prompt },
    ],
  });
}

export type ChatMessage = GPTMessage;

export async function chatGPT(params: {
  messages: ChatMessage[];
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): Promise<{ text: string; model: string }> {
  if (!Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error("GPT chat requires at least one message");
  }

  return postChat({
    apiKey: params.apiKey,
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    stream: params.stream,
  });
}

export type DetailMode = "brief" | "standard" | "detailed";

export type GPTSections = {
  key_points: string[];
  deep_insights: string[];
  learning_points: string[];
  action_items: string[];
  questions: string[];
};

export type GPTStructuredResponse = {
  summary: string;
  sections: GPTSections;
};

export async function analyzeWithGPT(params: {
  content: string;
  title?: string;
  url?: string;
  apiKey: string;
  model?: string;
  mode?: DetailMode;
}): Promise<GPTStructuredResponse> {
  const { content, title, url, apiKey } = params;
  const model = params.model || DEFAULT_MODEL;
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

  const instruction = `请严格按下述 JSON Schema 输出中文结果，不要解释：\n${JSON.stringify(
    schema
  )}\n约束：要点分别不超过 {kp:${limits.kp}}, {di:${limits.di}}, {lp:${limits.lp}}, {ai:${limits.ai}}, {qs:${limits.qs}} 条，每条≤30字。`;

  const userParts = [title ? `标题：${title}` : null, url ? `URL：${url}` : null, `正文：${content}`]
    .filter(Boolean)
    .join("\n");

  const response = await postChat({
    apiKey,
    model,
    maxTokens: limits.maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${instruction}\n\n${userParts}` },
    ],
  });

  if (!response.text) {
    throw new Error("GPT 返回为空");
  }

  const tryParse = (text: string): GPTStructuredResponse | null => {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj.summary === "string" && obj.sections) return obj;
      return null;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(response.text);
  if (!parsed) {
    const match = response.text.match(/\{[\s\S]*\}$/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed) {
    parsed = {
      summary: response.text.trim(),
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
