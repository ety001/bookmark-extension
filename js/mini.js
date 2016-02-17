$(function(){
  var url;
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
    "nouse",
    "chat",
    "blockmanager",
    "notitle_text",
    "mini_switch",
    "open_text",
    "close_text",
    "pages_review",
    "newtab",
    "setting"
  ];
  var port = chrome.runtime.connect({name: "bookmark_manager_ety001"});
  port.postMessage({ctype:"getbookmark_from_mini",cdata:false});
  port.onMessage.addListener(function(msg) {
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'getbookmark_from_mini':
        if(cdata==false)return;
        var title = cdata[0].title;
        url = cdata[0].url;
        tab_id = cdata[0].id;
        tip_dom(title, url);
        //console.log(cdata);
        break;
      case 'lang':
        $('#openinnewtab').html(cdata.openinnewtab);
        $('#block').html(cdata.block);
        $('#nouse').html(cdata.nouse);
        $('#blockmsg').html(cdata.blockmsg);
        $('#setting').html(cdata.setting);
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
      case 'getsettingpage':
        $('#setting').attr('href', cdata);
        break;
    }
  });
  function tip_dom(title, url){
    var tip_html = $('<div class="bookmark_tip"></div>');
    $('body').append($(tip_html));
    $('.bookmark_tip').append($('<div id="box" class="pure-g"></div>'));
    $('#box').append($('<div class="pure-u-1 title">'+title+'</div>'));
    $('#box').append($('<div class="pure-u-1 url">'+url+'</div>'));
    $('#box').append($('<div class="pure-u-1" id="btn_box"></div>'));
    if(url.match(/javascript\:/)==null){
      url = url;
    } else {
      url = '#';
    }
    $('#btn_box').append($('<button id="openinnewtab" data-url="'+url+'" class="pure-button-primary pure-button"></button>'));
    $('#btn_box').append($('<button id="block" class="button-warning pure-button"></button>'));
    $('#btn_box').append($('<button id="nouse" class="button-error pure-button"></button>'));
    $('#btn_box').append($('<a id="setting" class="pure-button" target="_blank"></a>'));
    $('#box').append($('<div class="pure-u-1"><div id="blockmsg" style="display:none;"></div></div>'));
    $('#openinnewtab').click(function(){
      var url = $(this).attr('data-url');
      if(url!='#'){
        window.open(url);
      }
    });
    $('#block').click(function(){
      port.postMessage({ctype:"block",cdata:tab_id});
    });
    $('#nouse').click(function(){
      port.postMessage({ctype:"remove_bookmark",cdata:tab_id});
    });
    $('.bookmark_tip').animate({right:'0'});
    setTimeout(function(){
      $('.bookmark_tip').animate({right:'-360px'});
    },5000);
    port.postMessage({ctype:"getsettingpage",cdata:false});
    port.postMessage({ctype:"lang", cdata:lang_req});
  }
})
