import { sendEmail } from "../../lib/mailer.js";

/**
 * Simple HTML escaping to prevent XSS/injection in emails
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * HTML Template for Password Reset Link Email (Russian)
 */
const getResetPasswordTemplate = (username: string, token: string) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const safeUsername = escapeHtml(username);

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #4f46e5; }
    h1 { color: #4f46e5; margin-top: 0; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
    .link-text { word-break: break-all; color: #64748b; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Сброс пароля</h1>
    <p>Здравствуйте, <strong>${safeUsername}</strong>!</p>
    <p>Вы получили это письмо, потому что запросили сброс пароля для вашего аккаунта BookStrata Pro.</p>
    <p>Для установки нового пароля нажмите на кнопку ниже:</p>
    <a href="${resetLink}" class="btn">Сбросить пароль</a>
    <p>Эта ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
    <p class="link-text">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>${resetLink}</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BookStrata Pro. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Send an email with the password reset link
 */
export async function sendResetPasswordEmail(email: string, username: string, token: string): Promise<void> {
  const html = getResetPasswordTemplate(username, token);
  const text = `Здравствуйте, ${username}! Для сброса пароля перейдите по ссылке: ${process.env.CLIENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Сброс пароля BookStrata Pro",
    text,
    html,
  });
}

const getWelcomeTemplate = (username: string) => {
  const safeUsername = escapeHtml(username);
  return `
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
    <p>Здравствуйте, <strong>${safeUsername}</strong>!</p>
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
};

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

const getVerifyEmailTemplate = (username: string, token: string) => {
  const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const safeUsername = escapeHtml(username);

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #4f46e5; }
    h1 { color: #4f46e5; margin-top: 0; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; }
    .link-text { word-break: break-all; color: #64748b; font-size: 12px; margin-top: 20px; }
    .note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 14px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Подтверждение email</h1>
    <p>Здравствуйте, <strong>${safeUsername}</strong>!</p>
    <p>Вы зарегистрировались в BookStrata Pro. Для активации аккаунта подтвердите ваш email:</p>
    <a href="${verifyLink}" class="btn">Подтвердить email</a>
    <p class="link-text">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:<br>${verifyLink}</p>
    <div class="note">
      <strong>Важно:</strong> без подтверждения email вам будут недоступны некоторые функции: публикация тир-листов, создание битв, написание в чат.
    </div>
    <p>Ссылка действительна в течение 24 часов.</p>
    <div class="footer">
      <p>Вы получили это письмо, потому что зарегистрировались в BookStrata Pro.</p>
      <p>© ${new Date().getFullYear()} BookStrata Pro. Все права защищены.</p>
    </div>
  </div>
</body>
</html>
`;
};

export async function sendVerifyEmail(email: string, username: string, token: string): Promise<void> {
  const html = getVerifyEmailTemplate(username, token);
  const text = `Здравствуйте, ${username}! Подтвердите ваш email: ${process.env.CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Подтверждение email — BookStrata Pro",
    text,
    html,
  });
}

