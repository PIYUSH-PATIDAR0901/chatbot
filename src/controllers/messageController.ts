import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { messageService } from '../services/messageService';
import { getRequestParam } from '../utils/params';

const sendMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId cannot be empty'),
  text: z.string().min(1, 'text cannot be empty'),
});

const markReadSchema = z.object({
  userId: z.string().min(1, 'userId cannot be empty'),
});

const updateLastSeenSchema = z.object({
  userId: z.string().min(1, 'userId cannot be empty'),
  messageId: z.string().min(1, 'messageId cannot be empty'),
});

const editMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId cannot be empty'),
  text: z.string().min(1, 'text cannot be empty'),
});

const deleteMessageSchema = z.object({
  senderId: z.string().min(1, 'senderId cannot be empty'),
});

export class MessageController {
  // POST /chat/:chatId/message/send
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const parsed = sendMessageSchema.parse(req.body);

      const message = await messageService.sendMessage(chatId, parsed.senderId, parsed.text);
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  // GET /chat/:chatId/messages?limit=50
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = req.query.before as string | undefined;

      const messages = await messageService.getMessages(chatId, limit, before);
      res.status(200).json({
        chatId,
        count: messages.length,
        limit,
        messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /chat/:chatId/message/:messageId/read
  async markMessageRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const messageId = getRequestParam(req, 'messageId');
      const parsed = markReadSchema.parse(req.body);

      const result = await messageService.markMessageRead(chatId, messageId, parsed.userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /chat/:chatId/lastseen
  async updateLastSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const parsed = updateLastSeenSchema.parse(req.body);

      const result = await messageService.updateLastSeen(chatId, parsed.userId, parsed.messageId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /chat/:chatId/lastseen/:userId
  async getLastSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const userId = getRequestParam(req, 'userId');
      const result = await messageService.getLastSeen(chatId, userId);

      if (!result) {
        res.status(404).json({ error: `No last seen record found for user ${userId} in chat ${chatId}` });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /chat/:chatId/message/:messageId (Bonus)
  async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const messageId = getRequestParam(req, 'messageId');
      const parsed = editMessageSchema.parse(req.body);

      const updated = await messageService.editMessage(
        chatId,
        messageId,
        parsed.senderId,
        parsed.text
      );
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /chat/:chatId/message/:messageId (Bonus)
  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const messageId = getRequestParam(req, 'messageId');
      const senderId = (req.body.senderId || req.query.senderId) as string;
      const parsed = deleteMessageSchema.parse({ senderId });

      const result = await messageService.deleteMessage(chatId, messageId, parsed.senderId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();
