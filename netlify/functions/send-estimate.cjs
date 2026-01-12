exports.handler = async function(event, context) {
  // Заголовки для CORS (чтобы фронт не ругался)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Обработка preflight запросов
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    // 1. Парсим входящие данные
    const body = JSON.parse(event.body);
    const { imageBase64, initData } = body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      console.error("No Bot Token");
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Server Config Error" }) };
    }

    // 2. Достаем ID чата из initData
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "User ID not found" }) };
    }
    const chatId = JSON.parse(userStr).id;

    // 3. Декодируем картинку
    // Убираем префикс data:image/..., если он есть
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    const binaryData = Buffer.from(cleanBase64, 'base64');

    // 4. Собираем Multipart-запрос ВРУЧНУЮ (Native Node.js)
    // Это избавляет от зависимости form-data, которая ломала билд
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const dashDash = '--';
    const crlf = '\r\n';

    const postDataStart = [
      dashDash + boundary,
      'Content-Disposition: form-data; name="chat_id"',
      '',
      String(chatId),
      dashDash + boundary,
      'Content-Disposition: form-data; name="caption"',
      '',
      '🚀 Ваша смета готова!',
      dashDash + boundary,
      'Content-Disposition: form-data; name="photo"; filename="estimate.jpg"',
      'Content-Type: image/jpeg',
      '',
      ''
    ].join(crlf);

    const postDataEnd = crlf + dashDash + boundary + dashDash + crlf;

    // Склеиваем части
    const payload = Buffer.concat([
      Buffer.from(postDataStart, 'utf8'),
      binaryData,
      Buffer.from(postDataEnd, 'utf8')
    ]);

    // 5. Отправляем используя встроенный fetch
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': payload.length.toString()
      },
      body: payload
    });

    const result = await tgResponse.json();

    if (!result.ok) {
      console.error("TG Error:", result);
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Telegram Error: ${result.description}` }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error("Function Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
