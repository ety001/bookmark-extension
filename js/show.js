$(function(){
  $('#openpreview').hide();
  $('#closepreivew').hide();
  var tab_id;
  /*if(window.localStorage.preview_switch=='on'){
    $('#openpreview').hide();
  } else {
    $('#closepreivew').hide();
  }*/

  var lang_req = [
    "appname",
    "previewtext",
    "closepreivew",
    "openpreview",
    "donate",
    "openinnewtab",
    "block",
    "blocklist",
    "blockmsg",
    "nouse"
  ];

  var port = chrome.runtime.connect({name: "bookmark_manager_ety001"});

  $('#block').click(function(){
    port.postMessage({ctype:"block",cdata:tab_id});
  });
  $('#nouse').click(function(){
    port.postMessage({ctype:"remove_bookmark",cdata:tab_id});
  });

  port.postMessage({ctype:"getbookmark",cdata:false});
  port.postMessage({ctype:"lang", cdata:lang_req});
  port.onMessage.addListener(function(msg) {
    console.log(msg);
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'getbookmark':
        var title = cdata[0].title;
        var url = cdata[0].url;
        tab_id = cdata[0].id;
        $('#bookmark_title').html(title);
        $('iframe').attr('src', url);
        $('#openinnewtab').attr('href', url);
        break;
      case 'lang':
        $('#appname').html(cdata.appname);
        $('#previewtext').html(cdata.previewtext);
        $('#openinnewtab').html(cdata.openinnewtab);
        $('#openpreview').html(cdata.openpreview);
        $('#closepreivew').html(cdata.closepreivew);
        $('#block').html(cdata.block);
        $('#donate').html(cdata.donate);
        $('#blockmsg').html(cdata.blockmsg);
        $('#nouse').html(cdata.nouse);
        break;
      case 'block':
        if(cdata){
          $('#blockmsg').show();
          setTimeout(function(){
            $('#blockmsg').hide();
          },2000);
        }
        break;
      case 'remove_bookmark':
        if(cdata){
          $('#blockmsg').show();
          setTimeout(function(){
            $('#blockmsg').hide();
          },2000);
        }
        break;
    }
  });
});
