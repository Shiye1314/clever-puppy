type LLMProvider = "anthropic" | "deepseek";

interface LLMCallParams {
  prompt: string;
  model?: string;
  maxTokens?: number;
  provider?: LLMProvider;
  apiKey?: string;
}

export async function callLLM(params: LLMCallParams): Promise<string> {
  const provider = params.provider || "anthropic";
  const apiKey = params.apiKey || "";
  if (!apiKey) throw new Error("未配置 API Key");

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model || "claude-sonnet-4-6",
        max_tokens: params.maxTokens || 2048,
        messages: [{ role: "user", content: params.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  // DeepSeek (OpenAI-compatible)
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || "deepseek-v4-pro",
      max_tokens: params.maxTokens || 2048,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

export function extractJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("无法提取 JSON");
  return JSON.parse(match[0]);
}
