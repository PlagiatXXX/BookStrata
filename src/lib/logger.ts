/**
 * Контекстный логгер для браузера
 *
 * Использование:
 * @example
 * const authLogger = createLogger('Auth', { color: 'blue' });
 * authLogger.info('User logged in', { userId: 123 });
 */

import { API_BASE_URL } from './config';
import type { Logger, LoggerConfig, LogLevel, LoggerContext, LogPayload } from '@/types/logger';

// Глобальное состояние для управления логированием
const isDev = import.meta.env.DEV === true;
let globalLogLevel: LogLevel = isDev ? 'debug' : 'info';
let globalSendToServer = !isDev;
let globalLogEndpoint = `${API_BASE_URL}/log`;

/**
 * Карта цветов для уровней логирования (CSS)
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#6b7280',    // gray-500
  info: '#3b82f6',     // blue-500
  warn: '#f59e0b',     // amber-500
  error: '#ef4444',    // red-500
};

/**
 * Эмодзи для уровней логирования
 */
const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
};

/**
 * Проверка, должен ли лог быть показан berdasarkan уровня
 */
function shouldLog(messageLevel: LogLevel, configLevel?: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const minLevel = configLevel ?? globalLogLevel;
  return levels.indexOf(messageLevel) >= levels.indexOf(minLevel);
}

/**
 * Форматирование сообщения для консоли с цветом
 */
function formatMessage(
  loggerName: string,
  level: LogLevel,
  message: string,
  color?: string
): [string, ...string[]] {
  const icon = LEVEL_ICONS[level];
  const defaultColor = LEVEL_COLORS[level];
  const logColor = color ?? defaultColor;
  
  // Формат: [🔍 Auth] Сообщение
  const formatted = `%c${icon} [${loggerName}] ${message}`;
  const style = `color: ${logColor}; font-weight: 600;`;
  
  return [formatted, style];
}

/**
 * Отправка лога на сервер
 */
async function sendLogToServer(payload: LogPayload): Promise<void> {
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    // Используем sendBeacon для надёжной отправки (работает даже при закрытии страницы)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(globalLogEndpoint, blob);
    } else {
      // Fallback для старых браузеров
      await fetch(globalLogEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
  } catch (error) {
    // Тихая ошибка — чтобы не зациклить логирование
    console.error('[Logger] Failed to send log to server:', error);
  }
}

/**
 * Извлечение информации из ошибки
 */
function extractError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }
  
  return { name: 'UnknownError', message: String(error) };
}

/**
 * Создание контекстного логгера
 * 
 * @param name — имя логгера (например, 'Auth', 'TierEditor', 'API')
 * @param config — конфигурация (цвет, уровень, отправка на сервер)
 * @returns Экземпляр логгера
 */
export function createLogger(name: string, config: LoggerConfig = {}): Logger {
  const {
    color,
    level: configLevel,
    sendToServer = globalSendToServer,
    logEndpoint,
  } = config;
  
  if (logEndpoint) {
    globalLogEndpoint = logEndpoint;
  }
  
  const logger: Logger = {
    name,
    level: configLevel ?? globalLogLevel,

    debug: (message: string, context?: LoggerContext) => {
      if (!shouldLog('debug', configLevel)) return;

      const [formatted, style] = formatMessage(name, 'debug', message, color);
      console.debug(formatted, style, context ?? '');

      if (sendToServer && context) {
        sendLogToServer({
          timestamp: new Date().toISOString(),
          level: 'debug',
          loggerName: name,
          message,
          context,
        });
      }
    },

    info: (message: string, context?: LoggerContext) => {
      if (!shouldLog('info', configLevel)) return;

      const [formatted, style] = formatMessage(name, 'info', message, color);
      console.info(formatted, style, context ?? '');

      if (sendToServer && context) {
        sendLogToServer({
          timestamp: new Date().toISOString(),
          level: 'info',
          loggerName: name,
          message,
          context,
        });
      }
    },

    warn: (message: string, context?: LoggerContext) => {
      if (!shouldLog('warn', configLevel)) return;

      const [formatted, style] = formatMessage(name, 'warn', message, color);
      console.warn(formatted, style, context ?? '');

      if (sendToServer) {
        sendLogToServer({
          timestamp: new Date().toISOString(),
          level: 'warn',
          loggerName: name,
          message,
          context,
        });
      }
    },

    error: (error: Error | unknown, context?: LoggerContext) => {
      if (!shouldLog('error', configLevel)) return;

      const errorData = extractError(error);
      const [formatted, style] = formatMessage(name, 'error', errorData.message, color);

      console.error(formatted, style, errorData.stack ?? '', context ?? '');

      if (sendToServer) {
        sendLogToServer({
          timestamp: new Date().toISOString(),
          level: 'error',
          loggerName: name,
          message: errorData.message,
          error: errorData,
          context,
        });
      }
    },
  };
  
  return logger;
}

/**
 * Глобальная настройка уровня логирования
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

/**
 * Глобальное включение/отключение отправки на сервер
 */
export function setGlobalSendToServer(enabled: boolean): void {
  globalSendToServer = enabled;
}

/**
 * Глобальная настройка URL для логов
 */
export function setGlobalLogEndpoint(endpoint: string): void {
  globalLogEndpoint = endpoint;
}

// Экспортируем createLogger как фабрику
export { createLogger as createLoggerFactory };

/**
 * Legacy logger для обратной совместимости
 * @deprecated Используйте createLogger('Module', { color: 'blue' }) вместо logger.info()
 */
export const logger = {
  info: (message: string, context?: LoggerContext) => {
    const legacyLogger = createLogger('Legacy');
    legacyLogger.info(message, context);
  },
  warn: (message: string, context?: LoggerContext) => {
    const legacyLogger = createLogger('Legacy');
    legacyLogger.warn(message, context);
  },
  error: (error: Error | unknown, context?: LoggerContext) => {
    const legacyLogger = createLogger('Legacy');
    legacyLogger.error(error, context);
  },
  debug: (message: string, context?: LoggerContext) => {
    const legacyLogger = createLogger('Legacy');
    legacyLogger.debug(message, context);
  },
};

export default logger;
