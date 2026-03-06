/**
 * Контекстный логгер для Node.js (бэкенд)
 *
 * Использование:
 * @example
 * const authLogger = createLogger('Auth', { color: 'blue' });
 * authLogger.info('User logged in', { userId: 123 });
 */

import type { Logger, LoggerConfig, LogLevel, LoggerContext } from '../types/logger.js';

// Глобальное состояние
let globalLogLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * ANSI цвета для терминала
 */
const ANSI_COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Карта цветов для уровней логирования
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: ANSI_COLORS.gray,
  info: ANSI_COLORS.blue,
  warn: ANSI_COLORS.yellow,
  error: ANSI_COLORS.red,
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
 * Форматирование сообщения для терминала с цветом
 */
function formatMessage(
  loggerName: string,
  level: LogLevel,
  message: string,
  color?: string
): string {
  const icon = LEVEL_ICONS[level];
  const defaultColor = LEVEL_COLORS[level];
  const logColor = color ?? defaultColor;
  const timestamp = new Date().toISOString();
  
  // Формат: [2024-01-01T12:00:00.000Z] [🔍 Auth] Сообщение
  return `${ANSI_COLORS.gray}[${timestamp}]${ANSI_COLORS.reset} ${logColor}${icon} [${loggerName}]${ANSI_COLORS.reset} ${message}`;
}

/**
 * Извлечение информации из ошибки
 */
function extractError(error: unknown): { name: string; message: string; stack?: string | undefined } {
  if (error instanceof Error) {
    const result: { name: string; message: string; stack?: string | undefined } = {
      name: error.name,
      message: error.message,
    };
    if (error.stack !== undefined) {
      result.stack = error.stack;
    }
    return result;
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }

  return { name: 'UnknownError', message: String(error) };
}

/**
 * Сериализация контекста для вывода в терминал
 */
function serializeContext(context?: LoggerContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }
  
  try {
    return ANSI_COLORS.gray + JSON.stringify(context, null, 2) + ANSI_COLORS.reset;
  } catch {
    return '[Circular reference]';
  }
}

/**
 * Создание контекстного логгера
 * 
 * @param name — имя логгера (например, 'Auth', 'TierLists', 'Database')
 * @param config — конфигурация (цвет, уровень)
 * @returns Экземпляр логгера
 */
export function createLogger(name: string, config: LoggerConfig = {}): Logger {
  const {
    color: configColor,
    level: configLevel,
  } = config;
  
  // Маппинг CSS-цветов в ANSI (для совместимости с фронтенд конфигом)
  const colorMap: Record<string, string> = {
    'blue': ANSI_COLORS.blue,
    'green': ANSI_COLORS.green,
    'yellow': ANSI_COLORS.yellow,
    'red': ANSI_COLORS.red,
    'cyan': ANSI_COLORS.cyan,
    'magenta': ANSI_COLORS.magenta,
    'gray': ANSI_COLORS.gray,
  };
  
  const logColor = configColor ? (colorMap[configColor] ?? LEVEL_COLORS.info) : undefined;
  
  const logger: Logger = {
    name,
    level: configLevel ?? globalLogLevel,

    debug: (message: string, context?: LoggerContext) => {
      if (!shouldLog('debug', configLevel)) return;

      const formatted = formatMessage(name, 'debug', message, logColor);
      // eslint-disable-next-line no-console
      console.debug(formatted);
      if (context) {
        // eslint-disable-next-line no-console
        console.debug(serializeContext(context));
      }
    },

    info: (message: string, context?: LoggerContext) => {
      if (!shouldLog('info', configLevel)) return;

      const formatted = formatMessage(name, 'info', message, logColor);

      console.info(formatted);
      if (context) {
        console.info(serializeContext(context));
      }
    },

    warn: (message: string, context?: LoggerContext) => {
      if (!shouldLog('warn', configLevel)) return;

      const formatted = formatMessage(name, 'warn', message, logColor);
      // eslint-disable-next-line no-console
      console.warn(formatted);
      if (context) {
        // eslint-disable-next-line no-console
        console.warn(serializeContext(context));
      }
    },

    error: (error: Error | unknown, context?: LoggerContext) => {
      if (!shouldLog('error', configLevel)) return;

      const errorData = extractError(error);
      const formatted = formatMessage(name, 'error', errorData.message, logColor);

      // eslint-disable-next-line no-console
      console.error(formatted);

      if (errorData.stack) {
        // eslint-disable-next-line no-console
        console.error(ANSI_COLORS.gray + errorData.stack + ANSI_COLORS.reset);
      }

      if (context) {
        // eslint-disable-next-line no-console
        console.error(serializeContext(context));
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

// Ре-экспорт типов для удобства импорта
export type { Logger, LoggerConfig, LogLevel, LoggerContext } from '../types/logger.js';
