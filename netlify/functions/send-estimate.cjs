exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body);
    const { imageBase64, initData } = body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ error: "No Bot Token" }) };

    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) return { statusCode: 400, headers, body: JSON.stringify({ error: "No User ID" }) };
    const chatId = JSON.parse(userStr).id;

    // Декодируем картинку
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Buffer.from(cleanBase64, 'base64');

    // Собираем multipart форму вручную (чтобы не было зависимостей)
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
      '🚀 Ваша смета (Anti-Doshirak)', // Текст сообщения
      dashDash + boundary,
      'Content-Disposition: form-data; name="photo"; filename="estimate.jpg"',
      'Content-Type: image/jpeg',
      '',
      ''
    ].join(crlf);

    const postDataEnd = crlf + dashDash + boundary + dashDash + crlf;
    const payload = Buffer.concat([Buffer.from(postDataStart), binaryData, Buffer.from(postDataEnd)]);

    // Отправляем (native fetch)
    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: payload
    });

    if (!tgResp.ok) {
        const err = await tgResp.text();
        console.log(err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Telegram Error" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
