// backend/src/plugins/logFromFrontend.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Определяем, какие данные мы ожидаем от фронтенда
interface LogPayload {
  level: 'info' | 'warn' | 'error';
  message: string;
  [key: string]: unknown;
}

const logFromFrontend: FastifyPluginAsync = async (fastify) => {
  // Создаем роут /api/log, который будет принимать POST-запросы
  fastify.post('/api/log', {}, async (request, reply) => {
    const { level, ...logData } = request.body as LogPayload;

    // Проверяем, что уровень логирования валидный
    if (['info', 'warn', 'error'].includes(level)) {
        // Используем встроенный логгер Fastify, чтобы записать данные,
        // добавляя пометку, что лог пришел с фронтенда
        request.log[level]({ ...logData, from: 'frontend' });
    }

    // Отвечаем кодом 204 "No Content", так как нам не нужно ничего возвращать
    reply.code(204).send();
  });
};

export default fp(logFromFrontend);
