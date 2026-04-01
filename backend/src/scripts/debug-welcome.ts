import 'dotenv/config';
import { sendWelcomeEmail } from '../modules/auth/auth.mail.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger("Debug-Welcome", { color: "cyan" });

async function test() {
  const email = process.env.SMTP_USER || "";
  logger.info(`Attempting to send Welcome Email to ${email}...`);

  try {
    await sendWelcomeEmail(email, "Тестовый Пользователь");
    logger.info("Welcome email sent successfully! Please check your inbox and SPAM folder.");
  } catch (error) {
    logger.error("Failed to send Welcome Email", { error: (error as Error).message });
  }
}

test();
