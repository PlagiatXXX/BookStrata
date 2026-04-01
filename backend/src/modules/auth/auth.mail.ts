import { sendEmail } from "../../lib/mailer.js";

/**
 * HTML Template for New Password Email (Russian)
 */
const getNewPasswordTemplate = (username: string, newPassword: string) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #6366f1; }
    h1 { color: #4f46e5; margin-top: 0; }
    .password-box { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e293b; border-radius: 4px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
    .warning { color: #b91c1c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Восстановление доступа</h1>
    <p>Здравствуйте, <strong>${username}</strong>!</p>
    <p>По вашему запросу мы сгенерировали для вас новый временный пароль для доступа к BookStrata Pro.</p>
    <p>Ваш новый пароль:</p>
    <div class="password-box">${newPassword}</div>
    <p class="warning">Важно! Сразу после входа мы настоятельно рекомендуем изменить этот пароль в настройках вашего профиля.</p>
    <p>Если вы не запрашивали сброс пароля, пожалуйста, свяжитесь с поддержкой.</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BookStrata Pro. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send an email with the newly generated password
 */
export async function sendNewPasswordEmail(email: string, username: string, newPassword: string): Promise<void> {
  const html = getNewPasswordTemplate(username, newPassword);
  const text = `Здравствуйте, ${username}! Ваш новый пароль для BookStrata Pro: ${newPassword}. Пожалуйста, измените его сразу после входа.`;

  await sendEmail({
    to: email,
    subject: "Ваш новый пароль для BookStrata Pro",
    text,
    html,
  });
}

const getWelcomeTemplate = (username: string) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #10b981; }
    h1 { color: #059669; margin-top: 0; }
    .hero-img { width: 100%; border-radius: 4px; margin-bottom: 20px; }
    .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Добро пожаловать в BookStrata Pro!</h1>
    <p>Здравствуйте, <strong>${username}</strong>!</p>
    <p>Мы рады, что вы присоединились к нашему сообществу любителей книг. Теперь у вас есть доступ ко всем инструментам для создания и управления вашими книжными тир-листами.</p>
    <p>Что вы можете сделать прямо сейчас:</p>
    <ul>
      <li>Создать свой первый тир-лист с любимыми книгами</li>
      <li>Изучить коллекции других пользователей или подборки от сообщества в разделе "Новости"</li>
      <li>Настроить свой профиль и аватар</li>
    </ul>
    <p>Мы работаем на добровольных началах, поэтому Ваш любой вклад (будь то отзыв, критика, предложения по улучшению проекта, моральная и финансовая помощь) неоценима!<p> 
    <a href="${process.env.CLIENT_URL || '#'}" class="btn">Начать работу</a>
    <div class="footer">
      <p>Вы получили это письмо, потому что зарегистрировались в BookStrata Pro.</p>
      <p>© ${new Date().getFullYear()} BookStrata Pro. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  const html = getWelcomeTemplate(username);
  const text = `Добро пожаловать в BookStrata Pro, ${username}! Мы рады, что вы с нами.`;

  await sendEmail({
    to: email,
    subject: "Добро пожаловать в BookStrata Pro!",
    text,
    html,
  });
}

