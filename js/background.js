var BookmarkObj = {
  'check': function(tabId, info, tab){
    //when tab status is not "complete", function return;
    if(tab.status!='complete')return;
    //charge whether open the plugin
    if(ConfigObj.get('isopen')==false)return;
    //check if today bookmark has been visited
    //if(BookmarkObj.check_today_has_visited())return;
    //get bookmarks tree and run
    chrome.bookmarks.getTree(BookmarkObj.process);
  },
  'process': function(bookmarks){
    //transefer the bookmarks tree to list
    BookmarkData.change_tree_node_to_list(bookmarks);
    //get has_visited_list
    BookmarkData.get_has_visited_list();

    for(var i in BookmarkData.all_bookmarks){
      if(!BookmarkData.has_visited_list.isKeyExist(i)){
        BookmarkObj.visit( BookmarkData.all_bookmarks[i].url );
        BookmarkData.add_to_has_visited_list(i);
        return;
      }
    }

    var visited_list_length   = BookmarkData.has_visited_list.length;
    for(var i in BookmarkData.has_visited_list){
      if(i==visited_list_length){
        BookmarkObj.visit( BookmarkData.all_bookmarks[i].url );
        BookmarkData.set_to_has_visited_list(i);
        return;
      }
      if(BookmarkData.has_visited_list[i+1]==BookmarkData.has_visited_list[i]){
        BookmarkObj.visit( BookmarkData.all_bookmarks[i].url );
        BookmarkData.set_to_has_visited_list(i);
        return;
      }
    }
  },
  'check_today_has_visited': function(){
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
  'visit': function(url){
    console.log( url );
  }
}

//Data
var BookmarkData  = {
  'has_visited_list': [],//id => visited times
  'all_bookmarks': {},
  'change_tree_node_to_list': function(node){
    if(BookmarkData.all_bookmarks==={})return;
    for(var i in node){
      if(node[i].children!=null){
        BookmarkData.change_tree_node_to_list(node[i].children);
      } else {
        BookmarkData.all_bookmarks[node[i].id] = node[i];
      }
    }
  },
  'get_has_visited_list': function(){
    if(BookmarkData.has_visited_list===[])return;
    BookmarkData.has_visited_list = ConfigObj.get('has_visited_list')?
                                      ConfigObj.get('has_visited_list'):
                                      [];
  },
  'add_to_has_visited_list': function(key){
    if(key){
      BookmarkData.has_visited_list[key]  = 1;
      ConfigObj.save('has_visited_list', BookmarkData.has_visited_list);
    }
  },
  'set_to_has_visited_list': function(key){
    if(key){
      BookmarkData.has_visited_list[key]++;
      ConfigObj.save('has_visited_list', BookmarkData.has_visited_list);
    }
  }
}

chrome.tabs.onUpdated.addListener(BookmarkObj.check);
