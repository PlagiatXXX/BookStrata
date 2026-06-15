/**
 * Email-уведомления об ошибках (через SendGrid Web API)
 */

import { sendEmail } from "./mailer.js";

interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  query?: string;
  origin?: string;
  timestamp: string;
}

class ErrorNotifier {
  private to: string = "";
  private isEnabled: boolean = false;
  private lastNotificationTime: number = 0;
  private readonly notificationThrottle = 5000;

  initialize(): void {
    const to = process.env.ERROR_NOTIFY_EMAIL;
    const apiKey = process.env.UNISENDER_API_KEY;

    if (!to || !apiKey || process.env.NODE_ENV !== "production") {
      console.log("[ErrorNotifier] Email-уведомления отключены (нужен UNISENDER_API_KEY + ERROR_NOTIFY_EMAIL + NODE_ENV=production)");
      return;
    }

    this.to = to;
    this.isEnabled = true;
    console.log("✅ Email-уведомления об ошибках включены");
  }

  async notify(error: ErrorReport): Promise<void> {
    if (!this.isEnabled) return;

    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationThrottle) return;
    this.lastNotificationTime = now;

    try {
      await sendEmail({
        to: this.to,
        subject: `🚨 BookStrata: ${error.message.substring(0, 80)}`,
        html: this.formatHtml(error),
      });
    } catch (err) {
      console.error("[ErrorNotifier] Ошибка отправки email:", err);
    }
  }

  private formatHtml(error: ErrorReport): string {
    const stackHtml = error.stack
      ? `<pre style="background:#1a1a2e;color:#e0e0e0;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto;">${this.escapeHtml(error.stack)}</pre>`
      : "";

    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#dc2626;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">🚨 BookStrata — ошибка в production</h2>
        </div>
        <div style="background:#1f2937;color:#f3f4f6;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#9ca3af;width:100px;">Сообщение</td>
                <td style="padding:6px 0;"><code>${this.escapeHtml(error.message)}</code></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af;">URL</td>
                <td style="padding:6px 0;"><code>${this.escapeHtml(error.url || "N/A")}</code></td></tr>
            <tr><td style="padding:6px 0;color:#9ca3af;">Метод</td>
                <td style="padding:6px 0;">${this.escapeHtml(error.method || "N/A")}</td></tr>
            ${error.query ? `<tr><td style="padding:6px 0;color:#9ca3af;">Параметры</td><td style="padding:6px 0;"><code>${this.escapeHtml(error.query)}</code></td></tr>` : ""}
            ${error.userId ? `<tr><td style="padding:6px 0;color:#9ca3af;">Пользователь</td><td style="padding:6px 0;">${this.escapeHtml(error.userId)}</td></tr>` : ""}
            ${error.userAgent ? `<tr><td style="padding:6px 0;color:#9ca3af;">Браузер</td><td style="padding:6px 0;">${this.escapeHtml(error.userAgent)}</td></tr>` : ""}
            ${error.origin ? `<tr><td style="padding:6px 0;color:#9ca3af;">Откуда</td><td style="padding:6px 0;">${this.escapeHtml(error.origin)}</td></tr>` : ""}
            <tr><td style="padding:6px 0;color:#9ca3af;">Время</td>
                <td style="padding:6px 0;">${new Date(error.timestamp).toLocaleString("ru-RU")}</td></tr>
          </table>
          ${stackHtml}
          <hr style="border-color:#374151;margin:20px 0;">
          <p style="color:#6b7280;font-size:12px;">Это письмо отправлено автоматически системой мониторинга BookStrata.</p>
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  get isInitialized(): boolean {
    return this.isEnabled;
  }
}

export const errorNotifier = new ErrorNotifier();
export type { ErrorReport };
