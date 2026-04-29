/**
 * Telegram уведомления об ошибках
 */

interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userId?: string;
  timestamp: string;
}

class ErrorNotifier {
  private token: string | null = null;
  private chatId: string | null = null;
  private isEnabled: boolean = false;
  private lastNotificationTime: number = 0;
  private readonly notificationThrottle = 5000;

  initialize(): void {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const enabled = process.env.TELEGRAM_NOTIFICATIONS_ENABLED === 'true';

    if (!token || !chatId || !enabled) {
      return;
    }

    this.token = token;
    this.chatId = chatId;
    this.isEnabled = true;
  }

  async notify(error: ErrorReport): Promise<void> {
    if (!this.isEnabled || !this.token || !this.chatId) return;

    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationThrottle) return;
    this.lastNotificationTime = now;

    const message = this.formatError(error);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('[ErrorNotifier] Telegram API ответил ошибкой:', response.status, text);
      }
    } catch (err) {
      console.error('[ErrorNotifier] Ошибка отправки в Telegram:', err);
    }
  }

  private formatError(error: ErrorReport): string {
    const lines = [
      '🚨 *Новая ошибка*',
      '',
      `*Сообщение:* \`${this.truncate(error.message, 150)}\``,
      `*URL:* \`${error.url || 'N/A'}\``,
      `*Метод:* \`${error.method || 'N/A'}\``,
      error.userId ? `*User ID:* \`${error.userId}\`` : null,
      '',
      `*Время:* ${new Date(error.timestamp).toLocaleString('ru-RU')}`,
      '',
      error.stack ? `*Stack:*\n\`\`\`${this.truncate(error.stack, 2000)}\`\`\`` : null,
    ].filter((line): line is string => line !== null);

    return lines.join('\n');
  }

  private truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max) + '... (обрезано)';
  }

  get isInitialized(): boolean {
    return this.isEnabled;
  }
}

export const errorNotifier = new ErrorNotifier();
export type { ErrorReport };