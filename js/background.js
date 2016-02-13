//init popicon
/*var pop_icon  = {
  "19": "img/icon-19.png",
  "38": "img/icon-38.png"
},
pop_icon_black  = {
  "19": "img/icon-19-black.png",
  "38": "img/icon-38-black.png"
};
if(ConfigObj.get('isopen')){
  chrome.browserAction.setIcon({path:pop_icon});
} else {
  chrome.browserAction.setIcon({path:pop_icon_black});
}


chrome.bookmarks.onRemoved.addListener(function(){});
chrome.bookmarks.onChanged.addListener(function(){});
chrome.bookmarks.onMoved.addListener(function(){});

chrome.notifications.onButtonClicked.addListener(function(){});
chrome.notifications.onClosed.addListener(function(){});*/
Bookmark.init();//数据初始化

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "bookmark_manager_ety001");
  port.onMessage.addListener(function(msg) {
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'lang':
        port.postMessage({ctype:ctype, cdata:chrome.i18n.getMessage(cdata)});
        break;
      case 'getbookmark':
        Bookmark.get_from_local(function(bm){
          console.log('get_bookmark_ok',bm);
          port.postMessage({ctype:ctype, cdata: bm});
        });
        break;
    };
  });
});
chrome.bookmarks.onCreated.addListener(Bookmark.add_bookmark);
chrome.bookmarks.onRemoved.addListener(Bookmark.rm_bookmark);
