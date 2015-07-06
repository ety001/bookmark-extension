//google-analytics
var Cpa = function(){
  var service = analytics.getService('review-bookmarks');
  var tracker = service.getTracker('UA-64832923-1');
  return tracker;
}

var Common = {
  is_debug: true,
  show_msg: function(title, msg, btn){
    var notifications_contents = {
      type: 'basic',
      iconUrl: "img/icon-48.png",
      title: title,
      message: msg
    };
    if(btn){
      notifications_contents.buttons = btn;
    }
    chrome.notifications.create('', notifications_contents, function(){});
  },
  debug: function(t){
    if(Common.is_debug){
      console.log(t);
    }
  },
  get_query_str: function (name) {
     var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)","i");
     var r = window.location.search.substr(1).match(reg);
     if (r!=null) return (r[2]); return null;
  },
  random_str: function (len) {
  　　len = len || 32;
  　　var $chars = 'ABCDEFGHJKLMNPQRSTWXYZabcdefhijklmnoprstwxyz012345678';
  　　var maxPos = $chars.length;
  　　var pwd = '';
  　　for (i = 0; i < len; i++) {
  　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  　　}
  　　return pwd;
  }
}

var GetUid = {
  get: function(){
    if(window.localStorage.uid){
      var uid = window.localStorage.uid;
    } else {
      var d   = new Date();
      var uid = Common.random_str() + d.getSeconds() + d.getMinutes() + d.getMilliseconds();
      window.localStorage.uid = uid;
    }
    return uid;
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
