var BookmarkObj = {
  'tmplist': [],
  'check': function(tabId, info, tab){
    if(tab.status=='complete'){
      chrome.bookmarks.getTree(function(bookmarks){
        BookmarkObj.change_tree_node_to_list(bookmarks);
        console.log(BookmarkObj.tmplist);
      })
    }
  },
  '_check_is_open': function(){

  },
  'change_tree_node_to_list': function(node){
    for(var i in node){
      if(node[i].children!=null){
        BookmarkObj.change_tree_node_to_list(node[i].children);
      } else {
        BookmarkObj.tmplist[node[i].id] = node[i];
      }
    }
  }
}
chrome.tabs.onUpdated.addListener(BookmarkObj.check);
