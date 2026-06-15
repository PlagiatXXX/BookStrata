import 'dotenv/config'
import { createLogger } from '../src/lib/logger.js'

const logger = createLogger('CheckBooks', { color: 'cyan' })

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

try {
  const books = await prisma.book.findMany({
    where: { coverImageUrl: { contains: 'res.cloudinary.com' } },
    select: { id: true, title: true, coverImageUrl: true },
  })

  logger.info(`Книг на Cloudinary: ${books.length}`)
  for (const b of books) {
    logger.info(`  id=${b.id} "${b.title}": ${b.coverImageUrl?.substring(0, 80)}`)
  }

  if (books.length === 0) {
    logger.info('Все обложки уже на новом хранилище')
  }
} finally {
  await prisma.$disconnect()
}
