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

async function fixField(
  table: string,
  field: string,
  records: { id: number | string; url: string }[],
  updateFn: (id: number | string, newUrl: string) => Promise<void>,
): Promise<number> {
  let fixed = 0
  for (const record of records) {
    if (record.url.startsWith(OLD_PREFIX) && !record.url.startsWith(NEW_PREFIX)) {
      const newUrl = record.url.replace(OLD_PREFIX, NEW_PREFIX)
      await updateFn(record.id, newUrl)
      logger.info(`✓ [${table}.${field}] id=${record.id}: исправлен`)
      fixed++
    }
  }
  return fixed
}

async function main() {
  logger.info('=== Исправление S3 URL в БД ===')

  let total = 0

  // User.avatarUrl
  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, avatarUrl: true },
  })
  total += await fixField('User', 'avatarUrl', users as any[], async (id, url) => {
    await prisma.user.update({ where: { id: id as number }, data: { avatarUrl: url } })
  })

  // TierList.coverImageUrl
  const tierLists = await prisma.tierList.findMany({
    where: { coverImageUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, coverImageUrl: true },
  })
  total += await fixField('TierList', 'coverImageUrl', tierLists as any[], async (id, url) => {
    await prisma.tierList.update({ where: { id: id as string }, data: { coverImageUrl: url } })
  })

  // Book.coverImageUrl
  const books = await prisma.book.findMany({
    where: { coverImageUrl: { startsWith: OLD_PREFIX } },
    select: { id: true, coverImageUrl: true },
  })
  total += await fixField('Book', 'coverImageUrl', books as any[], async (id, url) => {
    await prisma.book.update({ where: { id: id as number }, data: { coverImageUrl: url } })
  })

  logger.info(`=== Исправлено URL: ${total} ===`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Ошибка:', err)
  process.exit(1)
})
