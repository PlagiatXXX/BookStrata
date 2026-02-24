import { defineConfig } from 'prisma';

export default defineConfig({
  db: {
    url: process.env.DATABASE_URL,
  },
});