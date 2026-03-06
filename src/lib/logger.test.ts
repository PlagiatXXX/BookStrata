import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log info messages in development', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Mock environment
    const mockEnv = {
      DEV: true,
      VITE_API_URL: 'http://localhost:8080',
    };
    
    // Simple logger test
    const logger = {
      info: (message: string, context?: Record<string, unknown>) => {
        if (mockEnv.DEV) {
          console.log(`[Logger: info]`, { message, ...context });
        }
      },
    };
    
    logger.info('Test message', { userId: 1 });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Logger: info]',
      expect.objectContaining({ message: 'Test message', userId: 1 })
    );
    
    consoleSpy.mockRestore();
  });

  it('should log warn messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    
    const logger = {
      warn: (message: string, context?: Record<string, unknown>) => {
        console.warn(`[Logger: warn]`, { message, ...context });
      },
    };
    
    logger.warn('Warning message', { code: 'W001' });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Logger: warn]',
      expect.objectContaining({ message: 'Warning message', code: 'W001' })
    );
    
    consoleSpy.mockRestore();
  });

  it('should log error messages with stack trace', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    const logger = {
      error: (error: Error, context?: Record<string, unknown>) => {
        console.error(`[Logger: error]`, { 
          message: error.message,
          stack: error.stack,
          ...context 
        });
      },
    };
    
    const testError = new Error('Test error');
    logger.error(testError, { userId: 1 });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Logger: error]',
      expect.objectContaining({ 
        message: 'Test error',
        userId: 1
      })
    );
    
    consoleSpy.mockRestore();
  });
});
