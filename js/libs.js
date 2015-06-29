var Common = {
  is_debug: true,
  show_msg: function(title, msg){
    var notifications_contents = {
      type: 'basic',
      iconUrl: "img/icon-48.png",
      title: title,
      message: msg
    };
    chrome.notifications.create('', notifications_contents, function(){});
  },
  debug: function(t){
    if(Common.is_debug){
      console.log(t);
    }
  }
}

var ConfigObj = {
  save: function(key, val){
    if(window.localStorage.config){
      var c = JSON.parse( window.localStorage.config );
    } else {
      var c = {};
    }
    c[key]  = val;
    window.localStorage.config  = JSON.stringify( c );
  },
  get: function(key){
    var c = window.localStorage.config;
    if(c){
      c = JSON.parse( c );
      return c[key];
    } else {
      return false;
    }
  },
  clearcache: function(){
    var c = {};
    window.localStorage.config = JSON.stringify(c);
  }
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

Array.prototype.isKeyExist = function (key) {
  for(var i in this){
    if(key==i){
      return true;
    } else {
      return false;
    }
  }
}

var DB = {
  db_name: 'bookmarks',
  db_version: '2.0',
  db_connect: null,
  db_obj: window.indexedDB,
  init: function(tablename){
    if(DB.db_connect)return;
    var request   = DB.db_obj.open( DB.db_name, DB.db_version );

    request.onsuccess = function (e) {
      // Old api: var v = "2-beta";
      Common.debug("success to open DB: " + DB.db_name);
      DB.db_connect = e.target.result;
      var db = DB.db_connect;
      if (db.setVersion) {
        Common.debug("in old setVersion: " + db.setVersion);
        if (db.version != DB.db_version) {
          var req = db.setVersion(DB.db_version);
          req.onsuccess = function () {
            if (db.objectStoreNames.contains(tablename)) {
              db.deleteObjectStore(tablename);
            }
            var store = db.createObjectStore(tablename, { keyPath: "timeStamp" });//keyPath：主键，唯一性

            var trans = req.result;
            trans.oncomplete = function (e) {
              console.log("== trans oncomplete ==");
              H5AppDB.indexedDB.getAllTodoItems();
            }
          };
        }
        else {
          H5AppDB.indexedDB.getAllTodoItems();
        }
      }
      else {
        H5AppDB.indexedDB.getAllTodoItems();
      }
    }

    //如果版本不一致，执行版本升级的操作
    request.onupgradeneeded = function (e) {
      Common.debug("going to upgrade our DB!");
      DB.db_connect = e.target.result;
      var db = DB.db_connect;
      if (db.objectStoreNames.contains(tablename)) {
        db.deleteObjectStore(tablename);
      }
      var store = db.createObjectStore(tablename, { keyPath: "timeStamp" });//NoSQL类型数据库中必须的主键，唯一性
      H5AppDB.indexedDB.getAllTodoItems();
    }
  }
}
