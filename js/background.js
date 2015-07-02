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
    //get data from indexedDB

      //transefer the bookmarks tree to list
      BookmarkData.change_tree_node_to_list(bookmarks);
      //get has_visited_list
      BookmarkData.get_has_visited_list();


    var all_length            = BookmarkData.all_bookmarks.length;
    var visited_list_length   = BookmarkData.has_visited_list.length;

    if(all_length!=visited_list_length){
      for(var i in BookmarkData.all_bookmarks){
        if(!BookmarkData.has_visited_list.isKeyExist(i)){
          BookmarkObj.visit(i, BookmarkData.all_bookmarks[i].url );
          BookmarkData.add_to_has_visited_list(i);
          return;
        }
      }
    } else {
      var tmp = null;
      for(var i = BookmarkData.last_visited_index; i<visited_list_length; i++){
        if(i+1==visited_list_length){
          var key = BookmarkData.visited_index[i];
          BookmarkObj.visit(
            key,
            BookmarkData.has_visited_list[key].bookmark_url
          );
          BookmarkData.set_to_has_visited_list(key);
          BookmarkData.last_visited_index = 0;
        }
        var aKey  = BookmarkData.visited_index[i];
        var bKey  = BookmarkData.visited_index[i+1];
        if(BookmarkData.has_visited_list[aKey]==BookmarkData.has_visited_list[bKey]){
          BookmarkObj.visit(aKey, BookmarkData.all_bookmarks[aKey].url );
          BookmarkData.set_to_has_visited_list(aKey);
        }
      }
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
    var update_properties = {url: url};
    chrome.tabs.update(BookmarkObj.tab_id, update_properties);
    Common.show_msg(
      chrome.i18n.getMessage('notificationtitle'),
      BookmarkData.all_bookmarks[i].title
    );
    console.log( url );
  }
}
//Data
var BookmarkData  = {
  'has_visited_list': [],//id => visited times
  'all_bookmarks': {},
  'all_index':[],
  'visited_index': [],
  'last_visited_index':0,
  'data_tmpl': function(id, count, url){
    return {bookmark_id: id, bookmark_count: count, bookmark_url: url};
  },
  'change_tree_node_to_list': function(node){
    for(var i in node){
      if(node[i].children!=null){
        BookmarkData.change_tree_node_to_list(node[i].children);
      } else {
        BookmarkData.all_bookmarks[node[i].id] = node[i];
        BookmarkData.all_index.push(node[i].id);
      }
    }
  },
  'get_has_visited_list': function(){
    if(BookmarkData.has_visited_list===[])return;
    AppDB.read('all', null, function(res){
      if(res){
        BookmarkData.has_visited_list = res;
        for(var i in res){
          BookmarkData.visited_index.push(res[i].bookmark_id);
        }
      } else {
        BookmarkData.has_visited_list = [];
      }
    });
  },
  'add_to_has_visited_list': function(key){
    if(key){
      var t = BookmarkData.data_tmpl(key, 1, BookmarkData.all_bookmarks[key].url);
      AppDB.add( t, function(){
        BookmarkData.has_visited_list[key]  = t;
        BookmarkData.visited_index.push(key);
      });
    }
  },
  'set_to_has_visited_list': function(key){
    if(key){
      var num = BookmarkData.has_visited_list[key].bookmark_count + 1;
      var t = BookmarkData.data_tmpl(key, num, BookmarkData.has_visited_list[key].bookmark_url);
      AppDB.update(key, t, function(){
        BookmarkData.has_visited_list[key]  = t;
      });
    }
  }
}

chrome.tabs.onCreated.addListener(BookmarkObj.check);
