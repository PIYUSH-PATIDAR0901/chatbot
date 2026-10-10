import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { messageController } from '../controllers/messageController';

const router = Router();

// 1. Create or Get Chat: POST /chat/create
router.post('/create', (req, res, next) => chatController.createOrGetDirectChat(req, res, next));

// Bonus: Group Chat Creation: POST /chat/group/create
router.post('/group/create', (req, res, next) => chatController.createGroupChat(req, res, next));

// 2. Send Message: POST /chat/:chatId/message/send
router.post('/:chatId/message/send', (req, res, next) => messageController.sendMessage(req, res, next));

// 3. Get Messages: GET /chat/:chatId/messages?limit=50
router.get('/:chatId/messages', (req, res, next) => messageController.getMessages(req, res, next));

// 4. Mark Message Read: POST /chat/:chatId/message/:messageId/read
router.post('/:chatId/message/:messageId/read', (req, res, next) => messageController.markMessageRead(req, res, next));

// 5. Update Last Seen Message: POST /chat/:chatId/lastseen
router.post('/:chatId/lastseen', (req, res, next) => messageController.updateLastSeen(req, res, next));

// Fetch Last Seen for user: GET /chat/:chatId/lastseen/:userId
router.get('/:chatId/lastseen/:userId', (req, res, next) => messageController.getLastSeen(req, res, next));

// Bonus: Edit Message: PATCH /chat/:chatId/message/:messageId
router.patch('/:chatId/message/:messageId', (req, res, next) => messageController.editMessage(req, res, next));

// Bonus: Delete Message: DELETE /chat/:chatId/message/:messageId
router.delete('/:chatId/message/:messageId', (req, res, next) => messageController.deleteMessage(req, res, next));

// Bonus: Group Management: Add Members: POST /chat/:chatId/members
router.post('/:chatId/members', (req, res, next) => chatController.addMembers(req, res, next));

// Bonus: Group Management: Remove Member: DELETE /chat/:chatId/members/:userId
router.delete('/:chatId/members/:userId', (req, res, next) => chatController.removeMember(req, res, next));

export default router;
