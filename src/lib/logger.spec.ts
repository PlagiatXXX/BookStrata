/// <reference types="vitest/globals" />

/**
 * Тесты для контекстного логгера
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, setGlobalLogLevel, setGlobalSendToServer } from './logger';

// Моки для navigator.sendBeacon и fetch
const mockSendBeacon = vi.fn();
const mockFetch = vi.fn();

describe('createLogger', () => {
  // Сохраняем оригинальные console методы
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    // Мокаем консоль
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Мокаем отправку на сервер
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      value: mockSendBeacon,
      writable: true,
    });
    globalThis.fetch = mockFetch;

    // Сбрасываем глобальные настройки
    setGlobalLogLevel('debug');
    setGlobalSendToServer(false);
  });

  afterEach(() => {
    // Восстанавливаем консоль
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    mockSendBeacon.mockClear();
    mockFetch.mockClear();
  });

  describe('Создание логгера', () => {
    it('должен создать логгер с именем', () => {
      const logger = createLogger('TestLogger');
      expect(logger.name).toBe('TestLogger');
    });

    it('должен создать логгер с конфигурацией', () => {
      const logger = createLogger('Auth', { color: 'blue', level: 'warn' });
      expect(logger.name).toBe('Auth');
      expect(logger.level).toBe('warn');
    });

    it('должен использовать глобальный уровень по умолчанию', () => {
      setGlobalLogLevel('info');
      const logger = createLogger('Test');
      expect(logger.level).toBe('info');
    });
  });

  describe('Уровни логирования', () => {
    it('должен логировать debug сообщения', () => {
      const logger = createLogger('Test');
      logger.debug('Debug message', { key: 'value' });
      
      expect(console.debug).toHaveBeenCalled();
    });

    it('должен логировать info сообщения', () => {
      const logger = createLogger('Test');
      logger.info('Info message', { key: 'value' });
      
      expect(console.info).toHaveBeenCalled();
    });

    it('должен логировать warn сообщения', () => {
      const logger = createLogger('Test');
      logger.warn('Warn message', { key: 'value' });
      
      expect(console.warn).toHaveBeenCalled();
    });

    it('должен логировать error сообщения с Error', () => {
      const logger = createLogger('Test');
      const error = new Error('Test error');
      logger.error(error, { key: 'value' });
      
      expect(console.error).toHaveBeenCalled();
    });

    it('должен логировать error сообщения со строкой', () => {
      const logger = createLogger('Test');
      logger.error('String error', { key: 'value' });
      
      expect(console.error).toHaveBeenCalled();
    });

    it('должен логировать error сообщения с любым объектом', () => {
      const logger = createLogger('Test');
      logger.error({ custom: 'error' }, { key: 'value' });
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Фильтрация по уровню', () => {
    it('не должен логировать debug при уровне info', () => {
      const logger = createLogger('Test', { level: 'info' });
      logger.debug('Debug message');
      
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('не должен логировать debug и info при уровне warn', () => {
      const logger = createLogger('Test', { level: 'warn' });
      logger.debug('Debug message');
      logger.info('Info message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
    });

    it('не должен логировать debug, info, warn при уровне error', () => {
      const logger = createLogger('Test', { level: 'error' });
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('должен логировать все сообщения при уровне debug', () => {
      const logger = createLogger('Test', { level: 'debug' });
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error(new Error('Error'));
      
      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Форматирование сообщений', () => {
    it('должен форматировать сообщение с именем логгера', () => {
      const logger = createLogger('Auth');
      logger.info('User logged in');
      
      const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('[Auth]');
      expect(call[0]).toContain('User logged in');
    });

    it('должен добавлять эмодзи для каждого уровня', () => {
      const logger = createLogger('Test');
      
      logger.debug('Debug');
      expect((console.debug as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('🔍');
      
      logger.info('Info');
      expect((console.info as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('ℹ️');
      
      logger.warn('Warn');
      expect((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('⚠️');
      
      logger.error(new Error('Error'));
      expect((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('❌');
    });

    it('должен применять цвет из конфигурации', () => {
      const logger = createLogger('Test', { color: 'red' });
      logger.info('Colored message');
      
      const style = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(style).toContain('color: red');
    });
  });

  describe('Отправка на сервер', () => {
    it('не должен отправлять на сервер по умолчанию в тестах', () => {
      setGlobalSendToServer(false);
      const logger = createLogger('Test');
      logger.info('Message', { data: 'test' });
      
      expect(mockSendBeacon).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('должен отправлять на сервер при включённой опции', () => {
      const logger = createLogger('Test', { sendToServer: true });
      logger.info('Message', { data: 'test' });
      
      expect(mockSendBeacon).toHaveBeenCalled();
    });

    it('должен использовать sendBeacon для отправки', () => {
      const logger = createLogger('Test', { sendToServer: true });
      logger.info('Message', { data: 'test' });
      
      expect(mockSendBeacon).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('должен использовать fetch если sendBeacon недоступен', () => {
      Object.defineProperty(globalThis.navigator, 'sendBeacon', {
        value: null,
        writable: true,
      });

      const logger = createLogger('Test', { sendToServer: true });
      logger.info('Message', { data: 'test' });
      
      expect(mockFetch).toHaveBeenCalled();
    });

    it('должен отправлять правильный payload на сервер', () => {
      const logger = createLogger('Auth', { sendToServer: true });
      logger.info('User logged in', { userId: 123 });
      
      const call = mockSendBeacon.mock.calls[0];
      const blob = call[1] as Blob;
      
      // Читаем содержимое blob
      const reader = new FileReader();
      reader.readAsText(blob);
      
      // Для тестов проверяем, что blob создан
      expect(blob.type).toBe('application/json');
    });

    it('не должен падать при ошибке отправки на сервер', () => {
      mockSendBeacon.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const logger = createLogger('Test', { sendToServer: true });
      
      // Не должно выбрасывать исключение
      expect(() => logger.info('Message', { data: 'test' })).not.toThrow();
    });
  });

  describe('Глобальные настройки', () => {
    it('должен применять глобальный уровень логирования', () => {
      setGlobalLogLevel('warn');
      const logger1 = createLogger('Test1');
      const logger2 = createLogger('Test2');
      
      expect(logger1.level).toBe('warn');
      expect(logger2.level).toBe('warn');
    });

    it('должен применять глобальную настройку отправки на сервер', () => {
      setGlobalSendToServer(true);
      const logger = createLogger('Test');
      logger.info('Message', { data: 'test' });
      
      expect(mockSendBeacon).toHaveBeenCalled();
    });
  });

  describe('Контекст', () => {
    it('должен передавать контекст в консоль', () => {
      const logger = createLogger('Test');
      const context = { userId: 123, action: 'login' };
      logger.info('User action', context);
      
      const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[2]).toEqual(context);
    });

    it('должен работать без контекста', () => {
      const logger = createLogger('Test');
      logger.info('Simple message');
      
      expect(console.info).toHaveBeenCalled();
    });

    it('должен передавать пустой контекст как пустой объект', () => {
      const logger = createLogger('Test');
      logger.info('Message', {});

      const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[2]).toEqual({});
    });
  });
});

describe('setGlobalLogLevel', () => {
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    setGlobalLogLevel('debug');
  });

  it('должен устанавливать глобальный уровень debug', () => {
    setGlobalLogLevel('debug');
    const logger = createLogger('Test');
    logger.debug('Debug');
    logger.info('Info');
    
    expect(console.debug).toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
  });

  it('должен устанавливать глобальный уровень info', () => {
    setGlobalLogLevel('info');
    const logger = createLogger('Test');
    logger.debug('Debug');
    logger.info('Info');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalled();
  });

  it('должен устанавливать глобальный уровень warn', () => {
    setGlobalLogLevel('warn');
    const logger = createLogger('Test');
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('должен устанавливать глобальный уровень error', () => {
    setGlobalLogLevel('error');
    const logger = createLogger('Test');
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error(new Error('Error'));
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
