const FormData = require('form-data');

exports.handler = async function(event, context) {
  // Разрешаем только POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 1. Парсим тело запроса
    const body = JSON.parse(event.body);
    const { imageBase64, initData } = body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      console.error("Нет токена бота!");
      return { statusCode: 500, body: JSON.stringify({ error: "Server Error: No Bot Token" }) };
    }

    if (!imageBase64 || !initData) {
      return { statusCode: 400, body: JSON.stringify({ error: "Нет данных картинки или initData" }) };
    }

    // 2. Вытаскиваем ID пользователя
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    
    if (!userStr) {
      return { statusCode: 400, body: JSON.stringify({ error: "Не удалось определить пользователя. Запустите через Telegram." }) };
    }

    const userObj = JSON.parse(userStr);
    const chatId = userObj.id; 

    // 3. Конвертируем Base64 в Буфер (очищаем от префикса data:image/...)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // 4. Собираем форму
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', '🚀 Ваша смета готова!'); 
    form.append('photo', buffer, { filename: 'estimate.png', contentType: 'image/png' });

    // 5. ОТПРАВЛЯЕМ В TELEGRAM (С ФИКСОМ ЗАГОЛОВКОВ)
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
      // 👇 ВОТ ЭТОГО НЕ ХВАТАЛО! Без этого Телеграм не видит файл!
      headers: form.getHeaders() 
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error("Telegram API Error:", telegramResult);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: `Ошибка отправки в Telegram: ${telegramResult.description}` }) 
      };
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
