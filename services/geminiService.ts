import { Tool } from '../types';

// MODELS
const DEFAULT_MODEL = "qwen/qwen-2.5-coder-32b-instruct:free";

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
    // We now call our own Netlify Function instead of OpenRouter directly
    // This keeps the API KEY hidden on the server side.
    const endpoint = "/.netlify/functions/analyze";
    
    try {
        console.log(`[AI] Calling Serverless Proxy...`);
        
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
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        return await response.json();

    } catch (e: any) {
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
  
  // Handle Multimodal (Images) if present
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