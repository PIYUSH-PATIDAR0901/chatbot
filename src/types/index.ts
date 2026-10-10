export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
}

export interface Chat {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChatMember {
  id: number;
  chatId: string;
  userId: string;
  joinedAt: Date | string;
}

export interface ChatWithMembers extends Chat {
  members: User[];
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO-8601 string
  readBy: Record<string, string>; // { [userId]: ISO-8601 timestamp string }
  isEdited?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface LastSeenRecord {
  chatId: string;
  userId: string;
  messageId: string;
  updatedAt: string; // ISO-8601 string
}

// DTOs for API requests & responses
export interface CreateChatDto {
  userAId: string;
  userBId: string;
}

export interface CreateGroupChatDto {
  name: string;
  creatorId: string;
  memberIds: string[];
}

export interface SendMessageDto {
  senderId: string;
  text: string;
}

export interface MarkReadDto {
  userId: string;
}

export interface UpdateLastSeenDto {
  userId: string;
  messageId: string;
}

export interface EditMessageDto {
  senderId: string;
  text: string;
}

export interface DeleteMessageDto {
  senderId: string;
}

export interface CreateUserDto {
  id?: string;
  name: string;
  email: string;
}
