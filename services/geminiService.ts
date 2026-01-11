
import { Tool } from '../types';

// ⚠️ WARNING: There is no money on this key. Hackers, please do not break it. It is for a free demo.
const OPENROUTER_API_KEY = "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";

// STRICTLY SET SINGLE MODEL AS REQUESTED
const MODELS = [
  "qwen/qwen3-coder:free"
];

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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeOpenRouterRequest = async (systemPrompt: string, userContent: any) => {
    const modelId = MODELS[0]; // Only one model allowed now
    const MAX_RETRIES = 5; // Aggressive retries for free tier
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`[AI] Attempt ${attempt + 1}/${MAX_RETRIES} with model: ${modelId}`);
            
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Anti-Doshirak App",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: modelId,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userContent }
                ],
                temperature: 0.1, 
                top_p: 0.1
              })
            });

            if (response.ok) {
                return response;
            } else {
                const errText = await response.text();
                const status = response.status;
                
                // If Rate Limit (429) or Server Error (5xx), wait and retry
                if (status === 429 || status >= 500) {
                    const delay = 2000 * Math.pow(2, attempt) + (Math.random() * 1000); // Exponential backoff + jitter
                    console.warn(`[AI] Rate limited or Error (${status}). Retrying in ${Math.round(delay)}ms...`);
                    await wait(delay);
                    lastError = new Error(`Model ${modelId} Error ${status}: ${errText}`);
                    continue;
                }
                
                // For other errors (400, 401), fail immediately
                throw new Error(`Model ${modelId} Fatal Error ${status}: ${errText}`);
            }

        } catch (e) {
            console.warn(`[AI] Network error on attempt ${attempt + 1}:`, e);
            lastError = e;
            const delay = 2000 * Math.pow(2, attempt);
            await wait(delay);
        }
    }

    throw lastError || new Error("AI service is currently unavailable after multiple attempts.");
};

export const parseBriefWithGemini = async (
  brief: string,
  availableTools: Tool[],
  _apiKey?: string,
  attachment: Attachment | null = null
): Promise<ParsedItem[]> => {
  
  const toolsInfo = availableTools.map(t => ({
    id: t.id,
    name: t.name,
    unit: t.unit,
    description: `Category: ${t.category}. Unit: ${t.unit}. Cost: ${t.lightning_price} lightning/unit.`
  }));

  const systemPrompt = `
    ROLE: PESSIMISTIC AI PRODUCER. 
    TASK: DECONSTRUCT request into AI tool operations.
    
    TOOLS: ${JSON.stringify(toolsInfo)}

    RULES:
    1. BREAKDOWN: Video = 'video' tool + 'audio' tool.
    
    2. MATH (GENERATORS - Image/Video/Song):
       - User wants "1 result" -> Estimate 4 ATTEMPTS.
       - Formula: (Target Items) * 4 = Count.
       - FOR VIDEO CLIPS: 1 clip = 5 seconds.
       - EXAMPLE: "1.5 minute video" = 90 seconds. 
         90s / 5s = 18 clips.
         18 clips * 4 attempts = 72 generations.
    
    3. MATH (STREAMING - Avatar/LipSync):
       - User wants "Duration" -> Count = SECONDS.
       - DO NOT MULTIPLY SECONDS.
    
    EXAMPLE: "15s video" -> 3 clips (5s each) * 4 attempts = 12 'video_runway_gen3'.
    EXAMPLE: "15s avatar" -> 15 'avatar_heygen'.
    
    OUTPUT: JSON Array ONLY. Format: [{"tool_id": "string", "count": number, "comment": "string"}]
    IMPORTANT: Return raw JSON only. Do not wrap in markdown code blocks.
  `;

  let userContent: any = brief;
  
  if (attachment) {
    userContent = [
      { type: "text", text: brief || "Analyze this image/screenshot and break down the AI production components required to recreate or produce it." },
      { 
        type: "image_url", 
        image_url: { 
          url: `data:${attachment.mimeType};base64,${attachment.data}` 
        } 
      }
    ];
  }

  try {
    const response = await makeOpenRouterRequest(systemPrompt, userContent);

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) return [];
    
    // Clean up markdown
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Robust Parsing
    let parsed;
    try {
        parsed = JSON.parse(cleanJson);
    } catch (e) {
        console.warn("JSON Parse failed, attempting to extract array via Regex", cleanJson);
        const match = cleanJson.match(/\[.*\]/s);
        if (match) {
            try {
                parsed = JSON.parse(match[0]);
            } catch (innerE) {
                throw new Error("Failed to parse extracted JSON array.");
            }
        } else {
             // Fallback for Qwen Coder sometimes outputting Python list syntax
             const pythonMatch = cleanJson.match(/\[.*\]/s);
             if (pythonMatch) {
                 try {
                     // Very naive python list parser (replace ' with ")
                     const jsonLike = pythonMatch[0].replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false');
                     parsed = JSON.parse(jsonLike);
                 } catch (pyError) {
                    throw new Error("Could not parse AI response as JSON.");
                 }
             } else {
                throw new Error("Could not parse AI response as JSON.");
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
