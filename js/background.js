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

    if(BookmarkData.last_visited_index < BookmarkData.all_length){
      AppDB.read(
        BookmarkData.all_bookmarks[BookmarkData.last_visited_index].id,
        null,
        BookmarkData.get_has_visited_item
      );
      BookmarkObj.visit(
        BookmarkData.last_visited_index,
        BookmarkData.all_bookmarks[BookmarkData.last_visited_index].url
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
    var update_properties = {url: url};
    chrome.tabs.update(BookmarkObj.tab_id, update_properties);
    Common.show_msg(
      chrome.i18n.getMessage('notificationtitle'),
      BookmarkData.all_bookmarks[i].title
    );
  }
}
//Data
var BookmarkData  = {
  'all_bookmarks': {},
  'all_length':0,
  'last_visited_index':0,
  'data_tmpl': function(id, count, url){
    return {bookmark_id: id, bookmark_count: count, bookmark_url: url};
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
      BookmarkData.add_to_has_visited_list(BookmarkData.all_bookmarks[BookmarkData.last_visited_index].id);
    } else {
      BookmarkData.set_to_has_visited_list(res);
    }
  },
  'add_to_has_visited_list': function(key){
    if(key){
      var t = BookmarkData.data_tmpl(key, 1, BookmarkData.all_bookmarks[BookmarkData.last_visited_index].url);
      AppDB.add( t, function(){
        if( (BookmarkData.last_visited_index+1) == BookmarkData.all_bookmarks.length ){
          BookmarkData.last_visited_index = 0;
        } else {
          BookmarkData.last_visited_index++;
        }
      });
    }
  },
  'set_to_has_visited_list': function(res){
    if(res.length){
      res[0].bookmark_count++;
      AppDB.update(res[0].bookmark_id, res[0], function(){
        if( (BookmarkData.last_visited_index+1) == BookmarkData.all_bookmarks.length ){
          BookmarkData.last_visited_index = 0;
        } else {
          BookmarkData.last_visited_index++;
        }
      });
    }
  }
}

chrome.tabs.onCreated.addListener(BookmarkObj.check);
