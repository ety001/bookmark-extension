import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useToast } from '../../components/ui/use-toast';
import { getMessage } from '../../utils/i18n';
import { ArrowRight, X, Edit, Trash2, BellOff, ExternalLink } from 'lucide-react';
import type { Bookmark } from '../../store';

export default function App() {
  const { toast } = useToast();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(0);
  // 目录路径请求序号：换书签（点"换一个"/屏蔽/删除后重取）时旧响应晚到，
  // 用序号守卫丢弃过期响应，避免显示上一条书签的路径（参考 bookmark/App.tsx 的 currentRequestIdRef 模式）
  const breadcrumbRequestIdRef = useRef(0);

  useEffect(() => {
    document.title = getMessage('appname');
    getBookmark();
  }, []);

  useEffect(() => {
    if (topRef.current && iframeRef.current) {
      const totalHeight = document.body.offsetHeight;
      const topHeight = topRef.current.offsetHeight;
      setIframeHeight(totalHeight - topHeight);
    }
    // breadcrumb 也在依赖里：路径行异步出现/清空会改变顶栏高度（±约一行），
    // 不重算会导致 iframe 底部裁切或留缝
  }, [bookmark, breadcrumb]);

  // 书签变化后拉取其所在目录路径（breadcrumb 消息返回 父目录 -> 书签栏 的祖先链，
  // background 已反转为根优先顺序）
  useEffect(() => {
    // 无条件递增守卫序号（含 !parentId 早退分支）：让任何在途的旧 breadcrumb
    // 响应立即失效，堵住"早退时旧响应穿透守卫"的盲区
    breadcrumbRequestIdRef.current += 1;
    if (!bookmark?.parentId) {
      setBreadcrumb([]);
      return;
    }
    const requestId = breadcrumbRequestIdRef.current;
    chrome.runtime.sendMessage({ ctype: 'getbookmark_breadcrumb', cdata: bookmark.parentId }, response => {
      // 竞态守卫：换书签后旧响应晚到时直接丢弃
      if (breadcrumbRequestIdRef.current !== requestId) return;
      if (chrome.runtime.lastError) {
        console.error('getbookmark_breadcrumb failed:', chrome.runtime.lastError.message);
        return;
      }
      setBreadcrumb(Array.isArray(response?.cdata) ? response.cdata : []);
    });
  }, [bookmark]);

  const getBookmark = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ ctype: 'getbookmark_from_full', cdata: false }, response => {
      if (response && response.cdata) {
        // 旧路径清空与守卫失效和新书签同批提交：消除"新标题+旧路径"闪帧
        breadcrumbRequestIdRef.current += 1;
        setBookmark(response.cdata);
        setBreadcrumb([]);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
  };

  const handleBlock = () => {
    setBlockDialogOpen(true);
  };

  const confirmBlock = () => {
    if (!bookmark) return;
    chrome.runtime.sendMessage({ ctype: 'block', cdata: bookmark }, response => {
      if (response && response.cdata) {
        toast({
          variant: 'success',
          title: getMessage('success'),
        });
        getBookmark();
      }
    });
    setBlockDialogOpen(false);
  };

  const handleRemove = () => {
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!bookmark) return;
    chrome.runtime.sendMessage({ ctype: 'remove_bookmark', cdata: bookmark }, response => {
      if (response && response.cdata) {
        toast({
          variant: 'success',
          title: getMessage('success'),
        });
        getBookmark();
      }
    });
    setRemoveDialogOpen(false);
  };

  const handleEdit = () => {
    if (!bookmark) return;
    const baseUrl = chrome.runtime.getURL('bookmark.html#/');
    const url = `${baseUrl}?pid=${bookmark.parentId}&bid=${bookmark.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleVisit = () => {
    if (bookmark?.url) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  // 目录路径展示文本：过滤空 title 段（Chrome/Firefox 的书签栏等根级节点 title 可能为空），
  // 过滤后为空则不渲染该行
  const breadcrumbText = breadcrumb
    .map(node => node.title)
    .filter(title => title && title.trim() !== '')
    .join(' / ');

  // 点击路径打开书签管理页并定位到该目录（只带 pid，让用户看到目录完整内容）
  const handleBreadcrumbClick = () => {
    if (!bookmark?.parentId) return;
    const url = `${chrome.runtime.getURL('bookmark.html#/')}?pid=${bookmark.parentId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!bookmark) {
    return (
      <div className="m-5">
        <Alert variant="error">
          <AlertTitle>{getMessage('no_bookmark')}</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div ref={topRef} className="bg-bg-gray text-text-gray py-5 border-b-2 border-border-gray">
        <div className="flex items-start">
          <div className="w-1/6 flex justify-center items-center py-8">
            <span className="text-[24px] font-extrabold leading-5">{getMessage('appname')}</span>
          </div>
          <div className="flex-1 px-4">
            <div className="mb-2">
              {breadcrumbText && (
                <button
                  type="button"
                  onClick={handleBreadcrumbClick}
                  title={getMessage('folder_path')}
                  className="block text-xs text-gray-500 mb-1 max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap hover:text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
                >
                  {breadcrumbText}
                </button>
              )}
              <div className="text-[18px] font-medium mb-2 overflow-hidden text-ellipsis whitespace-nowrap">{bookmark.title}</div>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 mb-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[500px] block hover:underline"
              >
                {bookmark.url}
              </a>
            </div>
            <div className="flex gap-2">
              <Button variant="success" size="small" circle onClick={getBookmark} icon={<ArrowRight className="w-4 h-4" />} />
              <Button variant="info" size="small" circle onClick={handleBlock} icon={<BellOff className="w-4 h-4" />} />
              <Button variant="success" size="small" circle onClick={handleEdit} icon={<Edit className="w-4 h-4" />} />
              <Button variant="danger" size="small" circle onClick={handleRemove} icon={<Trash2 className="w-4 h-4" />} />
            </div>
          </div>
          <div className="w-1/6 pr-10 text-right">
            {/* TODO: 推广页面已不存在，暂时注释掉 */}
            {/* <a
              href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324?utm_source=vote"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://creatorsdaily.com/api/9999e88d-0b00-46dc-8ff1-e1d311695324/vote.svg?theme=dark"
                alt="vote"
              />
            </a>
            <br />
            <br /> */}
            <div className="flex flex-col gap-2">
              <a
                href="https://akawa.ink/donate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 font-medium hover:text-primary hover:underline transition-colors"
              >
                {getMessage('donate')}
              </a>
              <a
                href="https://github.com/ety001/bookmark-extension"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 font-medium hover:text-primary hover:underline transition-colors"
              >
                {getMessage('source_code')}
              </a>
              {/* TODO: 推广页面已不存在，暂时注释掉 */}
              {/* <a
                href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324#comments"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline"
              >
                {getMessage('support')}
              </a> */}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 relative cursor-pointer" onClick={handleVisit}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}
        <iframe ref={iframeRef} src={bookmark.url} sandbox="" className="w-full h-full border-0" style={{ height: `${iframeHeight}px` }} onLoad={handleIframeLoad} />
      </div>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('notification')}</AlertDialogTitle>
            <AlertDialogDescription>{getMessage('confirm_block_info')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock}>{getMessage('confirm_btn')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('notification')}</AlertDialogTitle>
            <AlertDialogDescription>{getMessage('confirm_remove_info')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>{getMessage('confirm_btn')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
