$(function() {
  if(ConfigObj.get('isopen')){
    $('#switch').attr('checked', true);
  }
  $('#switch').change(function() {
    var s = $(this).is(':checked');
    ConfigObj.save('isopen', s);
  });
})
