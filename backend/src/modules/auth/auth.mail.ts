import { sendEmail } from "../../lib/mailer.js";
import { config } from "../../config/env.js";

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
  const resetLink = `${config.CLIENT_URL}/reset-password?token=${token}`;
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
  const text = `Здравствуйте, ${username}! Для сброса пароля перейдите по ссылке: ${config.CLIENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Сброс пароля BookStrata Pro",
    text,
    html,
  });
}



