import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chatService';
import { getRequestParam } from '../utils/params';

const createChatSchema = z.object({
  userAId: z.string().min(1, 'userAId cannot be empty'),
  userBId: z.string().min(1, 'userBId cannot be empty'),
});

const createGroupChatSchema = z.object({
  name: z.string().min(1, 'Group name cannot be empty'),
  creatorId: z.string().min(1, 'creatorId is required'),
  memberIds: z.array(z.string().min(1)).min(1, 'At least one memberId is required'),
});

const addMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one userId is required'),
});

export class ChatController {
  // POST /chat/create
  async createOrGetDirectChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createChatSchema.parse(req.body);
      const result = await chatService.getOrCreateDirectChat(parsed.userAId, parsed.userBId);

      res.status(result.isNew ? 201 : 200).json({
        chatId: result.chatId,
        isNew: result.isNew,
        members: result.members,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /chat/group/create (Bonus)
  async createGroupChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createGroupChatSchema.parse(req.body);
      const result = await chatService.createGroupChat(parsed.name, parsed.creatorId, parsed.memberIds);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /user/:userId/chats
  async getUserChats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getRequestParam(req, 'userId');
      if (!userId) {
        res.status(400).json({ error: 'userId parameter is required' });
        return;
      }

      const chats = await chatService.getUserChats(userId);
      res.status(200).json({
        userId,
        count: chats.length,
        chats,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /chat/:chatId/members (Bonus)
  async addMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const parsed = addMembersSchema.parse(req.body);

      await chatService.addMembersToGroup(chatId, parsed.userIds);
      res.status(200).json({
        message: 'Members added successfully',
        chatId,
        addedUserIds: parsed.userIds,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /chat/:chatId/members/:userId (Bonus)
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chatId = getRequestParam(req, 'chatId');
      const userId = getRequestParam(req, 'userId');

      await chatService.removeMemberFromGroup(chatId, userId);
      res.status(200).json({
        message: 'Member removed successfully',
        chatId,
        removedUserId: userId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
