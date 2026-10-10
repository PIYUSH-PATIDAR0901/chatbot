import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  mysql: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    connectionLimit: number;
  };
  firebase: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    serviceAccountKeyPath?: string;
    emulatorHost?: string;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root',
    database: process.env.DB_NAME || 'chat_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    serviceAccountKeyPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined,
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  },
};
