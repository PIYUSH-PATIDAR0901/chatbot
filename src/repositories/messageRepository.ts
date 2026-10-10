import { config } from '../config';
import { IMessageRepository } from './messageRepository.interface';
import { FirestoreMessageRepository } from './firestoreMessageRepository';
import { InMemoryMessageRepository } from './inMemoryMessageRepository';

let activeMessageRepository: IMessageRepository | null = null;

export function getMessageRepository(): IMessageRepository {
  if (activeMessageRepository) {
    return activeMessageRepository;
  }

  // If running in test mode or explicitly requested in-memory
  if (process.env.USE_IN_MEMORY_MESSAGES === 'true' || process.env.NODE_ENV === 'test') {
    activeMessageRepository = new InMemoryMessageRepository();
    return activeMessageRepository;
  }

  // Default to FirestoreMessageRepository
  try {
    activeMessageRepository = new FirestoreMessageRepository();
  } catch (err) {
    console.warn('[MessageRepository] Failed to initialize Firestore repository, falling back to in-memory store:', err);
    activeMessageRepository = new InMemoryMessageRepository();
  }

  return activeMessageRepository;
}

export function setMessageRepository(repo: IMessageRepository): void {
  activeMessageRepository = repo;
}
