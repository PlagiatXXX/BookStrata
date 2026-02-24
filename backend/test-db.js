require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('Successfully connected to database!');
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Test query result:', result);
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();