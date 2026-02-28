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
    const { pdfBase64, initData } = body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ error: "No Bot Token" }) };

    let chatId = "6590079602"; // Hardcoded Toni ID for local dev
    if (initData && initData !== "DEV_MODE") {
      const params = new URLSearchParams(initData);
      const userStr = params.get("user");
      if (userStr) chatId = JSON.parse(userStr).id;
    }

    // Декодируем картинку
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:.*,/, "");
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
      'Content-Disposition: form-data; name="document"; filename="estimate.pdf"',
      'Content-Type: application/pdf',
      '',
      ''
    ].join(crlf);

    const postDataEnd = crlf + dashDash + boundary + dashDash + crlf;
    const payload = Buffer.concat([Buffer.from(postDataStart), binaryData, Buffer.from(postDataEnd)]);

    // Отправляем (native fetch)
    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
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
