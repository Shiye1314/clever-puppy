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

  // 4. 修复未闭合字符串（LLM 在字符串值中间被截断）
  jsonStr = fixUnterminatedStrings(jsonStr);

  // 5. 尝试解析，失败则逐层修复常见 JSON 错误
  try {
    return JSON.parse(jsonStr);
  } catch (firstErr) {
    // 修复A：移除尾逗号
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    // 修复B：字符串值内未转义的换行 → 用空格替换
    jsonStr = jsonStr.replace(/\n/g, " ");
    // 修复C：多余回车符
    jsonStr = jsonStr.replace(/\r/g, "");
    // 再试一次未闭合字符串修复（换行替换后可能暴露新问题）
    jsonStr = fixUnterminatedStrings(jsonStr);
    try {
      return JSON.parse(jsonStr);
    } catch (secondErr) {
      // 最终手段：用正则逐个提取字段值，构建新对象
      const recovered = recoverJSONByFieldExtraction(jsonStr);
      if (recovered) return recovered;
      throw new Error(`无法提取 JSON：${(secondErr as Error).message}`);
    }
  }
}

// 修复未闭合的字符串：在最后一个未闭合的引号后补上闭合引号
function fixUnterminatedStrings(jsonStr: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    result += ch;

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\") {
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
    }
  }

  if (inString) result += '"';
  return result;
}

// 最终兜底：按字段逐个提取，不依赖完整 JSON 解析
function recoverJSONByFieldExtraction(jsonStr: string): Record<string, unknown> | null {
  try {
    const result: Record<string, unknown> = {};
    // 匹配 "key": "value" 或 "key": [...] 或 "key": {...} 模式
    const fieldRegex = /"(\w+)":\s*("(?:[^"\\]|\\.)*"|\[.*?\]|\{[^}]*\})/g;
    let match;
    while ((match = fieldRegex.exec(jsonStr)) !== null) {
      const key = match[1];
      let value = match[2];
      try {
        // 是 JSON 结构值（数组/对象）
        result[key] = JSON.parse(value);
      } catch {
        // 是字符串，去掉首尾引号
        if (value.startsWith('"') && value.endsWith('"')) {
          result[key] = value.slice(1, -1).replace(/\\"/g, '"');
        } else {
          result[key] = value;
        }
      }
    }
    if (Object.keys(result).length > 0) return result;
  } catch {
    // 兜底也失败
  }
  return null;
}
