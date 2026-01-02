import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import type { Board } from '@/types';

/**
 * Get demo-configs collection reference
 */
const getDemoConfigsCollection = () => collection(getDb(), 'demo-configs');

/**
 * Fetch the active demo board configuration from Firestore
 * Returns null if not found or on error
 */
export async function getActiveDemoConfig(): Promise<Board | null> {
  try {
    const configRef = doc(getDemoConfigsCollection(), 'active');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return null;
    }

    const data = configSnap.data();
    return data.board as Board;
  } catch (error) {
    console.error('Failed to fetch demo config from Firestore:', error);
    return null;
  }
}

/**
 * Save demo board configuration to Firestore
 * Only admins should call this function
 */
export async function saveDemoConfig(
  board: Board,
  adminUserId: string
): Promise<void> {
  try {
    const configRef = doc(getDemoConfigsCollection(), 'active');

    // Clean the board object to remove undefined values that Firestore doesn't support
    const cleanedBoard = JSON.parse(JSON.stringify(board));

    const configData = {
      id: 'active',
      board: cleanedBoard,
      updatedAt: serverTimestamp(),
      updatedBy: adminUserId,
    };

    await setDoc(configRef, configData);
  } catch (error) {
    console.error('Failed to save demo config to Firestore:', error);
    throw error;
  }
}
