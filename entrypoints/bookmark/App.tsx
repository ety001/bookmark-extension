import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookmarkTree } from '../../components/BookmarkTree';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
import type { BookmarkMenuNode } from '../../libs/BookmarkLib';
import { Edit, Trash2, Folder, Tag, X } from 'lucide-react';
import type { Bookmark } from '../../store';

interface BookmarkItem extends Omit<chrome.bookmarks.BookmarkTreeNode, 'url'> {
  url?: string | null;
}

export default function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [menu, setMenu] = useState<BookmarkMenuNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState(0);
  const [pid, setPid] = useState('0');
  const [bid, setBid] = useState('0');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[] | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogFormVisible, setDialogFormVisible] = useState(false);
  const [dialogAddFolderFormVisible, setDialogAddFolderFormVisible] = useState(false);
  const [bookmarkData, setBookmarkData] = useState<{
    id: string | null;
    title: string | null;
    url: string | null;
  }>({
    id: null,
    title: null,
    url: null,
  });
  const [menuSelector, setMenuSelector] = useState<{ id: string; label: string } | null>(null);
  const [bookmarkFolder, setBookmarkFolder] = useState<{
    parentId: string | null;
    title: string | null;
  }>({
    parentId: null,
    title: null,
  });
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<BookmarkItem | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState('0');
  const topRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = getMessage('appname');
    const queryPid = searchParams.get('pid') || '0';
    const queryBid = searchParams.get('bid') || '0';
    setPid(queryPid);
    setBid(queryBid);
    getBookmarkMenu();
  }, [searchParams]);

  useEffect(() => {
    if (topRef.current) {
      const totalHeight = document.body.offsetHeight;
      const topHeight = topRef.current.offsetHeight;
      setHeight(totalHeight - topHeight);
    }
  }, [bookmarks, menu]);

  useEffect(() => {
    if (pid) {
      // 生成请求 ID 来避免竞态条件
      const requestId = `${pid}-${Date.now()}`;
      currentRequestIdRef.current = requestId;
      getBookmarkChildren(pid, requestId);
      setSelectedMenuId(pid);
    }
  }, [pid]);

  useEffect(() => {
    // 从 searchParams 获取最新的 bid，而不是使用闭包中的 bid
    const queryBid = searchParams.get('bid') || '0';
    if (queryBid && queryBid !== '0') {
      setSearch(queryBid);
    } else {
      setSearch(null);
    }
  }, [searchParams]);

  const getBookmarkMenu = () => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_menu', cdata: false },
      (response) => {
        if (response && response.cdata) {
          setMenu(response.cdata);
          setLoading(false);
          // 移除这里的 getBookmarkChildren 调用，因为 useEffect 会处理
        }
      }
    );
  };

  const getBookmarkChildren = (id: string, requestId: string) => {
    const targetId = id === '0' ? '0' : id;
    // 在请求开始时获取当前的 bid，避免闭包问题
    const currentBid = searchParams.get('bid') || '0';
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_children', cdata: targetId },
      (response) => {
        // 检查这个响应是否对应最新的请求
        if (currentRequestIdRef.current !== requestId) {
          return; // 忽略过期的响应
        }
        if (response && response.cdata) {
          const items: BookmarkItem[] = response.cdata.map((item: chrome.bookmarks.BookmarkTreeNode) => ({
            ...item,
            url: item.url || null,
          }));
          setBookmarks(items);
          // 使用请求时的 bid 值
          if (currentBid && currentBid !== '0') {
            setSearch(currentBid);
          } else {
            setSearch(null);
          }
          getBreadcrumb(targetId);
        }
      }
    );
  };

  const getBreadcrumb = (id: string) => {
    if (id === '0') {
      setBreadcrumb([]);
      return;
    }
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_breadcrumb', cdata: id },
      (response) => {
        if (response && response.cdata) {
          setBreadcrumb(response.cdata);
        }
      }
    );
  };

  const handleNodeClick = (node: BookmarkMenuNode) => {
    if (node.id === '0') {
      navigate('/?pid=0');
    } else {
      navigate(`/?pid=${node.id}`);
    }
  };

  const handleVisit = (item: BookmarkItem) => {
    if (item.url) {
      window.open(item.url);
    } else {
      navigate(`/?pid=${item.id}`);
    }
  };

  const handleEdit = (item: BookmarkItem) => {
    chrome.runtime.sendMessage(
      { ctype: 'getbookmark_byid', cdata: { id: item.id, action: 'edit_open' } },
      (response) => {
        if (response && response.cdata && response.cdata.bookmark) {
          const bookmark = response.cdata.bookmark;
          setBookmarkData({
            id: bookmark.id,
            title: bookmark.title,
            url: bookmark.url || null,
          });
          if (bookmark.parent) {
            setMenuSelector({
              id: bookmark.parent.id,
              label: bookmark.parent.title,
            });
          }
          setDialogFormVisible(true);
        }
      }
    );
  };

  const handleRemove = (item: BookmarkItem) => {
    setItemToRemove(item);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!itemToRemove) return;
    chrome.runtime.sendMessage(
      { ctype: 'remove_bookmark', cdata: itemToRemove },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          // 重新加载当前目录的内容
          const requestId = `${pid}-${Date.now()}`;
          currentRequestIdRef.current = requestId;
          getBookmarkChildren(pid, requestId);
        }
      }
    );
    setRemoveDialogOpen(false);
    setItemToRemove(null);
  };

  const handleCancelDialog = () => {
    if (saving) return;
    setDialogFormVisible(false);
    setBookmarkData({ id: null, title: null, url: null });
    setMenuSelector(null);
  };

  const handleConfirmDialog = () => {
    if (!bookmarkData.id) return;
    setSaving(true);
    chrome.runtime.sendMessage(
      {
        ctype: 'update_bookmark',
        cdata: {
          id: bookmarkData.id,
          title: bookmarkData.title,
          url: bookmarkData.url,
          parentId: menuSelector?.id || null,
          index: 0,
        },
      },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBookmarkMenu();
          setMenuSelector(null);
          setSaving(false);
          setDialogFormVisible(false);
        }
      }
    );
  };

  const handleOpenCreateFolder = () => {
    setBookmarkFolder({ parentId: pid, title: null });
    setDialogAddFolderFormVisible(true);
  };

  const handleCreateFolder = () => {
    if (!bookmarkFolder.title) return;
    chrome.runtime.sendMessage(
      { ctype: 'create_bookmark_folder', cdata: bookmarkFolder },
      (response) => {
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBookmarkMenu();
          setDialogAddFolderFormVisible(false);
          setBookmarkFolder({ parentId: null, title: null });
        }
      }
    );
  };

  const handleFormNodeClick = (node: BookmarkMenuNode) => {
    setMenuSelector({ id: node.id, label: node.label });
  };

  const filteredBookmarks = bookmarks?.filter(
    (item) => !search || item.id.includes(search)
  ) || [];

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

      <div className="flex flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}

        <aside
          ref={menuRef}
          className="w-[300px] overflow-y-auto pt-2 bg-bg-gray"
          style={{ height: `${height}px` }}
        >
          <BookmarkTree
            data={menu}
            selectedId={selectedMenuId}
            onNodeClick={handleNodeClick}
          />
        </aside>

        <main
          className="flex-1 overflow-y-auto p-4 bg-bg-gray"
          style={{ height: `${height}px` }}
        >
          <div className="max-w-5xl mx-auto">
            {breadcrumb.length > 0 && (
              <div className="mb-2.5">
                <nav className="flex items-center gap-1 text-sm">
                  <button
                    onClick={() => navigate('/?pid=0')}
                    className="text-primary hover:underline"
                  >
                    {getMessage('all_bookmarks')}
                  </button>
                  {breadcrumb.map((bc, idx) => (
                    <React.Fragment key={bc.id}>
                      <span>/</span>
                      <button
                        onClick={() => navigate(`/?pid=${bc.id}`)}
                        className="text-primary hover:underline"
                      >
                        {bc.title}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>
              </div>
            )}

            <div className="mb-2.5 text-right">
              <Button
                variant="primary"
                size="mini"
                onClick={handleOpenCreateFolder}
                className="rounded-full"
              >
                {getMessage('add_folder')}
              </Button>
            </div>

            {search && (
              <div className="mb-2.5 flex items-center gap-2">
                <span className="font-semibold">{getMessage('filter')}:</span>
                <span className="px-2 py-1 bg-gray-200 rounded text-sm flex items-center gap-1">
                  ID: {search}
                  <button onClick={() => setSearch(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}

            {filteredBookmarks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {getMessage('no_bookmark')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => handleVisit(item)}
                    >
                      <div className="flex items-center gap-2">
                        {item.url ? (
                          <Tag className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                      </div>
                      {item.url && (
                        <div className="text-xs text-gray-500 mt-1 ml-6 line-clamp-2 max-w-full">
                          {item.url}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="mini"
                        circle
                        plain
                        onClick={() => handleEdit(item)}
                        icon={<Edit className="w-3 h-3" />}
                      />
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
      </div>

      <Dialog open={dialogFormVisible} onOpenChange={setDialogFormVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getMessage('edit_bookmark')}</DialogTitle>
          </DialogHeader>
          {saving ? (
            <div className="py-8 text-center">Saving...</div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {getMessage('title')}
                  </label>
                  <Input
                    value={bookmarkData.title || ''}
                    onChange={(e) =>
                      setBookmarkData({ ...bookmarkData, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {getMessage('url')}
                  </label>
                  <Input
                    value={bookmarkData.url || ''}
                    onChange={(e) =>
                      setBookmarkData({ ...bookmarkData, url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {getMessage('save_at')}
                  </label>
                  {menuSelector && (
                    <div className="mb-3">
                      <span className="px-2 py-1 bg-gray-200 rounded text-sm">
                        {menuSelector.label}
                      </span>
                    </div>
                  )}
                  <div className="border rounded p-2 max-h-[200px] overflow-y-auto">
                    <BookmarkTree
                      data={menu}
                      selectedId={menuSelector?.id}
                      onNodeClick={handleFormNodeClick}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCancelDialog}>
                  {getMessage('cancel_btn')}
                </Button>
                <Button variant="primary" onClick={handleConfirmDialog}>
                  {getMessage('confirm_btn')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogAddFolderFormVisible}
        onOpenChange={setDialogAddFolderFormVisible}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getMessage('add_folder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">目录名</label>
              <Input
                value={bookmarkFolder.title || ''}
                onChange={(e) =>
                  setBookmarkFolder({ ...bookmarkFolder, title: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="primary" onClick={handleCreateFolder}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

