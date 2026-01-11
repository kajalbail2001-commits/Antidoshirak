exports.handler = async function(event, context) {
  // 1. Проверка метода
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Берем ключ
    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) {
      console.error("NO API KEY FOUND");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server Config Error: Key missing" })
      };
    }

    // 3. Парсим тело
    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { messages, model } = parsedBody;

    // 4. Запрос к OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "HTTP-Referer": "https://anti-doshirak.app",
        "X-Title": "Anti-Doshirak",
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.0-flash-exp:free",
        messages: messages,
      }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
