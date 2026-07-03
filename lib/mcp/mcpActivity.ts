import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { type ActivityEventType } from '@/types';

type McpActivityPayload = {
  eventType: ActivityEventType;
  cardId?: string;
  cardTitle?: string;
  columnTitle?: string;
  fromColumnTitle?: string;
  toColumnTitle?: string;
  fieldChanged?: string;
  commentSnippet?: string;
};

/**
 * Server-side activity logger for MCP write routes.
 *
 * Writes to the same boards/{boardId}/activities subcollection as the client-side
 * logActivity, but uses the Admin SDK and stamps actorType: 'agent' so the feed
 * can attribute the entry to Claude rather than the token owner's human identity.
 *
 * Call only AFTER the main action succeeds — a failed action must not log.
 * Non-blocking: awaiting is optional; errors are caught and silenced so logging
 * failures never affect the primary HTTP response.
 */
export async function logMcpActivity(
  boardId: string,
  uid: string,
  actorEmail: string,
  payload: McpActivityPayload
): Promise<void> {
  try {
    await adminDb
      .collection('boards')
      .doc(boardId)
      .collection('activities')
      .add({
        ...payload,
        boardId,
        actorId: uid,
        actorEmail,
        actorType: 'agent',
        agentName: 'Claude',
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.error('[MCP Activities] Failed to log activity:', err);
  }
}
