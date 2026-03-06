/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Контекст логгера — дополнительные данные для каждого сообщения
 */
export type LoggerContext = Record<string, unknown>;

/**
 * Конфигурация логгера
 */
export interface LoggerConfig {
  /** Цвет для сообщений в браузере (CSS) */
  color?: string;
  /** Минимальный уровень логирования */
  level?: LogLevel;
  /** Отправлять логи на сервер в продакшене */
  sendToServer?: boolean;
  /** URL для отправки логов (по умолчанию из config) */
  logEndpoint?: string;
}

/**
 * Интерфейс логгера
 */
export interface Logger {
  /** Лог уровня debug */
  debug: (message: string, context?: LoggerContext) => void;
  /** Лог уровня info */
  info: (message: string, context?: LoggerContext) => void;
  /** Лог уровня warn */
  warn: (message: string, context?: LoggerContext) => void;
  /** Лог уровня error */
  error: (error: Error | unknown, context?: LoggerContext) => void;
  /** Получить имя логгера */
  name: string;
  /** Получить текущий уровень логирования */
  level: LogLevel;
}

/**
 * Фабрика для создания логгеров
 */
export interface LoggerFactory {
  (name: string, config?: LoggerConfig): Logger;
}

/**
 * Данные лога для отправки на сервер
 */
export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  loggerName: string;
  message: string;
  context?: LoggerContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
