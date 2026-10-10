import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { userController } from '../controllers/userController';

const router = Router();

// 6. List User Chats: GET /user/:userId/chats
router.get('/:userId/chats', (req, res, next) => chatController.getUserChats(req, res, next));

// User creation & lookup helpers for testing
router.post('/create', (req, res, next) => userController.createUser(req, res, next));
router.get('/:userId', (req, res, next) => userController.getUserById(req, res, next));

export default router;
