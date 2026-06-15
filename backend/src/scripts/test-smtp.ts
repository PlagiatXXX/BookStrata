import 'dotenv/config';
import { sendEmail } from '../lib/mailer.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger("SMTP-Test", { color: "yellow" });

async function test() {
  logger.info("Starting SMTP configuration test...");
  logger.info("Config:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    secure: process.env.SMTP_SECURE,
    from: process.env.SMTP_FROM
  });

  try {
    await sendEmail({
      to: process.env.SMTP_USER || "", // Send to yourself
      subject: "Тестовое письмо BookStrata Pro",
      text: "Если вы видите это письмо, значит SMTP настроен верно!",
      html: "<h1>Успех!</h1><p>Ваш SMTP сервер работает корректно.</p>"
    });
    logger.info("Test email sent successfully! Check your inbox.");
  } catch (error) {
    logger.error("SMTP Test failed", { error: (error as Error).message });
    process.exit(1);
  }
}

test();
