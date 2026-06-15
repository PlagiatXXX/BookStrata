/**
 * Скрипт миграции изображений с Cloudinary на текущий S3-провайдер.
 *
 * Запуск:
 *   npx tsx scripts/migrate-cloudinary-to-s3.ts
 *
 * Что делает:
 *   1. Находит все записи в БД, URL которых содержит res.cloudinary.com
 *   2. Скачивает каждое изображение с Cloudinary
 *   3. Загружает через текущий storage-провайдер (S3)
 *   4. Обновляет URL в БД
 *
 * Безопасен для повторного запуска — повторно обрабатывает только
 * те записи, URL которых всё ещё указывает на Cloudinary.
 */

import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { storage } from '../src/lib/storage/index.js'
import { createLogger } from '../src/lib/logger.js'

const logger = createLogger('MigrateCloudinary', { color: 'magenta' })

const CLOUDINARY_PATTERN = 'res.cloudinary.com'
const BATCH_SIZE = 5 // параллельных загрузок

interface MigrationTask {
  id: string | number
  url: string
  table: 'User' | 'TierList' | 'NewsArticle'
  field: string
}

async function migrateOne(task: MigrationTask): Promise<boolean> {
  try {
    const result = await storage.uploadFromUrl(task.url, 'tiermaker-pro/migrated')

    if (!result || !result.url) {
      logger.error(`✗ [${task.table}.${task.field}] id=${task.id}: uploadFromUrl не вернул URL`)
      return false
    }

    // Обновляем запись в БД
    if (task.table === 'User') {
      await prisma.user.update({
        where: { id: task.id as number },
        data: { avatarUrl: result.url },
      })
    } else if (task.table === 'TierList') {
      await prisma.tierList.update({
        where: { id: task.id as string },
        data: { coverImageUrl: result.url },
      })
    } else if (task.table === 'NewsArticle') {
      await prisma.newsArticle.update({
        where: { id: task.id as string },
        data: { imageUrl: result.url },
      })
    }

    logger.info(`✓ [${task.table}.${task.field}] id=${task.id}`)
    return true
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    logger.error(`✗ [${task.table}.${task.field}] id=${task.id}`)
    console.error('  Error details:', err)
    return false
  }
}

async function migrateAll(): Promise<void> {
  logger.info('=== Миграция изображений с Cloudinary на S3 ===')
  logger.info(`Текущий провайдер: ${process.env.STORAGE_PROVIDER || 'cloudinary'}`)

  // Собираем все задачи
  const tasks: MigrationTask[] = []

  // 1. Аватарки пользователей
  const users = await prisma.user.findMany({
    where: { avatarUrl: { contains: CLOUDINARY_PATTERN } },
    select: { id: true, avatarUrl: true },
  })
  for (const user of users) {
    if (user.avatarUrl) {
      tasks.push({ id: user.id, url: user.avatarUrl, table: 'User', field: 'avatarUrl' })
    }
  }

  // 2. Обложки тир-листов
  const tierLists = await prisma.tierList.findMany({
    where: { coverImageUrl: { contains: CLOUDINARY_PATTERN } },
    select: { id: true, coverImageUrl: true },
  })
  for (const tl of tierLists) {
    if (tl.coverImageUrl) {
      tasks.push({ id: tl.id, url: tl.coverImageUrl, table: 'TierList', field: 'coverImageUrl' })
    }
  }

  // 3. Изображения новостей
  const news = await prisma.newsArticle.findMany({
    where: { imageUrl: { contains: CLOUDINARY_PATTERN } },
    select: { id: true, imageUrl: true },
  })
  for (const article of news) {
    if (article.imageUrl) {
      tasks.push({ id: article.id, url: article.imageUrl, table: 'NewsArticle', field: 'imageUrl' })
    }
  }

  if (tasks.length === 0) {
    logger.info('Изображений на Cloudinary не найдено. Миграция не требуется.')
    await prisma.$disconnect()
    return
  }

  logger.info(`Найдено ${tasks.length} изображений для миграции:`)
  logger.info(`  Аватары пользователей: ${users.length}`)
  logger.info(`  Обложки тир-листов: ${tierLists.length}`)
  logger.info(`  Изображения новостей: ${news.length}`)

  // Обрабатываем батчами
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(tasks.length / BATCH_SIZE)
    logger.info(`Пакет ${batchNum}/${totalBatches} (${batch.length} шт.)`)

    const results = await Promise.allSettled(batch.map(migrateOne))

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        succeeded++
      } else {
        failed++
      }
    }

    logger.info(`  Прогресс: ${succeeded} успешно, ${failed} ошибок из ${tasks.length}`)
  }

  logger.info('=== Миграция завершена ===')
  logger.info(`Итого: ${succeeded} успешно, ${failed} ошибок`)

  await prisma.$disconnect()
}

migrateAll().catch((err) => {
  console.error('Критическая ошибка миграции:', err)
  process.exit(1)
})
