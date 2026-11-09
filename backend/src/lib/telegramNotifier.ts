import { config } from "../config/env.js";

export interface TelegramFeedbackPayload {
  username?: string | null;
  userEmail?: string | null;
  userId?: number | null;
  rating?: string | null;
  message?: string | null;
  pageUrl?: string | null;
}

const RATING_MAP: Record<string, string> = {
  great: "😍 Всё отлично",
  neutral: "🤔 Есть вопросы / идеи",
  bad: "🙁 Неудобно / сложно",
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatFeedbackHtml(payload: TelegramFeedbackPayload): string {
  const ratingText = payload.rating
    ? RATING_MAP[payload.rating] || escapeHtml(payload.rating)
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
