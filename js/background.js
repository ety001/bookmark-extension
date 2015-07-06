var cpa_obj = new Cpa();
var uid = GetUid.get();
cpa_obj.sendAppView(uid);
//init popicon
var pop_icon  = {
  "19": "img/icon-19.png",
  "38": "img/icon-38.png"
},
pop_icon_black  = {
  "19": "img/icon-19-black.png",
  "38": "img/icon-38-black.png"
};
if(ConfigObj.get('isopen')){
  $('#switch').attr('checked', true);
  chrome.browserAction.setIcon({path:pop_icon});
} else {
  $('#switch').attr('checked', false);
  chrome.browserAction.setIcon({path:pop_icon_black});
}

//bookmark object
var BookmarkObj = {
  'tab_id': 0,
  'check': function(tab){
    if(tab.url!='chrome://newtab/')return;
    BookmarkObj.tab_id    = tab.id;
    //charge whether open the plugin
    if(!ConfigObj.get('isopen'))return;
    //check if today bookmark has been visited
    //if(BookmarkObj.check_today_has_visited())return;
    //get bookmarks tree and run
    chrome.bookmarks.getTree(BookmarkObj.process);
  },
  'process': function(bookmarks){
    //transefer the bookmarks tree to list
    BookmarkData.all_bookmarks  = [];
    BookmarkData.all_length     = 0;
    BookmarkData.change_tree_node_to_list(bookmarks);
    BookmarkData.all_length     = BookmarkData.all_bookmarks.length;

    var last_visited_index  = BookmarkData.get_last_visited_index();
    if(last_visited_index < BookmarkData.all_length){
      AppDB.read(
        BookmarkData.all_bookmarks[last_visited_index].id,
        null,
        BookmarkData.get_has_visited_item
      );
      BookmarkObj.visit(
        last_visited_index,
        BookmarkData.all_bookmarks[last_visited_index].url
      );
    }

  },
  'check_today_has_visited': function(){//unuse
    var tmp_nowdate     = new Date().Format('yyyy-MM-dd');
    var last_visited_date   = ConfigObj.get('last_visited_date');
    //last_visited_date is empty.
    //It means that bookmark is not opened today
    if(!last_visited_date){
      ConfigObj.save('last_visited_date', tmp_nowdate);
      return false;
    }
    //check if bookmark is open today
    if(tmp_nowdate==last_visited_date){
      return true;
    } else {
      return false;
    }
  },
  'visit': function(i, url){
    BookmarkData.current_index  = i;
    Common.show_msg(
      chrome.i18n.getMessage('notificationtitle'),
      BookmarkData.all_bookmarks[i].title?
        BookmarkData.all_bookmarks[i].title:BookmarkData.all_bookmarks[i].url,
      [
        {'title':chrome.i18n.getMessage('notification_button_confirm')},
        {'title':chrome.i18n.getMessage('notification_button_ignore')}
      ]
    );
  },
  'notification_click_func': function(notification_id, button_index){
    if(BookmarkData.current_index==0)return;
    switch (button_index) {
      case 0:
        var update_properties = {url: BookmarkData.all_bookmarks[BookmarkData.current_index].url};
        chrome.tabs.update(BookmarkObj.tab_id, update_properties);
        cpa_obj.sendEvent('Bookmarks', 'Visit_'+update_properties.url);
        break;
      case 1:
        cpa_obj.sendEvent('Bookmarks', 'Ignore_'+BookmarkData.all_bookmarks[BookmarkData.current_index].url);
        break;
    }
  },
  'notification_onclose_func': function(notification_id, by_user){
    if(by_user){
      cpa_obj.sendEvent('Bookmarks', 'click_x');
    }
  },
  'remove_func': function(id, removeInfo){
    if(id){
      BookmarkData.rm_has_visited_item(id);
    }
  },
  'update_func': function(id, changeInfo){
    BookmarkData.update_has_visited_item(id, changeInfo.title, changeInfo.url);
  },
  'move_func': function(newid, moveInfo){
    BookmarkData.move_has_visited_item(newid, changeInfo);
  }
}
//Data
var BookmarkData  = {
  'current_index': 0,
  'all_bookmarks': {},
  'all_length':0,
  'data_tmpl': function(id, count, url){
    return {bookmark_id: id, bookmark_count: count, bookmark_url: url};
  },
  'set_last_visited_index':function(id){
    ConfigObj.save('last_visited_index', id);
  },
  'get_last_visited_index':function(){
    return ConfigObj.get('last_visited_index')?ConfigObj.get('last_visited_index'):0;
  },
  'change_tree_node_to_list': function(node){
    for(var i in node){
      if(node[i].children!=null){
        BookmarkData.change_tree_node_to_list(node[i].children);
      } else {
        if(typeof(node[i]) == 'object'){
          BookmarkData.all_bookmarks.push(node[i]);
        }
      }
    }
  },
  'get_has_visited_item': function(res){
    if(res.length==0){
      var last_visited_index  = BookmarkData.get_last_visited_index();
      BookmarkData.add_to_has_visited_list(BookmarkData.all_bookmarks[last_visited_index].id);
    } else {
      BookmarkData.set_to_has_visited_list(res);
    }
  },
  'add_to_has_visited_list': function(key){
    if(key){
      var last_visited_index  = BookmarkData.get_last_visited_index();
      var t = BookmarkData.data_tmpl(key, 1, BookmarkData.all_bookmarks[last_visited_index].url);
      AppDB.add( t, function(){
        var last_visited_index  = BookmarkData.get_last_visited_index();
        if( (last_visited_index+1) == BookmarkData.all_bookmarks.length ){
          BookmarkData.set_last_visited_index(0);
        } else {
          BookmarkData.set_last_visited_index( last_visited_index+1 );
        }
      });
    }
  },
  'set_to_has_visited_list': function(res){
    if(res.length){
      res[0].bookmark_count++;
      AppDB.update(res[0].bookmark_id, res[0], function(){
        var last_visited_index  = BookmarkData.get_last_visited_index();
        if( (last_visited_index+1) == BookmarkData.all_bookmarks.length ){
          BookmarkData.set_last_visited_index(0);
        } else {
          BookmarkData.set_last_visited_index( last_visited_index+1 );
        }
      });
    }
  },
  'rm_has_visited_item': function(bookmark_id){
    if(bookmark_id){
      AppDB.del(bookmark_id, function(){});
    }
  },
  'move_has_visited_item': function(newid, changeInfo){
    AppDB.read(changeInfo.oldIndex, null ,function(res){
      if(res.length){
        var new_data  = res[0];
        new_data.bookmark_id  = newid;
        AppDB.del(changeInfo.oldIndex, function(){
          AppDB.add( new_data , function(){});
        });
      }
    });
  },
  'update_has_visited_item': function(bookmark_id, title, url){
    AppDB.read(bookmark_id, null, function(res){
      if(res[0]){
        res[0].url  = url;
        AppDB.update(bookmark_id, res[0], function(){});
      }
    });
  }
}

chrome.tabs.onCreated.addListener(BookmarkObj.check);
chrome.bookmarks.onRemoved.addListener(BookmarkObj.remove_func);
chrome.bookmarks.onChanged.addListener(BookmarkObj.update_func);
chrome.bookmarks.onMoved.addListener(BookmarkObj.move_func);
chrome.notifications.onButtonClicked.addListener(BookmarkObj.notification_click_func);
chrome.notifications.onClosed.addListener(BookmarkObj.notification_onclose_func);
