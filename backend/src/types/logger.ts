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
  /** Цвет для сообщений (название или ANSI) */
  color?: string;
  /** Минимальный уровень логирования */
  level?: LogLevel;
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
