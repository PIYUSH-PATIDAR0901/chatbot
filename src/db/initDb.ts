import mysql from 'mysql2/promise';
import { config } from '../config';

export async function initDatabase(): Promise<void> {
  console.log(`[Database Init] Connecting to MySQL at ${config.mysql.host}:${config.mysql.port}...`);

  // 1. Connect without specific database to ensure database exists
  const rootConn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
  });

  try {
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[Database Init] Database '${config.mysql.database}' confirmed/created.`);
  } finally {
    await rootConn.end();
  }

  // 2. Connect to the target database and create tables
  const dbConn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
  });

  try {
    // Users table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("[Database Init] Table 'users' verified.");

    // Chats table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(36) PRIMARY KEY,
        is_group BOOLEAN NOT NULL DEFAULT FALSE,
        name VARCHAR(100) NULL,
        created_by VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_group (is_group),
        CONSTRAINT fk_chats_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("[Database Init] Table 'chats' verified.");

    // Chat Members table
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS chat_members (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_chat_member (chat_id, user_id),
        INDEX idx_chat_members_chat (chat_id),
        INDEX idx_chat_members_user (user_id),
        CONSTRAINT fk_members_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("[Database Init] Table 'chat_members' verified.");

    console.log('[Database Init] Database schema initialization completed successfully.');
  } finally {
    await dbConn.end();
  }
}

// Allow direct CLI invocation
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}
