import { Tool } from '../types';

// MODELS
// STRICTLY QWEN 3 CODER FREE as requested.
// The ':free' suffix is crucial for $0 balance accounts on OpenRouter.
const DEFAULT_MODEL = "qwen/qwen3-coder:free"; 

interface ParsedItem {
  tool_id: string;
  count: number;
  comment?: string;
  warning?: string;
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
    // Calling the Netlify function proxy
    const endpoint = "/.netlify/functions/analyze";
    
    try {
        console.log(`[AI] Calling Qwen (${DEFAULT_MODEL})...`);
        
        // Timeout controller to catch hangs before the browser defaults
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.9s hard limit (Netlify kills at 10s)

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
            
            // If it's a 502, it's likely a timeout from Netlify
            if (response.status === 502) {
                throw new Error("Time Limit Exceeded. Qwen думал слишком долго.");
            }
            throw new Error(errorMessage);
        }

        return await response.json();

    } catch (e: any) {
        if (e.name === 'AbortError') {
             throw new Error("Timeout: Qwen не успел ответить за 10 сек.");
        }
        console.error("[AI] Request failed:", e);
        throw new Error(e.message || "AI Service Unavailable");
    }
};

export const parseBriefWithGemini = async (
  brief: string,
  availableTools: Tool[],
  _apiKey?: string, // Legacy
  attachment: Attachment | null = null
): Promise<ParsedItem[]> => {
  
  // Minimalist tool list to save tokens
  const toolsInfo = availableTools.map(t => ({
    id: t.id,
    desc: `${t.name} (${t.category})`
  }));

  // ULTRA-SHORT PROMPT to save generation time and avoid 502 Timeouts
  const systemPrompt = `
    TASK: Map request to tools.
    TOOLS: ${JSON.stringify(toolsInfo)}
    RULES:
    1. Video=Video Gen+Audio.
    2. 1 Video Result = 4 Gens.
    3. Video Clip = 5s. (90s = 18 clips * 4 = 72 gens).
    4. Streaming/Avatar = Duration in Seconds.
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