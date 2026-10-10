import { chatRepository, ChatRepository } from '../repositories/chatRepository';
import { getMessageRepository } from '../repositories/messageRepository';
import { IMessageRepository } from '../repositories/messageRepository.interface';
import { userRepository, UserRepository } from '../repositories/userRepository';
import { ChatMessage, LastSeenRecord } from '../types';
import { AppError } from './chatService';

export class MessageService {
  constructor(
    private chatRepo: ChatRepository = chatRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  private get messageRepo(): IMessageRepository {
    return getMessageRepository();
  }

  private async assertChatExists(chatId: string) {
    const chat = await this.chatRepo.getChatById(chatId);
    if (!chat) {
      throw new AppError(`Chat with id '${chatId}' not found`, 404);
    }
    return chat;
  }

  private async assertUserInChat(chatId: string, userId: string) {
    const isMember = await this.chatRepo.isUserMember(chatId, userId);
    if (!isMember) {
      throw new AppError(`User '${userId}' is not a member of chat '${chatId}'`, 403);
    }
  }

  async sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
    if (!text || text.trim().length === 0) {
      throw new AppError('Message text cannot be empty', 400);
    }

    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, senderId);

    const message = await this.messageRepo.sendMessage(chatId, senderId, text.trim());
    return message;
  }

  async getMessages(
    chatId: string,
    limit = 50,
    beforeTimestamp?: string
  ): Promise<ChatMessage[]> {
    await this.assertChatExists(chatId);

    const messages = await this.messageRepo.getMessages(chatId, limit, beforeTimestamp);
    return messages;
  }

  async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; readAt: string; messageId: string; userId: string }> {
    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, userId);

    const result = await this.messageRepo.markMessageRead(chatId, messageId, userId);
    return {
      success: result.success,
      readAt: result.readAt,
      messageId,
      userId,
    };
  }

  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<LastSeenRecord> {
    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, userId);

    // Verify message exists in this chat
    const message = await this.messageRepo.getMessageById(chatId, messageId);
    if (!message) {
      throw new AppError(`Message '${messageId}' not found in chat '${chatId}'`, 404);
    }

    const record = await this.messageRepo.updateLastSeen(chatId, userId, messageId);
    return record;
  }

  async getLastSeen(chatId: string, userId: string): Promise<LastSeenRecord | null> {
    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, userId);

    return this.messageRepo.getLastSeen(chatId, userId);
  }

  async editMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<ChatMessage> {
    if (!newText || newText.trim().length === 0) {
      throw new AppError('New message text cannot be empty', 400);
    }

    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, senderId);

    return this.messageRepo.editMessage(chatId, messageId, senderId, newText.trim());
  }

  async deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string
  ): Promise<{ success: boolean; messageId: string }> {
    await this.assertChatExists(chatId);
    await this.assertUserInChat(chatId, senderId);

    const success = await this.messageRepo.deleteMessage(chatId, messageId, senderId);
    return { success, messageId };
  }
}

export const messageService = new MessageService();
