import 'dotenv/config';
import { sendEmail } from '../lib/mailer.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger("Email-Test", { color: "yellow" });

async function test() {
  logger.info("Starting email configuration test...");
  logger.info("Config:", {
    from: process.env.SMTP_FROM,
    hasApiKey: !!process.env.UNISENDER_API_KEY,
  });

  const to = process.env.ERROR_NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!to) {
    logger.error("Не задан получатель (ERROR_NOTIFY_EMAIL или SMTP_USER)");
    process.exit(1);
  }

  try {
    await sendEmail({
      to,
      subject: "Тестовое письмо BookStrata Pro",
      text: "Если вы видите это письмо, значит SendGrid API настроен верно!",
      html: "<h1>Успех!</h1><p>SendGrid API работает корректно.</p>"
    });
    logger.info("Test email sent successfully! Check your inbox.");
  } catch (error) {
    logger.error("Email test failed", { error: (error as Error).message });
    process.exit(1);
  }
}

test();
