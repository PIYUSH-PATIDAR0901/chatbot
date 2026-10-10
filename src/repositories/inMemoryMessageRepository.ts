import { randomUUID } from 'crypto';
import { ChatMessage, LastSeenRecord } from '../types';
import { IMessageRepository } from './messageRepository.interface';

export class InMemoryMessageRepository implements IMessageRepository {
  // chatId -> messages[]
  private messagesByChat: Map<string, ChatMessage[]> = new Map();
  // chatId:userId -> LastSeenRecord
  private lastSeenMap: Map<string, LastSeenRecord> = new Map();

  async sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
    const messageId = randomUUID();
    const nowIso = new Date().toISOString();

    const message: ChatMessage = {
      id: messageId,
      chatId,
      senderId,
      text,
      timestamp: nowIso,
      readBy: {
        [senderId]: nowIso,
      },
      isEdited: false,
      isDeleted: false,
    };

    const messages = this.messagesByChat.get(chatId) || [];
    messages.push(message);
    this.messagesByChat.set(chatId, messages);

    return message;
  }

  async getMessages(chatId: string, limit = 50, beforeTimestamp?: string): Promise<ChatMessage[]> {
    let messages = this.messagesByChat.get(chatId) || [];

    // Filter before timestamp if provided
    if (beforeTimestamp) {
      const beforeTime = new Date(beforeTimestamp).getTime();
      messages = messages.filter((m) => new Date(m.timestamp).getTime() < beforeTime);
    }

    // Sort ascending by timestamp
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return messages.slice(0, safeLimit);
  }

  async getMessageById(chatId: string, messageId: string): Promise<ChatMessage | null> {
    const messages = this.messagesByChat.get(chatId) || [];
    return messages.find((m) => m.id === messageId) || null;
  }

  async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; readAt: string }> {
    const messages = this.messagesByChat.get(chatId) || [];
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      throw new Error(`Message ${messageId} not found in chat ${chatId}`);
    }

    const nowIso = new Date().toISOString();
    message.readBy[userId] = nowIso;

    return {
      success: true,
      readAt: nowIso,
    };
  }

  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<LastSeenRecord> {
    const nowIso = new Date().toISOString();
    const key = `${chatId}:${userId}`;

    const record: LastSeenRecord = {
      chatId,
      userId,
      messageId,
      updatedAt: nowIso,
    };

    this.lastSeenMap.set(key, record);
    return record;
  }

  async getLastSeen(chatId: string, userId: string): Promise<LastSeenRecord | null> {
    const key = `${chatId}:${userId}`;
    return this.lastSeenMap.get(key) || null;
  }

  async editMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<ChatMessage> {
    const messages = this.messagesByChat.get(chatId) || [];
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    if (message.senderId !== senderId) {
      throw new Error('Only the original sender can edit this message');
    }

    if (message.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    message.text = newText;
    message.isEdited = true;
    message.updatedAt = new Date().toISOString();

    return message;
  }

  async deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string
  ): Promise<boolean> {
    const messages = this.messagesByChat.get(chatId) || [];
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    if (message.senderId !== senderId) {
      throw new Error('Only the original sender can delete this message');
    }

    message.text = '[This message was deleted]';
    message.isDeleted = true;
    message.updatedAt = new Date().toISOString();

    return true;
  }

  clear(): void {
    this.messagesByChat.clear();
    this.lastSeenMap.clear();
  }
}
