import { ChatMessage, LastSeenRecord } from '../types';

export interface IMessageRepository {
  sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage>;
  getMessages(chatId: string, limit?: number, beforeTimestamp?: string): Promise<ChatMessage[]>;
  getMessageById(chatId: string, messageId: string): Promise<ChatMessage | null>;
  markMessageRead(chatId: string, messageId: string, userId: string): Promise<{ success: boolean; readAt: string }>;
  updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeenRecord>;
  getLastSeen(chatId: string, userId: string): Promise<LastSeenRecord | null>;
  editMessage(chatId: string, messageId: string, senderId: string, newText: string): Promise<ChatMessage>;
  deleteMessage(chatId: string, messageId: string, senderId: string): Promise<boolean>;
}
