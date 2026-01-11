const FormData = require('form-data');
// Если вдруг fetch не определен (старая нода), используем встроенный
const fetch = global.fetch || require('node-fetch');

exports.handler = async function(event, context) {
  // Разрешаем браузеру стучаться к нам (CORS), чтобы не было ошибок сети
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      console.error("ОШИБКА: Нет токена бота в переменных Netlify");
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Server config error" }) };
    }

    // Парсим запрос
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { imageBase64, initData } = body;

    // Пытаемся достать ID юзера любыми способами
    let chatId;
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get("user");
      if (userStr) {
        chatId = JSON.parse(userStr).id;
      }
    } catch (e) {
      console.error("Ошибка парсинга initData", e);
    }

    if (!chatId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Не удалось определить ID пользователя. Зайдите через Telegram." }) };
    }

    // Чистим картинку
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Формируем отправку
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', buffer, { filename: 'estimate.png', contentType: 'image/png' });
    form.append('caption', 'Ваша смета 🧾');

    // Отправляем
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const tgResult = await tgResponse.json();

    if (!tgResult.ok) {
      console.error("Telegram ответил ошибкой:", tgResult);
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Telegram Error: ${tgResult.description}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown server error" })
    };
  }
};
