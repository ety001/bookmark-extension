$(function(){
  var url;
  var timeout_id;
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
        $('#bookmark_tip_ety001_openinnewtab').html(cdata.openinnewtab);
        $('#bookmark_tip_ety001_block').html(cdata.block);
        $('#bookmark_tip_ety001_nouse').html(cdata.nouse);
        $('#bookmark_tip_ety001_blockmsg').html(cdata.blockmsg);
        $('#bookmark_tip_ety001_setting').html(cdata.setting);
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
  function tip_dom(title, url){
    var tip_html = $('<div class="bookmark_tip_ety001"></div>');
    $('body').append($(tip_html));
    $('.bookmark_tip_ety001').append($('<div id="bookmark_tip_ety001_close">X</div>'));
    $('.bookmark_tip_ety001').append($('<div id="bookmark_tip_ety001_box" class="pure-g"></div>'));
    $('#bookmark_tip_ety001_box').append($('<div class="pure-u-1 bookmark_tip_ety001_title">'+title+'</div>'));
    $('#bookmark_tip_ety001_box').append($('<div class="pure-u-1 bookmark_tip_ety001_url">'+url+'</div>'));
    $('#bookmark_tip_ety001_box').append($('<div class="pure-u-1" id="bookmark_tip_ety001_btn_box"></div>'));
    if(url.match(/javascript\:/)==null){
      url = url;
    } else {
      url = '#';
    }
    $('#bookmark_tip_ety001_btn_box').append($('<button id="bookmark_tip_ety001_openinnewtab" data-url="'+url+'" class="pure-button-primary pure-button"></button>'));
    $('#bookmark_tip_ety001_btn_box').append($('<button id="bookmark_tip_ety001_block" class="button-warning pure-button"></button>'));
    $('#bookmark_tip_ety001_btn_box').append($('<button id="bookmark_tip_ety001_nouse" class="button-error pure-button"></button>'));
    $('#bookmark_tip_ety001_btn_box').append($('<button id="bookmark_tip_ety001_setting" class="pure-button"></button>'));
    $('#bookmark_tip_ety001_box').append($('<div class="pure-u-1"><div id="blockmsg" style="display:none;"></div></div>'));
    $('#bookmark_tip_ety001_openinnewtab').click(function(){
      var url = $(this).attr('data-url');
      if(url!='#'){
        window.open(url);
      }
    });
    $('#bookmark_tip_ety001_block').click(function(){
      port.postMessage({ctype:"block",cdata:tab_id});
    });
    $('#bookmark_tip_ety001_nouse').click(function(){
      port.postMessage({ctype:"remove_bookmark",cdata:tab_id});
    });
    $('#bookmark_tip_ety001_setting').click(function(){
      window.open(chrome.extension.getURL("show.html"));
    })
    $('.bookmark_tip_ety001').animate({right:'0'});
    $('#bookmark_tip_ety001_close').click(function(){
      close_tip();
    });
    timeout_id = setTimeout(function(){
      close_tip();
    },3000);
    $('.bookmark_tip_ety001').mouseover(function(){
      clearTimeout(timeout_id);
    }).mouseout(function(){
      timeout_id = setTimeout(function(){
        close_tip();
      },3000);
    });
    port.postMessage({ctype:"lang", cdata:lang_req});
  }
  function close_tip(){
    $('.bookmark_tip_ety001').animate({right:'-360px'}, function(){
      $('.bookmark_tip_ety001').remove();
    });
  }
})
