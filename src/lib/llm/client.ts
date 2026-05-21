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
        system: "你是一个 JSON 生成器。只输出合法的 JSON 对象，不要输出任何解释、说明或 markdown 标记。回复必须以 { 开头、以 } 结尾。",
        messages: [{ role: "user", content: params.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content[0].text;
    if (!text || !text.trim()) throw new Error("Anthropic 返回了空内容");
    return text;
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
      messages: [
        { role: "system", content: "你是一个 JSON 生成器。只输出合法的 JSON 对象，不要输出任何解释、说明或 markdown 标记。回复必须以 { 开头、以 } 结尾。" },
        { role: "user", content: params.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices[0].message.content;
  if (!text || !text.trim()) throw new Error("DeepSeek 返回了空内容");
  return text;
}

export function extractJSON(text: string): Record<string, unknown> {
  if (!text || !text.trim()) {
    throw new Error("无法提取 JSON：LLM 返回空内容");
  }

  // 1. 先尝试从 markdown 代码块中提取
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = codeBlock?.[1]?.trim() ?? text;

  // 2. 查找最外层花括号
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1) {
    // ====== 多层兜底：LLM 没返回 JSON ======
    // 兜底1：纯文本 "key": "value" 模式提取
    const kvFallback = recoverJSONByFieldExtraction(candidate);
    if (kvFallback) return kvFallback;

    // 兜底2：常见中文 key-value 模式
    const patterns = [
      // 品牌名
      { regex: /(?:品牌名|品牌名称|品牌)[：:]\s*(.+)/i, key: "brandName" },
      { regex: /(?:brandName|brand_name|brand)[：:]\s*(.+)/i, key: "brandName" },
      // 品类名
      { regex: /(?:品类名|品类名称|品类|分类)[：:]\s*(.+)/i, key: "categoryName" },
      { regex: /(?:categoryName|category_name|category)[：:]\s*(.+)/i, key: "categoryName" },
      // 通用 JSON key (LLM 可能输出不带引号的 key)
      { regex: /brandName\s*[:：]\s*"?(.+?)"?\s*$/im, key: "brandName" },
      { regex: /categoryName\s*[:：]\s*"?(.+?)"?\s*$/im, key: "categoryName" },
    ];

    for (const { regex, key } of patterns) {
      const m = candidate.match(regex);
      if (m && m[1].trim()) {
        return { [key]: m[1].trim() };
      }
    }

    // 兜底3：响应较短（<100字），直接取首行当作品牌名/品类名
    const cleanText = candidate.trim();
    if (cleanText.length < 100 && !cleanText.includes("\n")) {
      return { brandName: cleanText };
    }

    // 兜底4：取第一行非空内容
    const firstLine = cleanText.split("\n").filter((l) => l.trim()).shift()?.trim();
    if (firstLine && firstLine.length < 60) {
      return { brandName: firstLine };
    }

    throw new Error(
      `无法提取 JSON：LLM 返回内容不含花括号，也未能匹配纯文本模式 (前100字符: "${candidate.slice(0, 100)}")`
    );
  }

  let jsonStr = candidate.slice(firstBrace, lastBrace >= firstBrace ? lastBrace + 1 : undefined);

  // 3. 修复未闭合括号
  let openCount = 0;
  for (const ch of jsonStr) {
    if (ch === "{") openCount++;
    else if (ch === "}") openCount--;
  }
  while (openCount > 0) { jsonStr += "}"; openCount--; }
  let arrCount = 0;
  for (const ch of jsonStr) {
    if (ch === "[") arrCount++;
    else if (ch === "]") arrCount--;
  }
  while (arrCount > 0) { jsonStr += "]"; arrCount--; }

  // 4. 修复未闭合字符串
  jsonStr = fixUnterminatedStrings(jsonStr);

  // 5. 尝试解析
  try {
    return JSON.parse(jsonStr);
  } catch (firstErr) {
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    jsonStr = jsonStr.replace(/\n/g, " ");
    jsonStr = jsonStr.replace(/\r/g, "");
    jsonStr = fixUnterminatedStrings(jsonStr);
    try {
      return JSON.parse(jsonStr);
    } catch (secondErr) {
      const recovered = recoverJSONByFieldExtraction(jsonStr);
      if (recovered) return recovered;
      throw new Error(
        `解析 JSON 失败：${(secondErr as Error).message} (JSON前200字符: "${jsonStr.slice(0, 200)}")`
      );
    }
  }
}

function fixUnterminatedStrings(jsonStr: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    result += ch;
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === "\\") { escapeNext = true; continue; }
    if (ch === '"') inString = !inString;
  }
  if (inString) result += '"';
  return result;
}

function recoverJSONByFieldExtraction(jsonStr: string): Record<string, unknown> | null {
  try {
    const result: Record<string, unknown> = {};
    const fieldRegex = /"(\w+)":\s*("(?:[^"\\]|\\.)*"|\[.*?\]|\{[^}]*\})/g;
    let match;
    while ((match = fieldRegex.exec(jsonStr)) !== null) {
      const key = match[1];
      let value = match[2];
      try {
        result[key] = JSON.parse(value);
      } catch {
        if (value.startsWith('"') && value.endsWith('"')) {
          result[key] = value.slice(1, -1).replace(/\\"/g, '"');
        } else {
          result[key] = value;
        }
      }
    }
    if (Object.keys(result).length > 0) return result;
  } catch { /* 兜底也失败 */ }
  return null;
}
