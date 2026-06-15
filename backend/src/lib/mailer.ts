import nodemailer from "nodemailer";
import { createLogger } from "./logger.js";

const logger = createLogger("Mailer", { color: "magenta" });

const mailConfig = {
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525"),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  pool: true, // Use pooled connections
  maxConnections: 5,
  maxMessages: 100,
};

const transporter = nodemailer.createTransport(mailConfig);

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error("SMTP connection error", { error: error.message });
  } else {
    logger.info("SMTP server is ready to take our messages");
  }
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Generic function to send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const from = process.env.SMTP_FROM || '"BookStrata Pro" <noreply@bookstrata.pro>';

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info("Email sent successfully", {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
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
