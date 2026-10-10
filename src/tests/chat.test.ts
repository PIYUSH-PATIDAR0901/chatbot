import request from 'supertest';
import { createApp } from '../app';
import { userRepository } from '../repositories/userRepository';
import { chatRepository } from '../repositories/chatRepository';
import { setMessageRepository } from '../repositories/messageRepository';
import { InMemoryMessageRepository } from '../repositories/inMemoryMessageRepository';
import { User } from '../types';

describe('Chat Backend API Suite', () => {
  const app = createApp();
  let inMemoryMessages: InMemoryMessageRepository;

  // In-memory relational state for tests
  const mockUsers: Map<string, User> = new Map();
  const mockChats: Map<string, { id: string; isGroup: boolean; name: string | null; createdBy: string | null; createdAt: Date; updatedAt: Date }> = new Map();
  const mockMembers: Map<string, Set<string>> = new Map(); // chatId -> Set of userIds

  beforeAll(() => {
    inMemoryMessages = new InMemoryMessageRepository();
    setMessageRepository(inMemoryMessages);

    // Mock UserRepository methods
    jest.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      return mockUsers.get(id) || null;
    });

    jest.spyOn(userRepository, 'findByIds').mockImplementation(async (ids: string[]) => {
      return ids.map((id) => mockUsers.get(id)).filter((u): u is User => Boolean(u));
    });

    jest.spyOn(userRepository, 'findByEmail').mockImplementation(async (email: string) => {
      for (const u of mockUsers.values()) {
        if (u.email === email) return u;
      }
      return null;
    });

    jest.spyOn(userRepository, 'create').mockImplementation(async (dto) => {
      const user: User = {
        id: dto.id || `user_${Date.now()}_${Math.random()}`,
        name: dto.name,
        email: dto.email,
        createdAt: new Date(),
      };
      mockUsers.set(user.id, user);
      return user;
    });

    jest.spyOn(userRepository, 'getAll').mockImplementation(async () => {
      return Array.from(mockUsers.values());
    });

    // Mock ChatRepository methods
    jest.spyOn(chatRepository, 'findDirectChatBetween').mockImplementation(async (uA: string, uB: string) => {
      for (const [chatId, members] of mockMembers.entries()) {
        const chat = mockChats.get(chatId);
        if (chat && !chat.isGroup && members.has(uA) && members.has(uB) && members.size === 2) {
          return chatId;
        }
      }
      return null;
    });

    jest.spyOn(chatRepository, 'createDirectChat').mockImplementation(async (uA: string, uB: string) => {
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      mockChats.set(chatId, {
        id: chatId,
        isGroup: false,
        name: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockMembers.set(chatId, new Set([uA, uB]));
      return chatId;
    });

    jest.spyOn(chatRepository, 'createGroupChat').mockImplementation(async (name: string, creatorId: string, memberIds: string[]) => {
      const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      mockChats.set(chatId, {
        id: chatId,
        isGroup: true,
        name,
        createdBy: creatorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockMembers.set(chatId, new Set([creatorId, ...memberIds]));
      return chatId;
    });

    jest.spyOn(chatRepository, 'getChatById').mockImplementation(async (chatId: string) => {
      return mockChats.get(chatId) || null;
    });

    jest.spyOn(chatRepository, 'isUserMember').mockImplementation(async (chatId: string, userId: string) => {
      const members = mockMembers.get(chatId);
      return Boolean(members && members.has(userId));
    });

    jest.spyOn(chatRepository, 'getUserChats').mockImplementation(async (userId: string) => {
      const result = [];
      for (const [chatId, members] of mockMembers.entries()) {
        if (members.has(userId)) {
          const chat = mockChats.get(chatId)!;
          const memberUsers = Array.from(members).map((mId) => mockUsers.get(mId)!).filter(Boolean);
          result.push({
            ...chat,
            members: memberUsers,
          });
        }
      }
      return result;
    });

    jest.spyOn(chatRepository, 'addMembers').mockImplementation(async (chatId: string, userIds: string[]) => {
      const members = mockMembers.get(chatId);
      if (members) {
        userIds.forEach((id) => members.add(id));
      }
    });

    jest.spyOn(chatRepository, 'removeMember').mockImplementation(async (chatId: string, userId: string) => {
      const members = mockMembers.get(chatId);
      if (members) {
        members.delete(userId);
      }
    });
  });

  beforeEach(() => {
    mockUsers.clear();
    mockChats.clear();
    mockMembers.clear();
    inMemoryMessages.clear();

    // Pre-populate Alice and Bob
    mockUsers.set('user_alice', { id: 'user_alice', name: 'Alice', email: 'alice@test.com', createdAt: new Date() });
    mockUsers.set('user_bob', { id: 'user_bob', name: 'Bob', email: 'bob@test.com', createdAt: new Date() });
    mockUsers.set('user_charlie', { id: 'user_charlie', name: 'Charlie', email: 'charlie@test.com', createdAt: new Date() });
  });

  describe('Health Check', () => {
    it('GET /health returns 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('1. Create or Get Chat (POST /chat/create)', () => {
    it('creates a new 1:1 chat between user_alice and user_bob', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('chatId');
      expect(res.body.isNew).toBe(true);
      expect(res.body.members).toHaveLength(2);
    });

    it('returns existing chat on duplicate request (idempotent)', async () => {
      const first = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });

      const second = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_bob', userBId: 'user_alice' });

      expect(second.status).toBe(200);
      expect(second.body.chatId).toBe(first.body.chatId);
      expect(second.body.isNew).toBe(false);
    });

    it('rejects chat creation if user does not exist', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'non_existent_user' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('does not exist');
    });

    it('rejects creating chat with oneself', async () => {
      const res = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_alice' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('oneself');
    });
  });

  describe('2. Send Message (POST /chat/:chatId/message/send)', () => {
    let chatId: string;

    beforeEach(async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      chatId = chatRes.body.chatId;
    });

    it('allows a member to send a message', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Hello Bob!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.chatId).toBe(chatId);
      expect(res.body.senderId).toBe('user_alice');
      expect(res.body.text).toBe('Hello Bob!');
      expect(res.body.readBy).toHaveProperty('user_alice');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('forbids a non-member from sending a message', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_charlie', text: 'Hey guys, let me in!' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not a member');
    });

    it('rejects empty message text', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: '   ' });

      expect(res.status).toBe(400);
    });
  });

  describe('3. Get Messages (GET /chat/:chatId/messages?limit=50)', () => {
    let chatId: string;

    beforeEach(async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      chatId = chatRes.body.chatId;

      await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Message 1' });
      await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_bob', text: 'Message 2' });
    });

    it('fetches messages ordered by timestamp', async () => {
      const res = await request(app).get(`/chat/${chatId}/messages?limit=50`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.messages[0].text).toBe('Message 1');
      expect(res.body.messages[1].text).toBe('Message 2');
    });

    it('respects limit query parameter', async () => {
      const res = await request(app).get(`/chat/${chatId}/messages?limit=1`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });
  });

  describe('4. Mark Message Read (POST /chat/:chatId/message/:messageId/read)', () => {
    let chatId: string;
    let messageId: string;

    beforeEach(async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      chatId = chatRes.body.chatId;

      const msgRes = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Are you there Bob?' });
      messageId = msgRes.body.id;
    });

    it('marks message as read by user_bob', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/${messageId}/read`)
        .send({ userId: 'user_bob' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe('user_bob');
      expect(res.body).toHaveProperty('readAt');

      // Verify that message now reflects read status
      const getRes = await request(app).get(`/chat/${chatId}/messages`);
      expect(getRes.body.messages[0].readBy).toHaveProperty('user_bob');
    });

    it('rejects mark read by non-member', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/message/${messageId}/read`)
        .send({ userId: 'user_charlie' });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Update and Get Last Seen (POST /chat/:chatId/lastseen)', () => {
    let chatId: string;
    let messageId: string;

    beforeEach(async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      chatId = chatRes.body.chatId;

      const msgRes = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Latest checkpoint message' });
      messageId = msgRes.body.id;
    });

    it('updates last seen message for user', async () => {
      const res = await request(app)
        .post(`/chat/${chatId}/lastseen`)
        .send({ userId: 'user_bob', messageId });

      expect(res.status).toBe(200);
      expect(res.body.chatId).toBe(chatId);
      expect(res.body.userId).toBe('user_bob');
      expect(res.body.messageId).toBe(messageId);
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('retrieves last seen message for user', async () => {
      await request(app)
        .post(`/chat/${chatId}/lastseen`)
        .send({ userId: 'user_bob', messageId });

      const res = await request(app).get(`/chat/${chatId}/lastseen/user_bob`);

      expect(res.status).toBe(200);
      expect(res.body.messageId).toBe(messageId);
    });
  });

  describe('6. List User Chats (GET /user/:userId/chats)', () => {
    it('returns all chats with member details for user_alice', async () => {
      // Create chat between Alice & Bob
      await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });

      // Create chat between Alice & Charlie
      await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_charlie' });

      const res = await request(app).get('/user/user_alice/chats');

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('user_alice');
      expect(res.body.count).toBe(2);
      expect(res.body.chats).toHaveLength(2);
      expect(res.body.chats[0].members.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Bonus Features: Group Chats & Message Edit/Delete', () => {
    it('creates group chat and adds/removes members', async () => {
      // 1. Create group chat
      const groupRes = await request(app)
        .post('/chat/group/create')
        .send({
          name: 'Engineering Team',
          creatorId: 'user_alice',
          memberIds: ['user_bob'],
        });

      expect(groupRes.status).toBe(201);
      const groupId = groupRes.body.chatId;

      // 2. Add Charlie to group
      const addRes = await request(app)
        .post(`/chat/${groupId}/members`)
        .send({ userIds: ['user_charlie'] });
      expect(addRes.status).toBe(200);

      // 3. Remove Bob from group
      const removeRes = await request(app).delete(`/chat/${groupId}/members/user_bob`);
      expect(removeRes.status).toBe(200);
    });

    it('allows sender to edit their own message', async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      const chatId = chatRes.body.chatId;

      const msgRes = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Typo here' });
      const messageId = msgRes.body.id;

      const editRes = await request(app)
        .patch(`/chat/${chatId}/message/${messageId}`)
        .send({ senderId: 'user_alice', text: 'Typo fixed!' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.text).toBe('Typo fixed!');
      expect(editRes.body.isEdited).toBe(true);
    });

    it('allows sender to delete their message', async () => {
      const chatRes = await request(app)
        .post('/chat/create')
        .send({ userAId: 'user_alice', userBId: 'user_bob' });
      const chatId = chatRes.body.chatId;

      const msgRes = await request(app)
        .post(`/chat/${chatId}/message/send`)
        .send({ senderId: 'user_alice', text: 'Secret message' });
      const messageId = msgRes.body.id;

      const delRes = await request(app)
        .delete(`/chat/${chatId}/message/${messageId}`)
        .send({ senderId: 'user_alice' });

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });
});
