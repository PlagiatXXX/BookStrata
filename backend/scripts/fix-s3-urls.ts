/**
 * Исправляет S3 URL в БД — добавляет имя бакета в путь.
 *
 * После перехода на Timeweb S3 URL формировались без имени бакета:
 *   https://s3.twcstorage.ru/tiermaker-pro/...
 * Исправляем на:
 *   https://s3.twcstorage.ru/bookstrata/tiermaker-pro/...
 *
 * Запуск:
 *   npx tsx scripts/fix-s3-urls.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createLogger } from '../src/lib/logger.js'

const logger = createLogger('FixS3Urls', { color: 'cyan' })

const prisma = new PrismaClient()

const OLD_PREFIX = 'https://s3.twcstorage.ru/'
const BUCKET = process.env.S3_BUCKET || 'bookstrata'
const NEW_PREFIX = `https://s3.twcstorage.ru/${BUCKET}/`

async function main() {
  logger.info('=== Исправление S3 URL в БД ===')

  let total = 0

  // User.avatarUrl
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, avatarUrl: true },
  })
  for (const u of users) {
    if (u.avatarUrl && u.avatarUrl.startsWith(OLD_PREFIX) && !u.avatarUrl.startsWith(NEW_PREFIX)) {
      const newUrl = u.avatarUrl.replace(OLD_PREFIX, NEW_PREFIX)
      await prisma.user.update({ where: { id: u.id }, data: { avatarUrl: newUrl } })
      logger.info(`✓ [User.avatarUrl] id=${u.id}`)
      total++
    }
  }

  // TierList.coverImageUrl
  const tierLists = await prisma.tierList.findMany({
    where: { coverImageUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, coverImageUrl: true },
  })
  for (const tl of tierLists) {
    if (tl.coverImageUrl && tl.coverImageUrl.startsWith(OLD_PREFIX) && !tl.coverImageUrl.startsWith(NEW_PREFIX)) {
      const newUrl = tl.coverImageUrl.replace(OLD_PREFIX, NEW_PREFIX)
      await prisma.tierList.update({ where: { id: tl.id }, data: { coverImageUrl: newUrl } })
      logger.info(`✓ [TierList.coverImageUrl] id=${tl.id}`)
      total++
    }
  }

  // Book.coverImageUrl
  const books = await prisma.book.findMany({
    where: { coverImageUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, coverImageUrl: true },
  })
  for (const b of books) {
    if (b.coverImageUrl && b.coverImageUrl.startsWith(OLD_PREFIX) && !b.coverImageUrl.startsWith(NEW_PREFIX)) {
      const newUrl = b.coverImageUrl.replace(OLD_PREFIX, NEW_PREFIX)
      await prisma.book.update({ where: { id: b.id }, data: { coverImageUrl: newUrl } })
      logger.info(`✓ [Book.coverImageUrl] id=${b.id}`)
      total++
    }
  }

  logger.info(`=== Исправлено URL: ${total} ===`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Ошибка:', err)
  process.exit(1)
})
