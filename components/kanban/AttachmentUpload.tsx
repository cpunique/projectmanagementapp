'use client';

import { useState, useRef } from 'react';
import { validateAttachment, uploadAttachment } from '@/lib/firebase/storage';
import { useToast } from '@/components/ui/Toast';
import type { CardAttachment } from '@/types';

interface AttachmentUploadProps {
  boardId: string;
  cardId: string;
  existingCount: number;
  onUploaded: (attachment: CardAttachment) => void;
  disabled?: boolean;
}

export default function AttachmentUpload({
  boardId,
  cardId,
  existingCount,
  onUploaded,
  disabled,
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const error = validateAttachment(file, existingCount);
    if (error) {
      showToast(error, 'warning');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const attachment = await uploadAttachment(boardId, cardId, file, setProgress);
      onUploaded(attachment);
      showToast('File uploaded', 'success');
    } catch (err) {
      console.error('[AttachmentUpload] Upload failed:', err);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />

      {uploading ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex-1">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">
            {progress}%
          </span>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || existingCount >= 10}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Attach file
        </button>
      )}
    </div>
  );
}
