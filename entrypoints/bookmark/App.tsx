import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookmarkTree } from '../../components/BookmarkTree';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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
  // 编辑弹窗打开时预设的初始父目录 id，用于判断用户是否实际改动了目录
  const initialParentIdRef = useRef<string | null>(null);
  // 编辑弹窗打开时预设的初始 URL，用于阻止"清空 URL"的提交（bookmarks API 无法移除 URL）
  const initialUrlRef = useRef<string | null>(null);

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
    chrome.runtime.sendMessage({ ctype: 'getbookmark_menu', cdata: false }, response => {
      if (chrome.runtime.lastError) {
        console.error('getbookmark_menu failed:', chrome.runtime.lastError.message);
      }
      if (response && response.cdata) {
        setMenu(response.cdata);
        // 移除这里的 getBookmarkChildren 调用，因为 useEffect 会处理
      }
      // 所有回调路径都要解除 Loading，避免 response 为 undefined（SW 重启/lastError）时永久卡死
      setLoading(false);
    });
  };

  const getBookmarkChildren = (id: string, requestId: string) => {
    const targetId = id === '0' ? '0' : id;
    // 在请求开始时获取当前的 bid，避免闭包问题
    const currentBid = searchParams.get('bid') || '0';
    chrome.runtime.sendMessage({ ctype: 'getbookmark_children', cdata: targetId }, response => {
      if (chrome.runtime.lastError) {
        console.error('getbookmark_children failed:', chrome.runtime.lastError.message);
      }
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
      } else {
        setBookmarks([]);
      }
      // 所有回调路径都要解除 Loading，避免 response 为 undefined（SW 重启/lastError）时永久卡死
      setLoading(false);
    });
  };

  const getBreadcrumb = (id: string) => {
    if (id === '0') {
      setBreadcrumb([]);
      return;
    }
    chrome.runtime.sendMessage({ ctype: 'getbookmark_breadcrumb', cdata: id }, response => {
      if (chrome.runtime.lastError) {
        console.error('getbookmark_breadcrumb failed:', chrome.runtime.lastError.message);
      }
      if (response && response.cdata) {
        setBreadcrumb(response.cdata);
      }
    });
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
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/?pid=${item.id}`);
    }
  };

  const handleEdit = (item: BookmarkItem) => {
    // 先清空上次弹窗（Esc/点遮罩关闭）可能残留的目录选择，避免残留值导致误 move
    setMenuSelector(null);
    initialParentIdRef.current = null;
    initialUrlRef.current = null;
    chrome.runtime.sendMessage({ ctype: 'getbookmark_byid', cdata: { id: item.id, action: 'edit_open' } }, response => {
      if (chrome.runtime.lastError) {
        console.error('getbookmark_byid failed:', chrome.runtime.lastError.message);
      }
      if (response && response.cdata && response.cdata.bookmark) {
        // 竞态守卫：响应与本次点击的 item 不一致（快速连点/响应乱序）时丢弃，避免串数据
        if (response.cdata.bookmark.id !== item.id) return;
        const bookmark = response.cdata.bookmark;
        initialUrlRef.current = bookmark.url || null;
        setBookmarkData({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url || null,
        });
        if (bookmark.parent) {
          initialParentIdRef.current = bookmark.parent.id;
          setMenuSelector({
            id: bookmark.parent.id,
            label: bookmark.parent.title,
          });
        } else {
          initialParentIdRef.current = null;
        }
        setDialogFormVisible(true);
      }
    });
  };

  const handleRemove = (item: BookmarkItem) => {
    setItemToRemove(item);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!itemToRemove) return;
    // 纵深防御：系统目录（根节点的直接子节点，如书签栏）兜底拒绝删除，
    // 拦截渲染层隐藏删除按钮之外的路径（渲染层守卫见列表 map 内）
    if (itemToRemove.parentId === '0' || itemToRemove.parentId === menu[0]?.id) return;
    chrome.runtime.sendMessage({ ctype: 'remove_bookmark', cdata: itemToRemove }, response => {
      if (chrome.runtime.lastError) {
        console.error('remove_bookmark failed:', chrome.runtime.lastError.message);
      }
      if (response && response.cdata) {
        toast({
          variant: 'success',
          title: getMessage('success'),
        });
        // 重新加载当前目录的内容
        const requestId = `${pid}-${Date.now()}`;
        currentRequestIdRef.current = requestId;
        getBookmarkChildren(pid, requestId);
      } else {
        toast({
          variant: 'error',
          title: getMessage('save_failed'),
        });
      }
    });
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
    // chrome.bookmarks.update 无法移除 URL：原书签有 URL 而输入框被清空时阻止提交，
    // 避免 API 静默忽略导致"假成功"误导用户
    if (initialUrlRef.current && !bookmarkData.url) {
      toast({
        variant: 'error',
        title: getMessage('save_failed'),
      });
      return;
    }
    setSaving(true);
    // 仅在用户实际改动了目录时才带 parentId，避免仅改标题也触发 move 挪到目录末尾
    const parentId = menuSelector?.id && menuSelector.id !== initialParentIdRef.current ? menuSelector.id : null;
    chrome.runtime.sendMessage(
      {
        ctype: 'update_bookmark',
        cdata: {
          id: bookmarkData.id,
          title: bookmarkData.title,
          url: bookmarkData.url,
          parentId,
        },
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error('update_bookmark failed:', chrome.runtime.lastError.message);
        }
        setSaving(false);
        if (response && response.cdata) {
          toast({
            variant: 'success',
            title: getMessage('success'),
          });
          getBookmarkMenu();
          setMenuSelector(null);
          setDialogFormVisible(false);
          // 重新加载当前目录的内容与面包屑（带 requestId 防竞态）
          const requestId = `${pid}-${Date.now()}`;
          currentRequestIdRef.current = requestId;
          getBookmarkChildren(pid, requestId);
        } else {
          toast({
            variant: 'error',
            title: getMessage('save_failed'),
          });
        }
      }
    );
  };

  const handleOpenCreateFolder = () => {
    // 根节点下不能创建目录：menu 未加载或 pid 为根节点时按根视图处理。
    // 优先在根 children 里找书签栏（Chrome '1' / Firefox 'toolbar_____'；根 children 的
    // 顺序在 Firefox 并未文档化，不能断言第一个子节点必为书签栏），取不到再退回
    // children[0]，仍取不到则不带 parentId（浏览器默认落"其他书签"）
    let parentId: string | null = pid;
    if (menu.length === 0 || pid === '0' || pid === menu[0]?.id) {
      const rootChildren = menu[0]?.children;
      parentId = rootChildren?.find(node => node.id === '1' || node.id === 'toolbar_____')?.id || rootChildren?.[0]?.id || null;
    }
    setBookmarkFolder({ parentId, title: null });
    setDialogAddFolderFormVisible(true);
  };

  const handleCreateFolder = () => {
    if (!bookmarkFolder.title) return;
    chrome.runtime.sendMessage({ ctype: 'create_bookmark_folder', cdata: bookmarkFolder }, response => {
      if (chrome.runtime.lastError) {
        console.error('create_bookmark_folder failed:', chrome.runtime.lastError.message);
      }
      if (response && response.cdata) {
        toast({
          variant: 'success',
          title: getMessage('success'),
        });
        getBookmarkMenu();
        setDialogAddFolderFormVisible(false);
        setBookmarkFolder({ parentId: null, title: null });
      } else {
        toast({
          variant: 'error',
          title: getMessage('save_failed'),
        });
      }
    });
  };

  const handleFormNodeClick = (node: BookmarkMenuNode) => {
    setMenuSelector({ id: node.id, label: node.label });
  };

  // 编辑弹窗的目录树过滤掉根节点（move 到根是非法操作），直接渲染其 children；
  // menu[0] 即 getTree 返回的根节点（任意浏览器，Firefox 根 id 为 GUID），不用 find(id==='0')
  const folderSelectorData = menu[0]?.children || menu;

  const filteredBookmarks = bookmarks?.filter(item => !search || item.id === search) || [];

  return (
    <div className="h-screen flex flex-col">
      <div ref={topRef} className="bg-primary text-white py-3">
        <div className="flex items-center justify-between px-10">
          <div className="text-[22px] font-extrabold pl-10">{getMessage('appname')}</div>
          <div className="flex gap-4 text-right">
            <a href="https://akawa.ink/donate" target="_blank" rel="noopener noreferrer" className="text-sm text-white font-medium hover:opacity-80 hover:underline transition-all">
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

        <aside ref={menuRef} className="w-[300px] overflow-y-auto pt-2 bg-bg-gray" style={{ height: `${height}px` }}>
          <BookmarkTree data={menu} selectedId={selectedMenuId} onNodeClick={handleNodeClick} />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 bg-bg-gray" style={{ height: `${height}px` }}>
          <div className="max-w-5xl mx-auto">
            {breadcrumb.length > 0 && (
              <div className="mb-2.5">
                <nav className="flex items-center gap-1 text-sm">
                  <button onClick={() => navigate('/?pid=0')} className="text-primary hover:underline">
                    {getMessage('all_bookmarks')}
                  </button>
                  {breadcrumb.map((bc, idx) => (
                    <React.Fragment key={bc.id}>
                      <span>/</span>
                      <button onClick={() => navigate(`/?pid=${bc.id}`)} className="text-primary hover:underline">
                        {bc.title}
                      </button>
                    </React.Fragment>
                  ))}
                </nav>
              </div>
            )}

            <div className="mb-2.5 text-right">
              <Button variant="primary" size="mini" onClick={handleOpenCreateFolder} className="rounded-full">
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
              <div className="text-center text-gray-500 py-8">{getMessage('no_bookmark')}</div>
            ) : (
              <div className="space-y-2">
                {filteredBookmarks.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1 cursor-pointer min-w-0" onClick={() => handleVisit(item)}>
                      <div className="flex items-center gap-2">
                        {item.url ? <Tag className="w-4 h-4 text-gray-600 flex-shrink-0" /> : <Folder className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                        <span className="text-sm font-semibold truncate">{item.title}</span>
                      </div>
                      {item.url && <div className="text-xs text-gray-500 mt-1 ml-6 line-clamp-2 max-w-full">{item.url}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="mini" circle plain onClick={() => handleEdit(item)} icon={<Edit className="w-3 h-3" />} />
                      {/* 根节点的直接子节点（书签栏/其他书签/移动书签等系统目录）隐藏删除按钮，
                          避免误删整棵书签栏（removeTree 会递归删除） */}
                      {item.parentId !== '0' && item.parentId !== menu[0]?.id && (
                        <Button variant="danger" size="mini" circle plain onClick={() => handleRemove(item)} icon={<Trash2 className="w-3 h-3" />} />
                      )}
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
                  <label className="text-sm font-medium mb-2 block">{getMessage('title')}</label>
                  <Input value={bookmarkData.title || ''} onChange={e => setBookmarkData({ ...bookmarkData, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{getMessage('url')}</label>
                  <Input value={bookmarkData.url || ''} onChange={e => setBookmarkData({ ...bookmarkData, url: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{getMessage('save_at')}</label>
                  {menuSelector && (
                    <div className="mb-3">
                      <span className="px-2 py-1 bg-gray-200 rounded text-sm">{menuSelector.label}</span>
                    </div>
                  )}
                  <div className="border rounded p-2 max-h-[200px] overflow-y-auto">
                    <BookmarkTree data={folderSelectorData} selectedId={menuSelector?.id} onNodeClick={handleFormNodeClick} />
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

      <Dialog open={dialogAddFolderFormVisible} onOpenChange={setDialogAddFolderFormVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getMessage('add_folder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{getMessage('folder_name')}</label>
              <Input value={bookmarkFolder.title || ''} onChange={e => setBookmarkFolder({ ...bookmarkFolder, title: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="primary" onClick={handleCreateFolder}>
              {getMessage('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
