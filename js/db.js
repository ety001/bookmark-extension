var db_config   = {
  db_name: 'bookmarks',
  db_table: 'visited_log',
  db_keypath: 'bookmark_id',
  db_version: 3.0
}
var AppDB           = {
  db: null,
  indexedDB: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,
  open: function(){
    var request   = AppDB.indexedDB.open( db_config.db_name, db_config.db_version );
    request.onsuccess         = AppDB.success_func;
    request.onupgradeneeded   = AppDB.upgrade_func;
    request.onerror           = AppDB.error_func;
  },
  success_func: function(e){
    AppDB.db  = e.target.result;
    var db    = AppDB.db;
    if(!db.objectStoreNames.contains(db_config.db_table)){
      var store = db.createObjectStore(db_config.db_table, {keyPath: db_config.db_keypath});
    }
  },
  upgrade_func: function(e){
    var db    = e.target.result;
    if(db.objectStoreNames.contains(db_config.db_table)) {
        db.deleteObjectStore(db_config.db_table);
    }
    var store = db.createObjectStore(db_config.db_table, {keyPath: db_config.db_keypath});
  },
  error_func: function(e){
    console.log('connect error',e);
  },
  add: function(data, callback){
    var db  = AppDB.db;
    //create transaction
    var trans = db.transaction([db_config.db_table], 'readwrite');
    //create Store
    var store = trans.objectStore(db_config.db_table);
    var request = store.put(data);
    request.onsuccess = callback;
  },
  del: function(data_id, callback){
    var db  = AppDB.db;
    //create transaction
    var trans = db.transaction([db_config.db_table], 'readwrite');
    //create Store
    var store = trans.objectStore(db_config.db_table);
    var request = store.delete(data_id);
    request.onsuccess = callback;
  },
  delAll: function(callback){
    AppDB.read('all', null, function(res){
      if(res.length==0)return;
      for(var i in res){
        AppDB.del(res[i].bookmark_id, callback);
      }
    });
  },
  update: function(key, data, callback){
    var db  = AppDB.db;
    //create transaction
    var trans = db.transaction([db_config.db_table], 'readwrite');
    //create Store
    var store = trans.objectStore(db_config.db_table);
    var keyRange = IDBKeyRange.only(key);
    var cursorRequest = store.openCursor(keyRange);
    cursorRequest.onsuccess = function(e){
      var request  = e.target.result;
      if(request){
        var new_request = request.update(data);
        new_request.onsuccess = callback;
        request.continue();
      }
    }
  },
  read: function(a, b, callback){
    var db  = AppDB.db;
    //create transaction
    var trans = db.transaction([db_config.db_table], 'readwrite');
    //create Store
    var store = trans.objectStore(db_config.db_table);
    if(a=='all'){
      var keyRange = IDBKeyRange.lowerBound(0);
    } else if(b!=null) {
      var keyRange = IDBKeyRange.bound(a,b);
    } else {
      var keyRange = IDBKeyRange.only(a);
    }
    var cursorRequest = store.openCursor(keyRange);
    var result  = [];
    cursorRequest.onsuccess = function(e){
      var request = e.target.result;
      if(request!==null){
        result.push(request.value);
        request.continue();
      } else {
        callback(result);
      }
    };
  }
};
AppDB.open();
