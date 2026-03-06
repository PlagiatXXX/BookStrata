# Контекстный логгер — Документация

## Обзор

Система контекстного логирования для TierMaker Pro обеспечивает изолированное логирование по модулям/компонентам с цветовой маркировкой и фильтрацией.

---

## Быстрый старт

### Frontend (React)

```typescript
import { createLogger } from '@/lib/logger';

// Создание логгера для компонента
const authLogger = createLogger('Auth', { color: 'blue' });

// Использование
authLogger.info('User logged in', { userId: 123 });
authLogger.warn('Token expiring soon', { expiresAt: '2024-03-07' });
authLogger.error(new Error('Auth failed'), { attempt: 3 });
```

### Backend (Node.js)

```typescript
import { createLogger } from '../../lib/logger.js';

// Создание логгера для сервиса
const authLogger = createLogger('Auth', { color: 'blue' });

// Использование
authLogger.info('User logged in', { userId: 123 });
authLogger.error('Auth failed', { attempt: 3 });
```

---

## API

### createLogger(name, config)

Создаёт экземпляр логгера.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `name` | `string` | Имя логгера (например, `'Auth'`, `'TierEditor'`, `'API'`) |
| `config` | `LoggerConfig` | Конфигурация (опционально) |

**LoggerConfig:**

```typescript
interface LoggerConfig {
  /** Цвет для сообщений (CSS для браузера, название для Node.js) */
  color?: string;
  /** Минимальный уровень логирования */
  level?: LogLevel;
  /** Отправлять логи на сервер в продакшене (только frontend) */
  sendToServer?: boolean;
  /** URL для отправки логов (только frontend) */
  logEndpoint?: string;
}
```

**Возвращает:** `Logger`

---

### Logger

Экземпляр логгера с методами для разных уровней.

#### Методы

##### debug(message, context?)

Лог уровня debug — отладочная информация.

```typescript
logger.debug('Request started', { url: '/api/users', method: 'GET' });
```

##### info(message, context?)

Лог уровня info — информационные сообщения.

```typescript
logger.info('User created', { userId: 123, email: 'user@example.com' });
```

##### warn(message, context?)

Лог уровня warn — предупреждения.

```typescript
logger.warn('Rate limit approaching', { current: 90, limit: 100 });
```

##### error(error, context?)

Лог уровня error — ошибки. Принимает `Error` или любой другой тип.

```typescript
logger.error(new Error('Network error'), { endpoint: '/api/users' });
logger.error('String error message', { code: 'ECONNREFUSED' });
logger.error({ custom: 'error object' }, { additional: 'context' });
```

#### Свойства

##### name

Имя логгера.

```typescript
console.log(logger.name); // 'Auth'
```

##### level

Текущий уровень логирования.

```typescript
console.log(logger.level); // 'debug'
```

---

## Уровни логирования

| Уровень | Описание | Когда использовать |
|---------|----------|-------------------|
| `debug` | Отладочная информация | Детали запросов, временные метки, внутренние состояния |
| `info` | Информационные сообщения | Успешные операции, важные события |
| `warn` | Предупреждения | Потенциальные проблемы, деградация функциональности |
| `error` | Ошибки | Исключения, сбои операций |

---

## Цвета

### Frontend (CSS)

```typescript
createLogger('Auth', { color: 'blue' });
createLogger('TierLists', { color: '#3b82f6' }); // Любой CSS цвет
```

**Рекомендуемые цвета для модулей:**

| Модуль | Цвет |
|--------|------|
| Auth | `blue` |
| TierLists | `cyan` |
| Templates | `magenta` |
| Books | `green` |
| Avatars | `yellow` |
| API | `blue` |
| UI | `gray` |

### Backend (ANSI)

```typescript
createLogger('Auth', { color: 'blue' });
```

**Поддерживаемые цвета:** `blue`, `green`, `yellow`, `red`, `cyan`, `magenta`, `gray`

---

## Глобальные настройки (Frontend)

### setGlobalLogLevel(level)

Устанавливает глобальный уровень логирования для всех новых логгеров.

```typescript
import { setGlobalLogLevel } from '@/lib/logger';

setGlobalLogLevel('warn'); // Только warn и error
```

### setGlobalSendToServer(enabled)

Включает/отключает отправку логов на сервер.

```typescript
import { setGlobalSendToServer } from '@/lib/logger';

setGlobalSendToServer(true); // Включить отправку
```

### setGlobalLogEndpoint(endpoint)

