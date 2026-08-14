// Vitest setup file — выполняется до импорта всех тестовых файлов
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.JWT_SECRET = "test-secret-key";
process.env.GOOGLE_BOOKS_API_KEY = "test-google-books-api-key";
process.env.POLLINATIONS_API_KEY = "test-pollinations-key";
// Юнит-тесты не должны зависеть от S3: локальное хранилище без внешних env
process.env.STORAGE_PROVIDER = "local";
// Детерминизм: исключения аналитики не должны тянуться из .env разработчика
process.env.ANALYTICS_EXCLUDE_USERNAMES = "";
