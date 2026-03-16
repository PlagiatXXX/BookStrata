/**
 * Swagger definitions для BookStrata Pro API
 * 
 * Эти определения используются для генерации OpenAPI/Swagger документации
 * Добавляйте @openapi аннотации в роуты для автоматической генерации
 */

// ========== ТИПЫ ДАННЫХ ==========

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Уникальный ID пользователя
 *         email:
 *           type: string
 *           format: email
 *           description: Email адрес
 *         username:
 *           type: string
 *           description: Имя пользователя
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: URL аватара
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Дата регистрации
 *
 *     TierList:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Уникальный ID тир-листа
 *         userId:
 *           type: integer
 *           description: ID владельца
 *         title:
 *           type: string
 *           description: Название тир-листа
 *         year:
 *           type: integer
 *           description: Год создания
 *         isTemplate:
 *           type: boolean
 *           description: Является ли шаблоном
 *         isPublic:
 *           type: boolean
 *           description: Публичный или приватный
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         tiers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Tier'
 *         unrankedBooks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Book'
 *
 *     TierListShort:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         isPublic:
 *           type: boolean
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *             avatarUrl:
 *               type: string
 *         likesCount:
 *           type: integer
 *         booksCount:
 *           type: integer
 *           description: Общее количество книг (макс. 20)
 *
 *     Tier:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         tierListId:
 *           type: integer
 *         title:
 *           type: string
 *           example: "S"
 *         color:
 *           type: string
 *           example: "#ef4444"
 *         rank:
 *           type: integer
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BookPlacement'
 *
 *     Book:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         coverImageUrl:
 *           type: string
 *           format: uri
 *         description:
 *           type: string
 *         thoughts:
 *           type: string
 *
 *     BookPlacement:
 *       type: object
 *       properties:
 *         book:
 *           $ref: '#/components/schemas/Book'
 *         tierId:
 *           type: integer
 *         rank:
 *           type: integer
 *
 *     Template:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         tiers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               color:
 *                 type: string
 *               rank:
 *                 type: integer
 *         defaultBooks:
 *           type: array
 *           items:
 *             type: object
 *         authorId:
 *           type: integer
 *         isPublic:
 *           type: boolean
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         totalItems:
 *           type: integer
 *         itemCount:
 *           type: integer
 *         itemsPerPage:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         currentPage:
 *           type: integer
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         error:
 *           type: string
 *         statusCode:
 *           type: integer
 *
 *     Success:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 */

// ========== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ==========

/**
 * @openapi
 * /api/tier-lists/{id}/books:
 *   post:
 *     summary: Добавить книги в тир-лист
 *     description: |
 *       Добавляет новые книги в тир-лист.
 *       
 *       **Важно:** Максимальное количество книг в одном тир-листе — 20.
 *       При попытке добавить больше книг вернётся ошибка 400.
 *     tags: [Tier Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID тир-листа
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               books:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     author:
 *                       type: string
 *                     coverImageUrl:
 *                       type: string
 *                       format: uri
 *                     description:
 *                       type: string
 *                     thoughts:
 *                       type: string
 *                 minItems: 1
 *                 maxItems: 20
 *             required:
 *               - books
 *     responses:
 *       200:
 *         description: Книги успешно добавлены
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   coverImageUrl:
 *                     type: string
 *       400:
 *         description: Превышен лимит книг (максимум 20)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Превышен лимит книг в тир-листе. Максимум: 20, текущее количество: 18, добавляется: 5"
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Тир-лист не найден
 */

// ========== ЛИМИТЫ И ОГРАНИЧЕНИЯ ==========

/**
 * Лимиты API:
 * - Максимум книг в тир-листе: 20 (для бесплатных пользователей)
 * - Максимум AI аватаров в день: 10
 * - Rate limiting: 100 запросов в минуту
 * - Максимальный размер загружаемого файла: 10MB
 * 
 * Pro-подписка (в разработке):
 * - Неограниченное количество книг в тир-листах
 * - Неограниченное количество AI аватаров
 * - Приоритетная поддержка
 */
