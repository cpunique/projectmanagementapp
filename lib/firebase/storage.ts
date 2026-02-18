import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getApp } from './config';
import { nanoid } from 'nanoid';
import type { CardAttachment } from '@/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENTS_PER_CARD = 10;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

/**
 * Validate a file before upload.
 * Returns an error message or null if valid.
 */
export function validateAttachment(
  file: File,
  existingCount: number
): string | null {
  if (existingCount >= MAX_ATTACHMENTS_PER_CARD) {
    return `Maximum ${MAX_ATTACHMENTS_PER_CARD} attachments per card`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'File type not supported. Allowed: images, PDFs, docs, spreadsheets, text files';
  }
  return null;
}

/**
 * Upload a file to Firebase Storage and return attachment metadata.
 */
export async function uploadAttachment(
  boardId: string,
  cardId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<CardAttachment> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Must be authenticated to upload files');

  const app = getApp();
  const storage = getStorage(app);
  const attachmentId = nanoid();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `boards/${boardId}/cards/${cardId}/${attachmentId}_${safeName}`;
  const storageRef = ref(storage, path);

  return new Promise<CardAttachment>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (error) => {
        console.error('[Storage] Upload failed:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            id: attachmentId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            storagePath: path,
            downloadUrl,
            uploadedBy: user.uid,
            uploadedAt: new Date().toISOString(),
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteAttachment(storagePath: string): Promise<void> {
  try {
    const app = getApp();
    const storage = getStorage(app);
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    throw error;
  }
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
