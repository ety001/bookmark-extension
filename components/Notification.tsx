import React from 'react';
import { Button } from './ui/button';
import { getMessage } from '../utils/i18n';
import { X, BellOff, Edit, Trash2, ExternalLink } from 'lucide-react';
import { cn } from './ui/cn';
import type { Bookmark } from '../store';

interface NotificationProps {
  bookmark: Bookmark;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onClose: () => void;
  onBlock: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function Notification({
  bookmark,
  position,
  onClose,
  onBlock,
  onEdit,
  onRemove,
}: NotificationProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        `fixed ${positionClasses[position]} z-[999999999] bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] pointer-events-auto`,
        'text-text-gray'
      )}
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="mb-3">
        <div className="font-semibold text-sm mb-2">{bookmark.title}</div>
        <div className="text-xs text-gray-600 leading-[14px] break-all">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {bookmark.url}
          </a>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="warning"
          size="small"
          circle
          plain
          onClick={onClose}
          icon={<X className="w-3.5 h-3.5 text-gray-800" />}
        />
        <Button
          variant="info"
          size="small"
          circle
          plain
          onClick={onBlock}
          icon={<BellOff className="w-3.5 h-3.5 text-gray-800" />}
        />
        <Button
          variant="primary"
          size="small"
          circle
          plain
          onClick={onEdit}
          icon={<Edit className="w-3.5 h-3.5 text-gray-800" />}
        />
        <Button
          variant="danger"
          size="small"
          circle
          plain
          onClick={onRemove}
          icon={<Trash2 className="w-3.5 h-3.5 text-gray-800" />}
        />
      </div>
    </div>
  );
}

