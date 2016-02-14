//清空之前版本的数据
if(window.localStorage.curt_index==undefined){
  window.localStorage.clear();
  indexedDB.deleteDatabase('bookmarks');
}
//google analytics
var cpa_obj = new Cpa();
var uid = GetUid.get();

//数据初始化
Bookmark.init();
if(window.localStorage.preview_switch==undefined){
  window.localStorage.preview_switch = 'on';
}
//与前端页面通讯
chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "bookmark_manager_ety001");
  port.onMessage.addListener(function(msg) {
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'lang':
        var res_lang = {};
        for(var i in cdata){
          res_lang[cdata[i]] = chrome.i18n.getMessage(cdata[i]);
        }
        port.postMessage({ctype:ctype, cdata:res_lang});
        break;
      case 'getbookmark':
        Bookmark.get_from_local(function(bm){
          //console.log('get_bookmark_ok',bm);
          cpa_obj.sendAppView("openbookmark_"+bm.title);
          port.postMessage({ctype:ctype, cdata: bm});
        });
        break;
      case 'block':
        cpa_obj.sendEvent('Block', uid);
        Bookmark.set_jump(cdata);
        port.postMessage({ctype:ctype, cdata: true});
        break;
      case 'remove_bookmark':
        cpa_obj.sendEvent('rm_bookmark', uid);
        Bookmark.rm_bookmark_by_id(cdata, function(){
          port.postMessage({ctype:ctype, cdata: true});
        });
        break;
    };
  });
});
//绑定书签事件
chrome.bookmarks.onCreated.addListener(Bookmark.add_bookmark);
chrome.bookmarks.onRemoved.addListener(Bookmark.rm_bookmark);
