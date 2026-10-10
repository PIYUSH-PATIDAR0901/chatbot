import { chatRepository, ChatRepository } from '../repositories/chatRepository';
import { userRepository, UserRepository } from '../repositories/userRepository';
import { ChatWithMembers, User } from '../types';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ChatService {
  constructor(
    private chatRepo: ChatRepository = chatRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  async getOrCreateDirectChat(
    userAId: string,
    userBId: string
  ): Promise<{ chatId: string; isNew: boolean; members: User[] }> {
    if (!userAId || !userBId) {
      throw new AppError('Both userAId and userBId are required', 400);
    }

    if (userAId === userBId) {
      throw new AppError('Cannot create a direct 1:1 chat with oneself', 400);
    }

    // Verify both users exist
    const [userA, userB] = await Promise.all([
      this.userRepo.findById(userAId),
      this.userRepo.findById(userBId),
    ]);

    if (!userA) {
      throw new AppError(`User with id '${userAId}' does not exist`, 404);
    }
    if (!userB) {
      throw new AppError(`User with id '${userBId}' does not exist`, 404);
    }

    // Check if a direct chat already exists
    const existingChatId = await this.chatRepo.findDirectChatBetween(userAId, userBId);
    if (existingChatId) {
      return {
        chatId: existingChatId,
        isNew: false,
        members: [userA, userB],
      };
    }

    // Create new direct chat
    const newChatId = await this.chatRepo.createDirectChat(userAId, userBId);
    return {
      chatId: newChatId,
      isNew: true,
      members: [userA, userB],
    };
  }

  async createGroupChat(
    name: string,
    creatorId: string,
    memberIds: string[]
  ): Promise<{ chatId: string; name: string; isGroup: boolean; members: User[] }> {
    if (!name || name.trim().length === 0) {
      throw new AppError('Group name is required', 400);
    }

    const creator = await this.userRepo.findById(creatorId);
    if (!creator) {
      throw new AppError(`Creator with id '${creatorId}' does not exist`, 404);
    }

    const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));
    const users = await this.userRepo.findByIds(uniqueMemberIds);

    if (users.length !== uniqueMemberIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = uniqueMemberIds.filter((id) => !foundIds.has(id));
      throw new AppError(`The following users do not exist: ${missingIds.join(', ')}`, 404);
    }

    const chatId = await this.chatRepo.createGroupChat(name.trim(), creatorId, uniqueMemberIds);

    return {
      chatId,
      name: name.trim(),
      isGroup: true,
      members: users,
    };
  }

  async getUserChats(userId: string): Promise<ChatWithMembers[]> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(`User with id '${userId}' not found`, 404);
    }

    return this.chatRepo.getUserChats(userId);
  }

  async addMembersToGroup(chatId: string, userIds: string[]): Promise<void> {
    const chat = await this.chatRepo.getChatById(chatId);
    if (!chat) {
      throw new AppError(`Chat '${chatId}' not found`, 404);
    }

    if (!chat.isGroup) {
      throw new AppError('Cannot add members to a 1:1 chat', 400);
    }

    const users = await this.userRepo.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new AppError('One or more user IDs do not exist', 404);
    }

    await this.chatRepo.addMembers(chatId, userIds);
  }

  async removeMemberFromGroup(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepo.getChatById(chatId);
    if (!chat) {
      throw new AppError(`Chat '${chatId}' not found`, 404);
    }

    if (!chat.isGroup) {
      throw new AppError('Cannot remove members from a 1:1 chat', 400);
    }

    await this.chatRepo.removeMember(chatId, userId);
  }
}

export const chatService = new ChatService();
