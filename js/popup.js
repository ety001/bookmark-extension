$(function() {
  if(ConfigObj.get('isopen')){
    $('#switch').attr('checked', true);
  }

  $('#clearbtn').html( chrome.i18n.getMessage('clearbtn') );

  $('#switch').change(function() {
    var s = $(this).is(':checked');
    ConfigObj.save('isopen', s);
  });

  $('#clearbtn').click(function(){
    ConfigObj.clearcache();
    if(ConfigObj.get('isopen')){
      $('#switch').attr('checked', true);
    } else {
      $('#switch').attr('checked', false);
    }
    $('#msg').html( chrome.i18n.getMessage('clearmsg') ).css('visibility', 'visible');
    setTimeout(function(){
      $('#msg').html(' ').css('visibility', 'hidden');
    },1000);
  });
})
