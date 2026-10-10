import { createApp } from './app';
import { config } from './config';
import { closePool, testDbConnection } from './db/connection';
import { initDatabase } from './db/initDb';
import { initializeFirebase } from './firebase';

async function bootstrap() {
  console.log(`Starting Chat Backend in [${config.nodeEnv}] mode...`);

  // 1. Initialize Firebase Admin
  try {
    initializeFirebase();
    console.log('[Firebase] Admin SDK initialized successfully.');
  } catch (firebaseErr) {
    console.warn('[Firebase] Warning during Firebase initialization:', firebaseErr);
  }

  // 2. Test MySQL connection and initialize schema if needed
  try {
    const isDbConnected = await testDbConnection();
    if (!isDbConnected) {
      console.log('[MySQL] Running initial schema setup...');
      await initDatabase();
    } else {
      console.log('[MySQL] Successfully connected to database.');
    }
  } catch (dbErr) {
    console.warn('[MySQL] Warning: Could not connect to MySQL directly during startup:', (dbErr as Error).message);
    console.warn('[MySQL] Ensure your MySQL service or Docker container is running.');
  }

  // 3. Start Express HTTP Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`🚀 Chat Backend Server running on port ${config.port}`);
    console.log(`   Healthcheck: http://localhost:${config.port}/health`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`===============================================`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await closePool();
      console.log('Database connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
