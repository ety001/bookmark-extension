//清空之前版本的数据
if(window.localStorage.curt_index==undefined){
  window.localStorage.clear();
  indexedDB.deleteDatabase('bookmarks');
}
//初始化mini模式配置
if(window.localStorage.mini_switch==undefined){
  Mini.init();
}

// chrome.tabs.onCreated.addListener(function(tab){
//   if(Mini.get_status()=='off'&&(tab.url=="chrome://newtab/"||tab.url=="chrome://newtab")){
//     chrome.tabs.update(tab.id, {url:chrome.runtime.getURL('show.html')});
//   }
// });

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
          if(typeof(cdata[i])=='string'){
            res_lang[cdata[i]] = chrome.i18n.getMessage(cdata[i]);
          }
        }
        port.postMessage({ctype:ctype, cdata:res_lang});
        break;
      case 'getbookmark':
        cpa_obj.sendEvent('Openbookmark', uid);
        Bookmark.get_from_local(function(bm){
          //console.log('get_bookmark_ok',bm);
          port.postMessage({ctype:ctype, cdata: bm});
          cpa_obj.sendAppView("openbookmark_"+bm[0].title);
        });
        break;
      case 'getbookmark_from_mini':
        if(Mini.get_status()=='off'||Mini.charge()==false){
          port.postMessage({ctype:ctype, cdata: false});
        } else {
          cpa_obj.sendEvent('Openbookmark', uid, 'mini');
          Bookmark.get_from_local(function(bm){
            //console.log('get_bookmark_ok',bm);
            port.postMessage({ctype:ctype, cdata: bm});
            cpa_obj.sendAppView("openbookmark_"+bm[0].title);
          });
        }
        break;
      case 'block':
        cpa_obj.sendEvent('Block', uid);
        Bookmark.set_jump(cdata);
        port.postMessage({ctype:ctype, cdata: true});
        break;
      case 'cancelblock':
        cpa_obj.sendEvent('CancelBlock', uid);
        Bookmark.set_jump(cdata, 0);
        port.postMessage({ctype:ctype, cdata:cdata });
        break;
      case 'remove_bookmark':
        cpa_obj.sendEvent('rm_bookmark', uid);
        Bookmark.rm_bookmark_by_id(cdata, function(){
          port.postMessage({ctype:ctype, cdata: true});
        });
        break;
      case 'get_block_list':
        cpa_obj.sendEvent('get_block_list', uid);
        Bookmark.get_block_list(function(list){
          port.postMessage({ctype:ctype, cdata: list});
        });
        break;
      case 'mini_switch':
        cpa_obj.sendEvent('mini_switch', uid, cdata);
        Mini.switch_mini(cdata);
        port.postMessage({ctype:ctype, cdata: true});
        break;
      case 'getminimax':
        port.postMessage({ctype:ctype, cdata: Mini.get_max()});
        break;
      case 'setminimax':
        cpa_obj.sendEvent('set_mini_max', uid, cdata);
        Mini.set_max(cdata);
        port.postMessage({ctype:ctype, cdata: true});
        break;
      case 'getsettingpage':
        port.postMessage({ctype:ctype, cdata: chrome.runtime.getURL('show.html')});
    };
  });
});
//绑定书签事件
chrome.bookmarks.onCreated.addListener(Bookmark.add_bookmark);
chrome.bookmarks.onRemoved.addListener(Bookmark.rm_bookmark);

//升级检测
chrome.runtime.onInstalled.addListener(function(detail,previousVersion){
  if(detail.reason=='update'){
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'img/icon-128.png',
      title: chrome.i18n.getMessage('appname'),
      message: chrome.i18n.getMessage('update_ok')
    }, function(notification_id){});
  }
});
chrome.runtime.onUpdateAvailable.addListener(function(detail){
  console.log(detail.version);
  //chrome.runtime.getManifest();
  notifications(detail.version?('v'+detail.version):'New version');
});
function notifications(version){
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'img/icon-128.png',
    title: chrome.i18n.getMessage('appname'),
    message: version + chrome.i18n.getMessage('update_reminder'),
    buttons: [{'title':chrome.i18n.getMessage('update_button')}]
  }, function(){
    chrome.notifications.onButtonClicked.addListener(function(buttonIndex){
      chrome.runtime.reload();
    });
  });
}
