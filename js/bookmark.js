/**
 * list中存储了所有的index=>bookmark_id对应关系，
 * 应该保证用户在操作bookmark的时候（即增删改）
 * list，visit，jump，total能同步
 */
var Bookmark = {
  total: 0,
  list: {},//所有书签的id列表
  visit: {},//书签的访问次数
  jump: {},//书签是否弹出提醒,1不弹出，0||null||undefined弹出
  curt_index: window.localStorage.curt_index?window.localStorage.curt_index:-1,
  //初始化
  init: function(){
    if(window.localStorage.bookmarks!==undefined
      &&window.localStorage.bookmarks!==''){
        Bookmark.list = JSON.parse(window.localStorage.bookmarks);
        Bookmark.visit = JSON.parse(window.localStorage.visit);
        Bookmark.jump = JSON.parse(window.localStorage.jump);
        Bookmark.total = Bookmark.get_length(Bookmark.list);
        console.log('get_bookmark_from_localStorage_ok');
    } else {
      Bookmark.get_bookmark();
      console.log('get_bookmark_ok');
    }
  },
  //把书签信息存入localStorage
  get_bookmark: function(){
    chrome.bookmarks.getTree(function(bookmark_obj){
      console.log('getTree');
      Bookmark.total = 0;
      Bookmark.list = {};
      Bookmark.change_tree_node_to_list(bookmark_obj);
      Bookmark.persist_all();
    });
  },
  //把树形数据转成列表数据
  change_tree_node_to_list: function(node){
    for(var i in node){
      if(node[i].children!=null){
        Bookmark.change_tree_node_to_list(node[i].children);
      } else {
        if(typeof(node[i]) == 'object'){
          Bookmark.list[Bookmark.total++] = node[i].id;
          Bookmark.visit[node[i].id] = 0;
        }
      }
    }
  },
  //持久化
  persist_all: function(){
    Bookmark.persist_bookmarks();
    Bookmark.persist_visit();
    Bookmark.persist_jump();
  },
  persist_bookmarks: function(){
    window.localStorage.bookmarks = JSON.stringify(Bookmark.list);
  },
  persist_visit: function(){
    window.localStorage.visit = JSON.stringify(Bookmark.visit);
  },
  persist_jump: function(){
    window.localStorage.jump = JSON.stringify(Bookmark.jump);
  },
  //获取对象长度
  get_length: function(obj){
    if(typeof(obj)=='object'){
      var i = 0;
      for(var each in obj){
        i++;
      }
      return i;
    } else {
      return 0;
    }
  },
  //获取一个书签
  get_from_local: function(callback){
    if(Bookmark.total==0)return false;
    //get next index
    Bookmark.curt_index = Bookmark.find_next_index();
    //console.log('index',Bookmark.curt_index);
    //get bookmark
    chrome.bookmarks.get(Bookmark.list[Bookmark.curt_index], callback);
    //persist
    window.localStorage.curt_index = Bookmark.curt_index;
  },
  get_from_origin: function(id, callback){
    chrome.bookmarks.get(id, callback);
  },
  //找寻下一个index
  find_next_index: function(){
    Bookmark.curt_index++;
    for(var i = Bookmark.curt_index;;i++){
      if(i>Bookmark.total){
        i=-1;
      }
      if(Bookmark.list[i]!=undefined && Bookmark.jump[Bookmark.list[i]]!=1){
        return i;
      }
    }
  },
  //设置一个书签跳过
  set_jump: function(tab_id, val){
    if(val==undefined)val=1;
    if(val==1){
      Bookmark.jump[tab_id] = val;
    } else {
      delete(Bookmark.jump[tab_id]);
    }
    Bookmark.persist_jump();
  },
  //添加一个书签
  add_bookmark: function(id, bm){
    //console.log(id, bm);
    //不是目录则进行同步
    if(bm.url!=undefined){
      Bookmark.visit[id] = 0;
      Bookmark.get_bookmark();
    }
  },
  //删除书签
  rm_bookmark: function(id, remove_info){
    //console.log(id, remove_info);
    if(remove_info.node.children==undefined){
      //删除了一个书签
      delete(Bookmark.visit[remove_info.node.id]);
      delete(Bookmark.jump[remove_info.node.id]);
    } else {
      //删除了一个目录
      Bookmark.rm_folder(remove_info.node.children);
    }
    Bookmark.get_bookmark();
  },
  rm_bookmark_by_id: function(id, callback){
    chrome.bookmarks.remove(id, callback);
  },
  //删除书签目录
  rm_folder: function(node){
    for(var i in node){
      if(node[i].children!=null){
        Bookmark.change_tree_node_to_list(node[i].children);
      } else {
        if(typeof(node[i]) == 'object'){
          delete(Bookmark.visit[node[i].id]);
          delete(Bookmark.jump[node[i].id]);
        }
      }
    }
  }
}
