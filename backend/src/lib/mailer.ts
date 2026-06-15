import { createLogger } from "./logger.js";

const logger = createLogger("Mailer", { color: "magenta" });

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

const UNISENDER_API_KEY = process.env.UNISENDER_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM || '"BookStrata Pro" <noreply@bookstrata.pro>';

/**
 * Generic function to send an email via Unisender API
 * Использует HTTPS (порт 443), поэтому не блокируется хостингом
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!UNISENDER_API_KEY) {
    logger.warn("UNISENDER_API_KEY не задан, письмо не отправлено", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    // Парсим from: вытаскиваем имя и email из формата '"Name" <email>'
    const fromMatch = FROM_EMAIL.match(/"(.*)"\s*<(.*)>/);
    const fromEmail = fromMatch?.[2] || "noreply@bookstrata.pro";
    const fromName = fromMatch?.[1] || "BookStrata Pro";

    const params: Record<string, string> = {
      api_key: UNISENDER_API_KEY,
      email: fromEmail,
      sender_name: fromName,
      subject: options.subject,
      body: options.html,
      recipients: JSON.stringify([{ email: options.to }]),
    };

    const response = await fetch("https://api.unisender.com/ru/api/sendEmail?format=json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    const data = await response.json() as { result?: { email_id: string }; error?: string; code?: string };

    if (!response.ok || data.error) {
      throw new Error(`Unisender API error: ${data.error || response.status}`);
    }

    logger.info("Email sent successfully via Unisender", {
      to: options.to,
      subject: options.subject,
      emailId: data.result?.email_id,
    });
  } catch (error) {
    logger.error("Failed to send email", {
      error: (error as Error).message,
      to: options.to,
      subject: options.subject,
    });
    throw new Error("Ошибка при отправке электронной почты");
  }
}
