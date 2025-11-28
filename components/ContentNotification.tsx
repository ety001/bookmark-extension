import React from 'react';
import type { Bookmark } from '../store';

interface ContentNotificationProps {
  bookmark: Bookmark;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  countdown: number;
  onClose: () => void;
  onBlock: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ContentNotification({
  bookmark,
  position,
  countdown,
  onClose,
  onBlock,
  onEdit,
  onRemove,
}: ContentNotificationProps) {
  const positionClass = `rb-notification-${position}`;

  return (
    <div className={`rb-notification ${positionClass}`}>
      <div className="rb-notification-content">
        <div className="rb-notification-title">{bookmark.title}</div>
        <div className="rb-notification-url">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rb-notification-url-link"
          >
            {bookmark.url}
          </a>
        </div>
      </div>
      <div className="rb-notification-buttons">
        <button
          className="rb-notification-button rb-notification-button-close"
          onClick={onClose}
          type="button"
          title="关闭"
        >
          <svg
            className="rb-notification-button-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          className="rb-notification-button rb-notification-button-block"
          onClick={onBlock}
          type="button"
          title="屏蔽"
        >
          <svg
            className="rb-notification-button-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        </button>
        <button
          className="rb-notification-button rb-notification-button-edit"
          onClick={onEdit}
          type="button"
          title="编辑"
        >
          <svg
            className="rb-notification-button-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          className="rb-notification-button rb-notification-button-remove"
          onClick={onRemove}
          type="button"
          title="删除"
        >
          <svg
            className="rb-notification-button-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      {countdown > 0 && (
        <div className="rb-notification-countdown">
          {countdown}秒后关闭
        </div>
      )}
    </div>
  );
}

