// src/lib/logger.ts
import { API_BASE_URL } from './config';

// Получаем URL бэкенда из переменной окружения
const LOG_ENDPOINT = `${API_BASE_URL}/log`;

// Функция, которая решает, куда отправить лог
const sendLog = (level: 'info' | 'warn' | 'error', payload: Record<string, unknown>) => {
  // Если мы в режиме разработки, просто выводим в консоль браузера
  if (import.meta.env.DEV) {
    console[level === 'info' ? 'log' : level](`[Logger: ${level}]`, payload);
    return;
  }

  // В продакшене отправляем лог на бэкенд
  const blob = new Blob([JSON.stringify({ level, ...payload })], { type: 'application/json' });
  navigator.sendBeacon(LOG_ENDPOINT, blob);
};

// Наш главный объект логгера, который мы будем использовать в приложении
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    sendLog('info', { message, ...context });
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    sendLog('warn', { message, ...context });
  },
  // Для ошибок извлекаем максимум полезной информации
  error: (error: Error, context?: Record<string, unknown>) => {
    sendLog('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  },
};
