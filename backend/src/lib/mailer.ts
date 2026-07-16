import nodemailer from "nodemailer";
import { createLogger } from "./logger.js";
import { config } from "../config/env.js";

const logger = createLogger("Mailer", { color: "magenta" });

const mailConfig = {
  host: config.SMTP_HOST || "smtp.mailtrap.io",
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE === "true", // true for port 465, false for other ports
  auth: {
    user: config.SMTP_USER || "",
    pass: config.SMTP_PASS || "",
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
  const from = config.SMTP_FROM;

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
