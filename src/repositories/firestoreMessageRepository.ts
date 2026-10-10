import { randomUUID } from 'crypto';
import { Timestamp, FieldValue, Firestore, DocumentData, Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from '../firebase';
import { ChatMessage, LastSeenRecord } from '../types';
import { IMessageRepository } from './messageRepository.interface';

export class FirestoreMessageRepository implements IMessageRepository {
  private getDb(): Firestore {
    return getFirestore();
  }

  private formatMessage(data: DocumentData, id: string): ChatMessage {
    let timestampStr = new Date().toISOString();
    if (data.timestamp) {
      if (typeof data.timestamp.toDate === 'function') {
        timestampStr = data.timestamp.toDate().toISOString();
      } else if (typeof data.timestamp === 'string') {
        timestampStr = data.timestamp;
      }
    }

    // Format readBy object timestamps
    const rawReadBy = data.readBy || {};
    const formattedReadBy: Record<string, string> = {};
    for (const [key, val] of Object.entries(rawReadBy)) {
      if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
        formattedReadBy[key] = (val as { toDate: () => Date }).toDate().toISOString();
      } else if (typeof val === 'string') {
        formattedReadBy[key] = val;
      } else {
        formattedReadBy[key] = new Date().toISOString();
      }
    }

    let updatedAtStr: string | undefined = undefined;
    if (data.updatedAt) {
      if (typeof data.updatedAt.toDate === 'function') {
        updatedAtStr = data.updatedAt.toDate().toISOString();
      } else if (typeof data.updatedAt === 'string') {
        updatedAtStr = data.updatedAt;
      }
    }

    return {
      id: id || data.id,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.text,
      timestamp: timestampStr,
      readBy: formattedReadBy,
      isEdited: Boolean(data.isEdited),
      isDeleted: Boolean(data.isDeleted),
      updatedAt: updatedAtStr,
    };
  }

  async sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
    const db = this.getDb();
    const messageId = randomUUID();
    const docRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    const now = Timestamp.now();
    const messageData = {
      id: messageId,
      chatId,
      senderId,
      text,
      timestamp: now,
      readBy: {
        [senderId]: now, // Sender has automatically seen their own message
      },
      isEdited: false,
      isDeleted: false,
    };

    await docRef.set(messageData);

    return this.formatMessage(messageData, messageId);
  }

  async getMessages(chatId: string, limit = 50, beforeTimestamp?: string): Promise<ChatMessage[]> {
    const db = this.getDb();
    let query: Query = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'asc');

    if (beforeTimestamp) {
      const beforeDate = new Date(beforeTimestamp);
      query = query.where('timestamp', '<', Timestamp.fromDate(beforeDate));
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    query = query.limit(safeLimit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => this.formatMessage(doc.data(), doc.id));
  }

  async getMessageById(chatId: string, messageId: string): Promise<ChatMessage | null> {
    const db = this.getDb();
    const doc = await db.collection('chats').doc(chatId).collection('messages').doc(messageId).get();

    if (!doc.exists) {
      return null;
    }

    return this.formatMessage(doc.data()!, doc.id);
  }

  async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<{ success: boolean; readAt: string }> {
    const db = this.getDb();
    const docRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Message ${messageId} not found in chat ${chatId}`);
    }

    const now = Timestamp.now();
    await docRef.update({
      [`readBy.${userId}`]: now,
    });

    return {
      success: true,
      readAt: now.toDate().toISOString(),
    };
  }

  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<LastSeenRecord> {
    const db = this.getDb();
    const docRef = db.collection('chats').doc(chatId).collection('last_seen').doc(userId);

    const now = Timestamp.now();
    const record = {
      chatId,
      userId,
      messageId,
      updatedAt: now,
    };

    await docRef.set(record, { merge: true });

    return {
      chatId,
      userId,
      messageId,
      updatedAt: now.toDate().toISOString(),
    };
  }

  async getLastSeen(chatId: string, userId: string): Promise<LastSeenRecord | null> {
    const db = this.getDb();
    const doc = await db.collection('chats').doc(chatId).collection('last_seen').doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    let updatedAtStr = new Date().toISOString();
    if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
      updatedAtStr = data.updatedAt.toDate().toISOString();
    }

    return {
      chatId: data.chatId,
      userId: data.userId,
      messageId: data.messageId,
      updatedAt: updatedAtStr,
    };
  }

  async editMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<ChatMessage> {
    const db = this.getDb();
    const docRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Message ${messageId} not found`);
    }

    const data = doc.data()!;
    if (data.senderId !== senderId) {
      throw new Error('Only the original sender can edit this message');
    }

    if (data.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    const now = Timestamp.now();
    await docRef.update({
      text: newText,
      isEdited: true,
      updatedAt: now,
    });

    const updatedDoc = await docRef.get();
    return this.formatMessage(updatedDoc.data()!, messageId);
  }

  async deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string
  ): Promise<boolean> {
    const db = this.getDb();
    const docRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error(`Message ${messageId} not found`);
    }

    const data = doc.data()!;
    if (data.senderId !== senderId) {
      throw new Error('Only the original sender can delete this message');
    }

    const now = Timestamp.now();
    await docRef.update({
      text: '[This message was deleted]',
      isDeleted: true,
      updatedAt: now,
    });

    return true;
  }
}

export const firestoreMessageRepository = new FirestoreMessageRepository();