Устанавливает URL для отправки логов.

```typescript
import { setGlobalLogEndpoint } from '@/lib/logger';

setGlobalLogEndpoint('https://api.example.com/log');
```

---

## Фильтрация логов в DevTools

### Chrome/Edge DevTools

1. Откройте Console в DevTools
2. В фильтре введите: `context:Auth`
3. увидите только логи от логгера `'Auth'`

### По уровню

- `level:error` — только ошибки
- `level:warn` — предупреждения и ошибки
- `level:info` — info, warn, error
- `level:debug` — все логи

---

## Примеры использования

### React компонент

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('Dashboard', { color: 'blue' });

export function DashboardPage() {
  const { data, error, isLoading } = useTierLists();
  
  useEffect(() => {
    if (error) {
      logger.error('Failed to load tier lists', error);
    }
  }, [error]);
  
  useEffect(() => {
    logger.info('Dashboard mounted', { tierListsCount: data?.length });
  }, []);
  
  // ...
}
```

### API hook

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('Templates', { color: 'magenta' });

export const useCreateTemplate = () => {
  return useMutation({
    mutationFn: async (data) => {
      logger.debug('Создание шаблона: входные данные', { data });
      
      const response = await api.post('/templates', data);
      logger.info('Шаблон создан', { id: response.id, title: response.title });
      
      return response;
    },
    onError: (error) => {
      logger.error('Не удалось создать шаблон', error);
    }
  });
};
```

### Backend сервис

```typescript
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('TierLists', { color: 'cyan' });

export async function getUserTierLists(userId: number) {
  logger.debug('Запрос тир-листов', { userId });
  
  const startTime = Date.now();
  const tierLists = await prisma.tierList.findMany({ ... });
  
  const totalTime = Date.now() - startTime;
  logger.debug('Тир-листы получены', { 
    count: tierLists.length, 
    timeMs: totalTime 
  });
  
  return tierLists;
}
```

---

## Отправка логов на сервер (Frontend)

В продакшене логи автоматически отправляются на бэкенд через `navigator.sendBeacon()`.

### Бэкенд эндпоинт

```typescript
// backend/src/modules/log/log.route.ts
fastify.post('/log', async (request) => {
  const log = request.body as LogPayload;
  
  // Сохранение в базу данных или отправка в систему мониторинга
  await saveLog(log);
  
  return { success: true };
});
```

### Формат лога

```typescript
interface LogPayload {
  timestamp: string;        // ISO 8601
  level: LogLevel;
  loggerName: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

---

## Лучшие практики

### ✅ Делайте

- Создавайте логгер на уровне модуля/компонента
- Используйте осмысленные имена: `'Auth'`, `'TierEditor'`, а не `'logger1'`
- Добавляйте контекст с полезными данными
- Используйте соответствующие уровни (debug для отладки, error для ошибок)

### ❌ Не делайте

- Не логируйте чувствительные данные (пароли, токены)
- Не используйте `console.log()` напрямую в коде приложения
- Не логируйте в циклах без необходимости
- Не игнорируйте ошибки в catch-блоках без логирования

---

## Миграция с console.log

### До

```typescript
console.log('User logged in', user);
console.error('Auth failed', error);
```

### После

```typescript
const logger = createLogger('Auth', { color: 'blue' });

logger.info('User logged in', { userId: user.id, email: user.email });
logger.error('Auth failed', error);
```

---

## Тестирование

### Моки в тестах

```typescript
import { createLogger } from '@/lib/logger';

// В тестах создавайте логгеры как обычно
const logger = createLogger('Test', { level: 'debug' });

// Мокайте console методы если нужно проверить вызовы
console.debug = vi.fn();
logger.debug('Test message');
expect(console.debug).toHaveBeenCalled();
```

---

## Производительность

- Логгер добавляет минимальные накладные расходы
- В продакшене используется `sendBeacon()` для асинхронной отправки
- Фильтрация по уровню происходит до форматирования сообщения

---

## Поддержка браузеров

| Браузер | Поддержка |
|---------|-----------|
| Chrome/Edge | ✅ Полная (с console.context) |
| Firefox | ✅ Полная (без console.context) |
| Safari | ✅ Полная (без console.context) |

---

## См. также

- [Logger типы](../src/types/logger.ts)
- [Frontend реализация](../src/lib/logger.ts)
- [Backend реализация](../backend/src/lib/logger.ts)
- [Тесты](../src/lib/logger.spec.ts)
