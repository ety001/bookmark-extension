$(function() {
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
    $('#clearbtn').removeClass('btn_grey');
    chrome.browserAction.setIcon({path:pop_icon});
  } else {
    $('#switch').attr('checked', false);
    $('#clearbtn').addClass('btn_grey');
    chrome.browserAction.setIcon({path:pop_icon_black});
  }

  $('#clearbtn').html( chrome.i18n.getMessage('clearbtn') );

  $('#switch').change(function() {
    var s = $(this).is(':checked');
    ConfigObj.save('isopen', s);
    $('#clearbtn').click(clear_func);
    if(s){
      chrome.browserAction.setIcon({path:pop_icon});
      $('#clearbtn').removeClass('btn_grey');
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_open_success') );
    } else {
      chrome.browserAction.setIcon({path:pop_icon_black});
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_close_success') );
    }
  });

  if(ConfigObj.get('last_visited_index')){
    $('#clearbtn').click(clear_func);
  }
  
  var clear_func = function(){
    ConfigObj.clearcache();
    AppDB.delAll(function(){});
    if(ConfigObj.get('isopen')){
      $('#switch').attr('checked', true);
      $('#clearbtn').removeClass('btn_grey');
      chrome.browserAction.setIcon({path:pop_icon});
    } else {
      $('#switch').attr('checked', false);
      $('#clearbtn').addClass('btn_grey');
      chrome.browserAction.setIcon({path:pop_icon_black});
    }
    Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('clearmsg') );
    $(this).off();
  };
})
