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
