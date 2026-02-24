/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify';
import { register, login, validateToken } from './auth.service.js';
import { 
  registerSchema, 
  loginSchema, 
  validateSchema,
  RegisterInput,
  LoginInput,
  ValidateInput,
  AuthTokenPayload
} from './auth.schema.js';

function isAuthTokenPayload(payload: any): payload is AuthTokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'username' in payload
  );
}


export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post<{ Body: RegisterInput }>('/register',
    { schema: registerSchema },
    async (request, reply) => {
      try {
        const result = await register(request.body);
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes('уже зарегистрирован')) {
          fastify.log.warn({ username: request.body.username, email: request.body.email }, error.message);
          return reply.code(409).send({ error: error.message });
        }
        fastify.log.error(error, 'Unexpected error during registration');
        throw error; // Для других ошибок Fastify вернет 500
      }
  });

  // POST /api/auth/login
  fastify.post<{ Body: LoginInput }>(
    '/login',
    { schema: loginSchema },
    async (request, reply) => {
      try {
        const result = await login(request.body);
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Неверное имя пользователя или пароль')) {
          fastify.log.warn({ username: request.body.username }, 'Failed login attempt');
          return reply.code(401).send({ error: error.message });
        }
        fastify.log.error(error, 'Unexpected error during login');
        throw error;
      }
    }
  );

  // POST /api/auth/validate
  fastify.post<{ Body: ValidateInput }>(
    '/validate', 
    { schema: validateSchema }, // <-- Схема для валидации токена
    async (request, reply) => {
      try {
        const payload = validateToken(request.body.token);

        // <-- ШАГ 2: Проверяем структуру payload
        if (isAuthTokenPayload(payload)) {
          return reply.code(200).send({ 
            valid: true, 
            userId: payload.userId, 
            username: payload.username 
          });
        } else {
          throw new Error('Invalid token payload structure');
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        return reply.code(401).send({ error: 'Invalid or expired token', valid: false });
      }
    }
  );
}