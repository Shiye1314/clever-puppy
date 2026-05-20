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
  // 1. 先尝试从 markdown 代码块中提取
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = codeBlock?.[1]?.trim() ?? text;

  // 2. 查找最外层花括号
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1) {
    throw new Error("无法提取 JSON：LLM 返回内容不含花括号");
  }
  let jsonStr = candidate.slice(firstBrace, lastBrace >= firstBrace ? lastBrace + 1 : undefined);

  // 3. 修复未闭合括号（LLM 输出被截断）：统计并补全
  let openCount = 0;
  for (const ch of jsonStr) {
    if (ch === "{") openCount++;
    else if (ch === "}") openCount--;
  }
  while (openCount > 0) {
    jsonStr += "}";
    openCount--;
  }
  // 同理补全数组括号（如果有的话）
  let arrCount = 0;
  for (const ch of jsonStr) {
    if (ch === "[") arrCount++;
    else if (ch === "]") arrCount--;
  }
  while (arrCount > 0) {
    jsonStr += "]";
    arrCount--;
  }

  // 4. 尝试解析，失败则逐层修复常见 JSON 错误
  try {
    return JSON.parse(jsonStr);
  } catch {
    // 修复A：移除尾逗号
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    // 修复B：单引号转双引号
    jsonStr = jsonStr.replace(/'/g, "\"");
    // 修复C：字符串值内未转义的换行 → 移除（换行为 whitespace，合并行保留语义）
    jsonStr = jsonStr.replace(/\n/g, "");
    // 修复D：多余回车符
    jsonStr = jsonStr.replace(/\r/g, "");
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`无法提取 JSON：${(e as Error).message}`);
    }
  }
}
