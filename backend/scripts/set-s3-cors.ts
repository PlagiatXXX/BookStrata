/**
 * Устанавливает CORS-политику на S3-бакет для аватарок и изображений.
 *
 * Запуск из backend/:
 *   npx tsx scripts/set-s3-cors.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'

// Загружаем .env
const envPath = resolve(import.meta.dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
  if (!process.env[key]) {
    process.env[key] = value
  }
}

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru'
const S3_REGION = process.env.S3_REGION || 'ru-1'
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ''
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ''
const S3_BUCKET = process.env.S3_BUCKET || 'bookstrata'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://bookstrata.ru',
  'https://www.bookstrata.ru',
]

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
})

async function main() {
  console.log('Setting CORS policy on bucket:', S3_BUCKET)
  console.log('Allowed origins:', ALLOWED_ORIGINS)

  const command = new PutBucketCorsCommand({
    Bucket: S3_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ALLOWED_ORIGINS,
          AllowedMethods: ['GET', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })

  try {
    await client.send(command)
    console.log('✅ CORS policy applied successfully')
  } catch (err) {
    console.error('❌ Failed to set CORS policy:', err)
    process.exit(1)
  }
}

main()
