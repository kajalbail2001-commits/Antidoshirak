import { Tool } from '../types';

// MODELS
// Using Qwen 2.5 Coder 32B as requested.
const DEFAULT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

interface ParsedItem {
  tool_id: string;
  count: number;
  comment?: string;
  warning?: string;
  custom_name?: string;
  custom_price?: number;
  custom_unit?: string;
}

interface Attachment {
  mimeType: string;
  data: string; // Base64
}

// Helper to merge duplicate tool entries
const deduplicateTools = (items: ParsedItem[]): ParsedItem[] => {
  const toolMap = new Map<string, ParsedItem>();

  items.forEach(item => {
    if (toolMap.has(item.tool_id)) {
      const existing = toolMap.get(item.tool_id)!;
      existing.count += item.count;

      if (item.comment) {
        if (existing.comment) {
          if (!existing.comment.includes(item.comment)) {
            existing.comment += `, ${item.comment}`;
          }
        } else {
          existing.comment = item.comment;
        }
      }

      if (item.warning) {
        if (existing.warning) {
          if (!existing.warning.includes(item.warning)) {
            existing.warning += ` | ${item.warning}`;
          }
        } else {
          existing.warning = item.warning;
        }
      }
    } else {
      toolMap.set(item.tool_id, { ...item });
    }
  });

  return Array.from(toolMap.values());
};

const makeServerlessRequest = async (systemPrompt: string, userContent: any) => {
  const endpoint = "/.netlify/functions/analyze";

  try {
    console.log(`[AI] Calling Qwen via Proxy...`);

    // CLIENT SIDE TIMEOUT: 60 Seconds
    // Note: The Netlify Free Tier serverless function might still kill it at 10s, 
    // but this ensures the browser doesn't give up first.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.details || errorData.error || `Server error: ${response.status}`;
      console.error("[AI] Server Error Detail:", errorData);

      if (response.status === 504 || response.status === 502) {
        throw new Error("Qwen думал дольше 10 секунд (Лимит сервера). Попробуйте сократить запрос.");
      }
      throw new Error(errorMessage);
    }

    return await response.json();

  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error("Browser Timeout: Ответ не получен за 60 сек.");
    }
    console.error("[AI] Request failed:", e);
    throw new Error(e.message || "AI Service Unavailable");
  }
};

export const parseBriefWithGemini = async (
  brief: string,
  availableTools: Tool[],
  _apiKey?: string, // Legacy param, ignored now
  attachment: Attachment | null = null
): Promise<ParsedItem[]> => {

  const toolsInfo = availableTools.map(t => ({
    id: t.id,
    desc: `${t.name} (${t.category})`
  }));

  // Condensed Prompt to help Qwen be faster
  const systemPrompt = `
    TASK: Map request to tools.
    TOOLS: ${JSON.stringify(toolsInfo)}
    RULES:
    1. Video=Video Gen+Audio.
    2. 1 Video Result = 4 Gens.
    3. Video Clip = 5s. (90s = 18 clips * 4 = 72 gens).
    4. Streaming/Avatar = Duration in Seconds.
    5. IF NO MATCH: Create NEW tool. Format: { "tool_id": "custom", "custom_name": "Unique Name", "custom_price": (est cost), "count": 1, "custom_unit": "generation" }.
    OUTPUT: JSON Array only. [{"tool_id": "...", "count": 1}]
  `;

  let userContent: any = brief;

  // Handle Multimodal (Images) if present
  if (attachment) {
    userContent = [
      { type: "text", text: brief || "Analyze image. List tools needed to recreate it." },
      {
        type: "image_url",
        image_url: {
          url: `data:${attachment.mimeType};base64,${attachment.data}`
        }
      }
    ];
  }

  try {
    const json = await makeServerlessRequest(systemPrompt, userContent);
    const content = json.choices?.[0]?.message?.content;

    if (!content) return [];

    // Clean up markdown
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();

    // Robust Parsing
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.warn("JSON Parse failed, attempting regex extraction", cleanJson);
      const match = cleanJson.match(/\[.*\]/s);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerE) {
          throw new Error("AI returned invalid JSON.");
        }
      } else {
        // Fallback for Python-style lists
        const pythonMatch = cleanJson.match(/\[.*\]/s);
        if (pythonMatch) {
          try {
            const jsonLike = pythonMatch[0].replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false');
            parsed = JSON.parse(jsonLike);
          } catch (pyError) {
            throw new Error("AI returned unparsable data.");
          }
        } else {
          throw new Error("AI returned no data.");
        }
      }
    }

    const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
    return deduplicateTools(rawItems as ParsedItem[]);

  } catch (error) {
    console.error("AI Parse Error:", error);
    throw error;
  }
};
