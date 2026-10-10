import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { getPool, withTransaction } from '../db/connection';
import { Chat, ChatWithMembers, User } from '../types';

interface ChatRow extends RowDataPacket {
  id: string;
  isGroup: boolean | number;
  name: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMemberUserRow extends RowDataPacket {
  chat_id: string;
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export class ChatRepository {
  async findDirectChatBetween(userAId: string, userBId: string): Promise<string | null> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id
       FROM chats c
       JOIN chat_members m1 ON c.id = m1.chat_id AND m1.user_id = ?
       JOIN chat_members m2 ON c.id = m2.chat_id AND m2.user_id = ?
       WHERE c.is_group = FALSE
       LIMIT 1`,
      [userAId, userBId]
    );

    if (rows.length === 0) {
      return null;
    }

    return (rows[0] as { id: string }).id;
  }

  async createDirectChat(userAId: string, userBId: string): Promise<string> {
    const chatId = randomUUID();

    await withTransaction(async (conn) => {
      // 1. Create chat record
      await conn.query<ResultSetHeader>(
        'INSERT INTO chats (id, is_group) VALUES (?, FALSE)',
        [chatId]
      );

      // 2. Add members
      await conn.query<ResultSetHeader>(
        'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?), (?, ?)',
        [chatId, userAId, chatId, userBId]
      );
    });

    return chatId;
  }

  async createGroupChat(name: string, creatorId: string, memberIds: string[]): Promise<string> {
    const chatId = randomUUID();
    const allMembers = Array.from(new Set([creatorId, ...memberIds]));

    await withTransaction(async (conn) => {
      // 1. Create group chat
      await conn.query<ResultSetHeader>(
        'INSERT INTO chats (id, is_group, name, created_by) VALUES (?, TRUE, ?, ?)',
        [chatId, name, creatorId]
      );

      // 2. Insert members
      const values = allMembers.map((userId) => [chatId, userId]);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flatParams = values.flat();

      await conn.query<ResultSetHeader>(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ${placeholders}`,
        flatParams
      );
    });

    return chatId;
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    const pool = getPool();
    const [rows] = await pool.query<ChatRow[]>(
      `SELECT id, is_group as isGroup, name, created_by as createdBy, 
              created_at as createdAt, updated_at as updatedAt 
       FROM chats WHERE id = ?`,
      [chatId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!;
    return {
      id: row.id,
      isGroup: Boolean(row.isGroup),
      name: row.name,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getMembers(chatId: string): Promise<User[]> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email, u.created_at as createdAt
       FROM users u
       JOIN chat_members cm ON u.id = cm.user_id
       WHERE cm.chat_id = ?
       ORDER BY cm.joined_at ASC`,
      [chatId]
    );

    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      createdAt: r.createdAt as Date,
    }));
  }

  async isUserMember(chatId: string, userId: string): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1',
      [chatId, userId]
    );
    return rows.length > 0;
  }

  async addMembers(chatId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const pool = getPool();
    const values = userIds.map((userId) => [chatId, userId]);
    const placeholders = values.map(() => '(?, ?)').join(', ');
    const flatParams = values.flat();

    await pool.query(
      `INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES ${placeholders}`,
      flatParams
    );
  }

  async removeMember(chatId: string, userId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
      [chatId, userId]
    );
  }

  async getUserChats(userId: string): Promise<ChatWithMembers[]> {
    const pool = getPool();

    // 1. Fetch all chats where userId is a member
    const [chatRows] = await pool.query<ChatRow[]>(
      `SELECT c.id, c.is_group as isGroup, c.name, c.created_by as createdBy, 
              c.created_at as createdAt, c.updated_at as updatedAt
       FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = ?
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    if (chatRows.length === 0) {
      return [];
    }

    const chatIds = chatRows.map((c) => c.id);
    const placeholders = chatIds.map(() => '?').join(',');

    // 2. Fetch all members for all retrieved chats in one round trip
    const [memberRows] = await pool.query<ChatMemberUserRow[]>(
      `SELECT cm.chat_id, u.id, u.name, u.email, u.created_at as createdAt
       FROM users u
       JOIN chat_members cm ON u.id = cm.user_id
       WHERE cm.chat_id IN (${placeholders})
       ORDER BY cm.joined_at ASC`,
      chatIds
    );

    // Group members by chat_id
    const membersByChatId: Record<string, User[]> = {};
    for (const mem of memberRows) {
      if (!membersByChatId[mem.chat_id]) {
        membersByChatId[mem.chat_id] = [];
      }
      membersByChatId[mem.chat_id].push({
        id: mem.id,
        name: mem.name,
        email: mem.email,
        createdAt: mem.createdAt,
      });
    }

    return chatRows.map((c) => ({
      id: c.id,
      isGroup: Boolean(c.isGroup),
      name: c.name,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      members: membersByChatId[c.id] || [],
    }));
  }
}

export const chatRepository = new ChatRepository();
