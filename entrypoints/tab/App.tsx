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
  const [loading, setLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(0);

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
  }, [bookmark]);

  const getBookmark = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_from_full', cdata: false },
      (response) => {
        if (response && response.cdata) {
          setBookmark(response.cdata);
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    );
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
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBookmark();
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
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBookmark();
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

  const handleVisit = () => {
    if (bookmark?.url) {
      window.open(bookmark.url);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
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
      <div
        ref={topRef}
        className="bg-[#eee] text-[#444] py-5 border-b-2 border-[#ccc]"
      >
        <div className="flex items-start">
          <div className="w-1/6 flex justify-center items-center py-8">
            <span className="text-[24px] font-extrabold leading-5">
              {getMessage('appname')}
            </span>
          </div>
          <div className="flex-1 px-4">
            <div className="mb-2">
              <div className="text-[18px] font-medium mb-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {bookmark.title}
              </div>
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
              <Button
                variant="success"
                size="small"
                circle
                plain
                onClick={getBookmark}
                icon={<ArrowRight className="w-4 h-4" />}
              />
              <Button
                variant="info"
                size="small"
                circle
                plain
                onClick={handleBlock}
                icon={<BellOff className="w-4 h-4" />}
              />
              <Button
                variant="primary"
                size="small"
                circle
                plain
                onClick={handleEdit}
                icon={<Edit className="w-4 h-4" />}
              />
              <Button
                variant="danger"
                size="small"
                circle
                plain
                onClick={handleRemove}
                icon={<Trash2 className="w-4 h-4" />}
              />
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
                className="text-sm text-gray-600 hover:underline"
              >
                {getMessage('donate')}
              </a>
              <a
                href="https://github.com/ety001/bookmark-extension"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline"
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
      <div
        className="flex-1 relative cursor-pointer"
        onClick={handleVisit}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={bookmark.url}
          sandbox=""
          className="w-full h-full border-0"
          style={{ height: `${iframeHeight}px` }}
          onLoad={handleIframeLoad}
        />
      </div>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('notification')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getMessage('confirm_block_info')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock}>
              {getMessage('confirm_btn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('notification')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getMessage('confirm_remove_info')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>
              {getMessage('confirm_btn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

