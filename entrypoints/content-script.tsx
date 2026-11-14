import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ContentNotification } from '../components/ContentNotification';
import { getMessage } from '../utils/i18n';
import type { Bookmark } from '../store';
// CSS 通过 manifest.json 中的 content_scripts.css 自动注入，不需要在这里导入
import { defineContentScript } from 'wxt/utils/define-content-script';

let notificationRoot: Root | null = null;
let notificationContainer: HTMLDivElement | null = null;
let dialogRoot: Root | null = null;
let dialogContainer: HTMLDivElement | null = null;

function DialogPortal({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;

  // 获取按钮文本，如果 getMessage 失败则使用后备文本
  const cancelText = getMessage('cancel_btn') || '取消';
  const confirmText = getMessage('confirm_btn') || '确定';

  return (
    <div className="rb-dialog-overlay">
      <div className="rb-dialog-container">
        <h3 className="rb-dialog-title">{title}</h3>
        <p className="rb-dialog-description">{description}</p>
        <div className="rb-dialog-buttons">
          <button onClick={onCancel} className="rb-dialog-button rb-dialog-button-cancel" type="button">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="rb-dialog-button rb-dialog-button-confirm" type="button">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [autoClose, setAutoClose] = useState<boolean>(false);
  const [autoCloseDelay, setAutoCloseDelay] = useState<number>(30);
  // 目录路径请求序号守卫：书签变化后旧响应晚到时丢弃，避免显示上一条书签的路径
  const breadcrumbRequestIdRef = useRef(0);

  const handleClose = useCallback(() => {
    // 关闭通知时一并关闭可能仍打开的确认框，避免全屏 overlay 滞留遮挡页面
    // （确认框开着时点通知 × 关掉通知的场景）；倒计时暂停机制保证此处
    // 不会与打开的确认框产生竞态。
    setBlockDialogOpen(false);
    setRemoveDialogOpen(false);
    if (notificationContainer) {
      notificationContainer.style.setProperty('display', 'none', 'important');
      if (notificationRoot) {
        // 使用 setTimeout 延迟渲染，避免在 React 渲染期间同步卸载
        setTimeout(() => {
          if (notificationRoot) {
            notificationRoot.render(null);
          }
        }, 0);
      }
    }
    setBookmark(null);
  }, []);

  useEffect(() => {
    // 创建通知容器
    // 容器的 display 一律用内联 !important 控制：同为 author-important 时内联胜出、
    // author-important 整体压过作用于 display 的 CSS 动画，防止宿主页样式表
    // `#id{display:none!important}` 或 keyframes 把通知/对话框隐藏
    // （普通 style.display= 赋值会重置 important 标志，所有 display 控制点必须一起用 important）
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'review-bookmark-notification';
    notificationContainer.style.cssText = 'position: fixed; z-index: 999999999; pointer-events: none; display: none !important;';
    document.body.appendChild(notificationContainer);
    notificationRoot = createRoot(notificationContainer);

    // 创建对话框容器
    dialogContainer = document.createElement('div');
    dialogContainer.id = 'review-bookmark-dialog';
    dialogContainer.style.cssText = 'position: fixed; z-index: 999999998; pointer-events: auto; display: none !important;';
    document.body.appendChild(dialogContainer);
    dialogRoot = createRoot(dialogContainer);

    // 获取书签
    chrome.runtime.sendMessage({ ctype: 'getbookmark_from_mini', cdata: false }, response => {
      if (chrome.runtime.lastError) {
        console.error('Content script error:', chrome.runtime.lastError);
        return;
      }
      if (response && response.cdata) {
        if (response.cdata.bookmark) {
          setBookmark(response.cdata.bookmark);
          setPosition(response.cdata.config?.currentNotifyLocation || 'top-right');
          setAutoClose(response.cdata.config?.autoClose ?? false);
          setAutoCloseDelay(response.cdata.config?.autoCloseDelay ?? 30);
        }
      }
    });

    // 说明：不再监听 chrome.runtime.onMessage 的 remove_bookmark/block 消息。
    // background 从不通过 tabs.sendMessage 向 content script 投递这类消息
    // （chrome.runtime.sendMessage 不会发给 content script），该监听是死代码；
    // "操作后关闭通知"已由本地 confirmBlock/confirmRemove 回调中的 handleClose 实现。

    return () => {
      handleClose();
      // 使用 setTimeout 延迟卸载，避免在 React 渲染期间同步卸载
      setTimeout(() => {
        if (dialogRoot && dialogContainer) {
          dialogRoot.unmount();
          dialogContainer.remove();
        }
        if (notificationRoot && notificationContainer) {
          notificationRoot.unmount();
          notificationContainer.remove();
        }
      }, 0);
    };
  }, [handleClose]);

  // 书签变化后拉取其所在目录路径（breadcrumb 消息返回 父目录 -> 书签栏 的祖先链，
  // background 已反转为根优先顺序），传给通知组件在标题上方小字展示
  useEffect(() => {
    if (!bookmark?.parentId) {
      setBreadcrumb([]);
      return;
    }
    const requestId = ++breadcrumbRequestIdRef.current;
    chrome.runtime.sendMessage({ ctype: 'getbookmark_breadcrumb', cdata: bookmark.parentId }, response => {
      // 竞态守卫：书签变化后旧响应晚到时直接丢弃
      if (breadcrumbRequestIdRef.current !== requestId) return;
      if (chrome.runtime.lastError) {
        console.error('getbookmark_breadcrumb failed:', chrome.runtime.lastError.message);
        return;
      }
      setBreadcrumb(Array.isArray(response?.cdata) ? response.cdata : []);
    });
  }, [bookmark]);

  // 倒计时和自动关闭
  // 设计：确认框（屏蔽/删除）打开期间暂停倒计时，避免倒计时归零触发 handleClose
  // 把 bookmark 置空后，confirmBlock/confirmRemove 因引用失效提前返回导致 UI 卡死。
  // 暂停期间倒计时数字冻结在当前值；确认框关闭（取消）后倒计时从完整时长重新开始。
  useEffect(() => {
    if (!bookmark || !autoClose) {
      setCountdown(0);
      return;
    }

    // 确认框打开时暂停（保留当前倒计时数值），关闭后重新计时
    if (blockDialogOpen || removeDialogOpen) {
      return;
    }

    // 重置倒计时
    setCountdown(autoCloseDelay);

    // 倒计时定时器
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [bookmark, autoClose, autoCloseDelay, blockDialogOpen, removeDialogOpen, handleClose]);

  // 渲染通知
  useEffect(() => {
    if (bookmark && notificationRoot && notificationContainer) {
      // 显示通知容器
      notificationContainer.style.setProperty('display', 'block', 'important');
      notificationRoot.render(
        <ContentNotification
          bookmark={bookmark}
          breadcrumb={breadcrumb}
          position={position}
          countdown={countdown}
          onClose={handleClose}
          onBlock={handleBlock}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      );
    } else if (notificationContainer) {
      // 隐藏通知容器
      notificationContainer.style.setProperty('display', 'none', 'important');
      if (notificationRoot) {
        // 使用 setTimeout 延迟渲染，避免在 React 渲染期间同步卸载
        setTimeout(() => {
          if (notificationRoot) {
            notificationRoot.render(null);
          }
        }, 0);
      }
    }
  }, [bookmark, breadcrumb, position, countdown]);

  // 渲染对话框
  useEffect(() => {
    if (dialogRoot && dialogContainer) {
      const hasOpenDialog = blockDialogOpen || removeDialogOpen;
      // 控制对话框容器的显示/隐藏
      if (hasOpenDialog) {
        dialogContainer.style.setProperty('display', 'block', 'important');
      } else {
        dialogContainer.style.setProperty('display', 'none', 'important');
      }

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

  const handleBlock = () => {
    setBlockDialogOpen(true);
  };

  const confirmBlock = () => {
    // 先关闭确认框，确保任何情况下点击确认都不会把 UI 卡在打开状态
    setBlockDialogOpen(false);
    // 倒计时在确认框打开期间已暂停，此处 bookmark 引用必然有效
    if (!bookmark) return;
    chrome.runtime.sendMessage({ ctype: 'block', cdata: bookmark }, response => {
      if (response && response.cdata) {
        handleClose();
      }
    });
  };

  const handleRemove = () => {
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    // 先关闭确认框，确保任何情况下点击确认都不会把 UI 卡在打开状态
    setRemoveDialogOpen(false);
    // 倒计时在确认框打开期间已暂停，此处 bookmark 引用必然有效
    if (!bookmark) return;
    chrome.runtime.sendMessage({ ctype: 'remove_bookmark', cdata: bookmark }, response => {
      if (response && response.cdata) {
        handleClose();
      }
    });
  };

  const handleEdit = () => {
    if (!bookmark) return;
    const baseUrl = chrome.runtime.getURL('bookmark.html#/');
    const url = `${baseUrl}?pid=${bookmark.parentId}&bid=${bookmark.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
    initDiv.style.setProperty('display', 'none', 'important'); // 默认隐藏主容器
    document.body.appendChild(initDiv);

    const root = createRoot(initDiv);
    // 不使用 React.StrictMode：开发模式下 effect 双执行会导致
    // 每次页面加载重复消耗待读书签，且双挂载的 cleanup 定时器可能卸错容器
    root.render(React.createElement(App, null));
  },
});
