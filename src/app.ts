import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import { userController } from './controllers/userController';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json());

  // Logging in non-test mode
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // User management helper endpoint
  app.get('/users', (req: Request, res: Response, next) => userController.getAllUsers(req, res, next));

  // Core API routes
  app.use('/chat', chatRoutes);
  app.use('/user', userRoutes);

  // Centralized Error handling
  app.use(errorHandler);

  return app;
}
