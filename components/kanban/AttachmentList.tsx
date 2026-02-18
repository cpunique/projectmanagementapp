'use client';

import { useState } from 'react';
import { deleteAttachment, formatFileSize } from '@/lib/firebase/storage';
import { useToast } from '@/components/ui/Toast';
import type { CardAttachment } from '@/types';

interface AttachmentListProps {
  attachments: CardAttachment[];
  onDelete: (attachmentId: string) => void;
  canEdit: boolean;
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  return '📎';
}

export default function AttachmentList({ attachments, onDelete, canEdit }: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  if (attachments.length === 0) return null;

  const handleDelete = async (attachment: CardAttachment) => {
    if (!confirm(`Delete "${attachment.fileName}"?`)) return;

    setDeletingId(attachment.id);
    try {
      await deleteAttachment(attachment.storagePath);
      onDelete(attachment.id);
    } catch (err) {
      console.error('[AttachmentList] Delete failed:', err);
      showToast('Failed to delete file', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ul className="space-y-1.5">
      {attachments.map((att) => {
        const isImage = att.fileType.startsWith('image/');

        return (
          <li
            key={att.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group"
          >
            {/* Thumbnail or icon */}
            {isImage ? (
              <img
                src={att.downloadUrl}
                alt={att.fileName}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
            ) : (
              <span className="text-lg flex-shrink-0">{getFileIcon(att.fileType)}</span>
            )}

            {/* File info */}
            <div className="flex-1 min-w-0">
              <a
                href={att.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-800 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 truncate block"
                title={att.fileName}
              >
                {att.fileName}
              </a>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatFileSize(att.fileSize)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={att.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="Download"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              {canEdit && (
                <button
                  onClick={() => handleDelete(att)}
                  disabled={deletingId === att.id}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
