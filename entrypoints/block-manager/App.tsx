import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
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
import { Trash2, Tag } from 'lucide-react';
import type { Bookmark } from '../../store';

export default function App() {
  const { toast } = useToast();
  const [blockList, setBlockList] = useState<Bookmark[]>([]);
  const [height, setHeight] = useState(0);
  const [search, setSearch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<Bookmark | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = getMessage('appname');
    getBlockList();
  }, []);

  useEffect(() => {
    if (topRef.current) {
      const totalHeight = document.body.offsetHeight;
      const topHeight = topRef.current.offsetHeight;
      setHeight(totalHeight - topHeight);
    }
  }, [blockList]);

  const getBlockList = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { ctype: 'get_block_list', cdata: null },
      (response) => {
        if (response && response.cdata) {
          setBlockList(response.cdata);
          setLoading(false);
        }
      }
    );
  };

  const handleRemove = (bookmark: Bookmark) => {
    setItemToRemove(bookmark);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!itemToRemove) return;
    chrome.runtime.sendMessage(
      { ctype: 'remove_block_bookmark', cdata: itemToRemove },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBlockList();
        }
      }
    );
    setRemoveDialogOpen(false);
    setItemToRemove(null);
  };

  const handleClearBlockList = () => {
    setClearDialogOpen(true);
  };

  const confirmClear = () => {
    chrome.runtime.sendMessage(
      { ctype: 'clear_block_list', cdata: null },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBlockList();
        }
      }
    );
    setClearDialogOpen(false);
  };

  const handleVisit = (url?: string) => {
    if (url) {
      window.open(url);
    }
  };

  const filteredList = blockList.filter(
    (item) => !search || item.title?.includes(search)
  );

  return (
    <div className="h-screen flex flex-col">
      <div
        ref={topRef}
        className="bg-primary text-white py-3"
      >
        <div className="flex items-center justify-between px-10">
          <div className="text-[22px] font-extrabold pl-10">
            {getMessage('appname')}
          </div>
          <div className="flex gap-4 text-right">
            <a
              href="https://akawa.ink/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white font-medium hover:opacity-80 hover:underline transition-all"
            >
              {getMessage('donate')}
            </a>
            <a
              href="https://github.com/ety001/bookmark-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white font-medium hover:opacity-80 hover:underline transition-all"
            >
              {getMessage('source_code')}
            </a>
            {/* TODO: 推广页面已不存在，暂时注释掉 */}
            {/* <a
              href="https://creatorsdaily.com/9999e88d-0b00-46dc-8ff1-e1d311695324#comments"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:underline"
            >
              {getMessage('support')}
            </a> */}
          </div>
        </div>
      </div>

      <main
        className="flex-1 overflow-y-auto p-4 bg-bg-gray"
        style={{ height: `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          {blockList.length > 0 && (
            <div className="mb-2.5 text-right">
              <Button
                variant="danger"
                size="mini"
                onClick={handleClearBlockList}
                className="rounded-full"
              >
                {getMessage('clear_block_list')}
              </Button>
            </div>
          )}

          {filteredList.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {getMessage('no_block_list')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleVisit(item.url)}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold">{item.title}</span>
                    </div>
                    {item.url && (
                      <div className="text-xs text-gray-500 mt-1 ml-6">
                        {item.url}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="mini"
                      circle
                      plain
                      onClick={() => handleRemove(item)}
                      icon={<Trash2 className="w-3 h-3" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

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

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getMessage('notification')}</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空屏蔽列表吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getMessage('cancel_btn')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClear}>
              {getMessage('confirm_btn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

