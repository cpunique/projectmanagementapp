import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import { Notification } from '@/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Create a notification for a user in Firebase
 * Called when someone is @mentioned in a comment
 */
export async function createNotification(
  targetUserId: string,
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(getDb(), NOTIFICATIONS_COLLECTION), {
      ...notification,
      targetUserId, // The user who should receive this notification
      createdAt: serverTimestamp(),
    });
    console.log('[Notifications] Created notification:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return null;
  }
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const q = query(
      collection(getDb(), NOTIFICATIONS_COLLECTION),
      where('targetUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        boardId: data.boardId,
        boardName: data.boardName,
        cardId: data.cardId,
        cardTitle: data.cardTitle,
        commentId: data.commentId,
        fromUserId: data.fromUserId,
        fromUserEmail: data.fromUserEmail,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
        read: data.read || false,
      } as Notification;
    });
  } catch (error) {
    console.error('[Notifications] Failed to get notifications:', error);
    return [];
  }
}

/**
 * Subscribe to notifications for a user (real-time updates)
 */
export function subscribeToNotifications(
  userId: string,
  onNotificationsChange: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(getDb(), NOTIFICATIONS_COLLECTION),
    where('targetUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          boardId: data.boardId,
          boardName: data.boardName,
          cardId: data.cardId,
          cardTitle: data.cardTitle,
          commentId: data.commentId,
          fromUserId: data.fromUserId,
          fromUserEmail: data.fromUserEmail,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || new Date().toISOString(),
          read: data.read || false,
        } as Notification;
      });
      onNotificationsChange(notifications);
    },
    (error) => {
      console.error('[Notifications] Subscription error:', error);
      // Check if it's a missing index error and provide helpful message
      if (error.message?.includes('index')) {
        console.error('[Notifications] Missing Firestore index. Create it at:', error.message.match(/https:\/\/[^\s]+/)?.[0]);
      }
      onError?.(error);
    }
  );

  return unsubscribe;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await updateDoc(doc(getDb(), NOTIFICATIONS_COLLECTION, notificationId), {
      read: true,
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to mark as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(getDb(), NOTIFICATIONS_COLLECTION),
      where('targetUserId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to mark all as read:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(getDb(), NOTIFICATIONS_COLLECTION, notificationId));
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to delete notification:', error);
    return false;
  }
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(getDb(), NOTIFICATIONS_COLLECTION),
      where('targetUserId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));

    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to clear notifications:', error);
    return false;
  }
}

/**
 * Create notifications for all mentioned users
 * Called from the store when a comment with mentions is added
 */
export async function createMentionNotifications(
  mentions: { userId: string; email: string }[],
  authorId: string,
  authorEmail: string,
  boardId: string,
  boardName: string,
  cardId: string,
  cardTitle: string,
  commentId: string
): Promise<void> {
  // Filter out the author from mentions (don't notify yourself)
  const usersToNotify = mentions.filter((m) => m.userId !== authorId);

  if (usersToNotify.length === 0) return;

  console.log('[Notifications] Creating notifications for:', usersToNotify.map(u => u.email));

  const promises = usersToNotify.map((user) =>
    createNotification(user.userId, {
      type: 'mention',
      boardId,
      boardName,
      cardId,
      cardTitle,
      commentId,
      fromUserId: authorId,
      fromUserEmail: authorEmail,
      read: false,
    })
  );

  await Promise.all(promises);
}
