const FormData = require('form-data');

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { imageBase64, initData } = JSON.parse(event.body);
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server Error: No Bot Token" }) };
    }

    // 1. Вытаскиваем ID пользователя из initData (строка от Телеграма)
    // Она выглядит как "query_id=...&user=%7B%22id%22%3A123456...&auth_date=..."
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    
    if (!userStr) {
      return { statusCode: 400, body: JSON.stringify({ error: "Не удалось определить пользователя. Запустите приложение внутри Telegram." }) };
    }

    const userObj = JSON.parse(userStr);
    const chatId = userObj.id; // Шлем сообщение самому пользователю

    // 2. Превращаем Base64 обратно в картинку
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Формируем посылку для Телеграма
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', '🚀 Ваша смета готова!'); // Подпись к фото
    form.append('photo', buffer, { filename: 'estimate.png', contentType: 'image/png' });

    // 4. Отправляем
    // Используем встроенный fetch (Node 18+)
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error("Telegram API Error:", telegramResult);
      return { statusCode: 500, body: JSON.stringify({ error: "Ошибка отправки в Telegram: " + telegramResult.description }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
