$(function(){
  $('title').html( chrome.i18n.getMessage('appname') );
  var bookmark_id = Common.get_query_str('id');
  if(!bookmark_id)return;
  chrome.bookmarks.get(bookmark_id, function(node){
    if(node.length&&node[0].url){
      $('#browser').attr('src', node[0].url);
      $('#bookmark-name').html(node[0].title?node[0].title:node[0].url);
    }
    console.log(node);
  });
});
