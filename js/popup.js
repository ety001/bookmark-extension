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
    chrome.browserAction.setIcon({path:pop_icon});
  } else {
    $('#switch').attr('checked', false);
    chrome.browserAction.setIcon({path:pop_icon_black});
  }

  $('#clearbtn').html( chrome.i18n.getMessage('clearbtn') );

  $('#switch').change(function() {
    var s = $(this).is(':checked');
    ConfigObj.save('isopen', s);
    if(s){
      chrome.browserAction.setIcon({path:pop_icon});
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_open_success') );
    } else {
      chrome.browserAction.setIcon({path:pop_icon_black});
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_close_success') );
    }
  });

  $('#clearbtn').click(function(){
    ConfigObj.clearcache();
    if(ConfigObj.get('isopen')){
      $('#switch').attr('checked', true);
      chrome.browserAction.setIcon({path:pop_icon});
    } else {
      $('#switch').attr('checked', false);
      chrome.browserAction.setIcon({path:pop_icon_black});
    }
    Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('clearmsg') );
    /*$('#msg').html( chrome.i18n.getMessage('clearmsg') ).css('visibility', 'visible');
    setTimeout(function(){
      $('#msg').html(' ').css('visibility', 'hidden');
    },1000);*/
  });
})
