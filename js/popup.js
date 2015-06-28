$(function() {
  if(ConfigObj.get('isopen')){
    $('#switch').attr('checked', true);
  }

  $('#clearbtn').html( chrome.i18n.getMessage('clearbtn') );

  $('#switch').change(function() {
    var s = $(this).is(':checked');
    ConfigObj.save('isopen', s);
    if(s){
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_open_success') );
    } else {
      Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('switch_close_success') );
    }
  });

  $('#clearbtn').click(function(){
    ConfigObj.clearcache();
    if(ConfigObj.get('isopen')){
      $('#switch').attr('checked', true);
    } else {
      $('#switch').attr('checked', false);
    }
    Common.show_msg(chrome.i18n.getMessage('appname') , chrome.i18n.getMessage('clearmsg') );
    /*$('#msg').html( chrome.i18n.getMessage('clearmsg') ).css('visibility', 'visible');
    setTimeout(function(){
      $('#msg').html(' ').css('visibility', 'hidden');
    },1000);*/
  });
})
