import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userRepository } from '../repositories/userRepository';
import { getRequestParam } from '../utils/params';

const createUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

export class UserController {
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createUserSchema.parse(req.body);
      const existing = await userRepository.findByEmail(parsed.email);
      if (existing) {
        res.status(409).json({ error: 'User with this email already exists', user: existing });
        return;
      }

      const user = await userRepository.create(parsed);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userRepository.getAll();
      res.status(200).json({ count: users.length, users });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getRequestParam(req, 'userId');
      const user = await userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ error: `User with id '${userId}' not found` });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
