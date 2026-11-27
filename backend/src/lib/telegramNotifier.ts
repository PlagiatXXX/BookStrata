import { config } from "../config/env.js";

export interface TelegramFeedbackPayload {
  username?: string | null;
  userEmail?: string | null;
  userId?: number | null;
  rating?: string | number | null;
  message?: string | null;
  pageUrl?: string | null;
}

const RATING_MAP: Record<string, string> = {
  "1": "🙁 1 — Плохо",
  "2": "😕 2 — Не очень",
  "3": "😐 3 — Нормально",
  "4": "🙂 4 — Хорошо",
  "5": "😍 5 — Отлично",
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatFeedbackHtml(payload: TelegramFeedbackPayload): string {
  const ratingText = payload.rating != null
    ? RATING_MAP[String(payload.rating)] || escapeHtml(String(payload.rating))
    : "Не указана";

  const userParts: string[] = [];
  if (payload.username) {
    userParts.push(`@${escapeHtml(payload.username)}`);
  }
  if (payload.userEmail) {
    userParts.push(escapeHtml(payload.userEmail));
  }
  if (payload.userId) {
    userParts.push(`ID: ${payload.userId}`);
  }
  const userDisplay = userParts.length > 0 ? userParts.join(" (") + (userParts.length > 1 ? ")" : "") : "Гость";

  const messageText = payload.message?.trim()
    ? `«${escapeHtml(payload.message.trim())}»`
    : "<i>Без комментария</i>";

  const page = payload.pageUrl ? escapeHtml(payload.pageUrl) : "—";
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  return [
    `📬 <b>Новый отзыв о BookStrata</b>`,
    ``,
    `<b>Пользователь:</b> ${userDisplay}`,
    `<b>Оценка:</b> ${ratingText}`,
    `<b>Отзыв:</b> ${messageText}`,
    `<b>Страница:</b> ${page}`,
    `<b>Время:</b> ${now} (МСК)`,
  ].join("\n");
}

export async function sendTelegramFeedbackNotification(
  payload: TelegramFeedbackPayload
): Promise<boolean> {
  const token = config.TELEGRAM_BOT_TOKEN;
  const chatId = config.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const text = formatFeedbackHtml(payload);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      console.warn(`[telegramNotifier] Telegram API responded with status ${response.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[telegramNotifier] Failed to send Telegram notification:", err);
    return false;
  }
}

export interface TelegramSupportPayload {
  threadId: number;
  username?: string | null;
  userId?: number | null;
  text: string;
  isGuest?: boolean;
}

export function formatSupportMessageHtml(payload: TelegramSupportPayload): string {
  const userDisplay = payload.username
    ? `@${escapeHtml(payload.username)}${payload.userId ? ` (ID: ${payload.userId})` : ""}`
    : `Гость #${payload.threadId}`;

  const messageText = escapeHtml(payload.text.trim());
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  const adminUrl = `https://bookstrata.ru/admin/support?thread=${payload.threadId}`;

  return [
    `💬 <b>Новое сообщение в чате поддержки!</b>`,
    ``,
    `<b>От:</b> ${userDisplay}`,
    `<b>Сообщение:</b> «${messageText}»`,
    `<b>Время:</b> ${now} (МСК)`,
    ``,
    `🔗 <a href="${adminUrl}">Открыть чат в админке</a>`,
  ].join("\n");
}

export async function sendTelegramSupportNotification(
  payload: TelegramSupportPayload
): Promise<boolean> {
  const token = config.TELEGRAM_BOT_TOKEN;
  const chatId = config.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const text = formatSupportMessageHtml(payload);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      console.warn(`[telegramNotifier] Telegram API responded with status ${response.status}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[telegramNotifier] Failed to send Telegram notification:", err);
    return false;
  }
}
