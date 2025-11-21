import React from 'react';
import { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Notification } from '../components/Notification';
import { getMessage } from '../utils/i18n';
import type { Bookmark } from '../store';
import '../styles/globals.css';
import { defineContentScript } from 'wxt/utils/define-content-script';

let notificationRoot: Root | null = null;
let notificationContainer: HTMLDivElement | null = null;
let dialogRoot: Root | null = null;
let dialogContainer: HTMLDivElement | null = null;

function DialogPortal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999999998] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            {getMessage('cancel_btn')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-[#4285d6]"
          >
            {getMessage('confirm_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  useEffect(() => {
    // 创建通知容器
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'review-bookmark-notification';
    notificationContainer.style.cssText = 'position: fixed; z-index: 999999999; pointer-events: none;';
    document.body.appendChild(notificationContainer);
    notificationRoot = createRoot(notificationContainer);

    // 创建对话框容器
    dialogContainer = document.createElement('div');
    dialogContainer.id = 'review-bookmark-dialog';
    dialogContainer.style.cssText = 'position: fixed; z-index: 999999998; pointer-events: auto;';
    document.body.appendChild(dialogContainer);
    dialogRoot = createRoot(dialogContainer);

    // 获取书签
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_from_mini', cdata: false },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Content script error:', chrome.runtime.lastError);
          return;
        }
        if (response && response.cdata) {
          if (response.cdata.bookmark) {
            setBookmark(response.cdata.bookmark);
            setPosition(response.cdata.config?.currentNotifyLocation || 'top-right');
          } else {
            console.log('No bookmark to show (mini mode may be disabled or no bookmarks available)');
          }
        }
      }
    );

    // 监听消息
    const messageListener = (
      message: { ctype: string; cdata: any },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ) => {
      switch (message.ctype) {
        case 'remove_bookmark':
        case 'block':
          handleClose();
          break;
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      handleClose();
      if (dialogRoot && dialogContainer) {
        dialogRoot.unmount();
        dialogContainer.remove();
      }
    };
  }, []);

  // 渲染通知
  useEffect(() => {
    if (bookmark && notificationRoot && notificationContainer) {
      notificationRoot.render(
        <Notification
          bookmark={bookmark}
          position={position}
          onClose={handleClose}
          onBlock={handleBlock}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      );
    }
  }, [bookmark, position]);

  // 渲染对话框
  useEffect(() => {
    if (dialogRoot && dialogContainer) {
      dialogRoot.render(
        <>
          <DialogPortal
            open={blockDialogOpen}
            title={getMessage('notification')}
            description={getMessage('confirm_block_info')}
            onConfirm={confirmBlock}
            onCancel={() => setBlockDialogOpen(false)}
          />
          <DialogPortal
            open={removeDialogOpen}
            title={getMessage('notification')}
            description={getMessage('confirm_remove_info')}
            onConfirm={confirmRemove}
            onCancel={() => setRemoveDialogOpen(false)}
          />
        </>
      );
    }
  }, [blockDialogOpen, removeDialogOpen]);

  const handleClose = () => {
    if (notificationRoot && notificationContainer) {
      notificationRoot.unmount();
      notificationContainer.remove();
      notificationRoot = null;
      notificationContainer = null;
    }
    setBookmark(null);
  };

  const handleBlock = () => {
    setBlockDialogOpen(true);
  };

  const confirmBlock = () => {
    if (!bookmark) return;
    chrome.runtime.sendMessage(
      { ctype: 'block', cdata: bookmark },
      (response) => {
        if (response && response.cdata) {
          handleClose();
        }
      }
    );
    setBlockDialogOpen(false);
  };

  const handleRemove = () => {
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!bookmark) return;
    chrome.runtime.sendMessage(
      { ctype: 'remove_bookmark', cdata: bookmark },
      (response) => {
        if (response && response.cdata) {
          handleClose();
        }
      }
    );
    setRemoveDialogOpen(false);
  };

  const handleEdit = () => {
    if (!bookmark) return;
    const baseUrl = chrome.runtime.getURL('bookmark.html#/');
    const url = `${baseUrl}?pid=${bookmark.parentId}&bid=${bookmark.id}`;
    window.open(url);
  };

  return null;
}

// Content Script 入口
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  main() {
    const initDiv = document.createElement('div');
    initDiv.id = 'review-bookmark';
    document.body.appendChild(initDiv);

    const root = createRoot(initDiv);
    root.render(
      React.createElement(React.StrictMode, null, React.createElement(App, null))
    );
  },
});
