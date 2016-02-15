$(function(){
  function addweibo(tab){
    var weibo_url = "http://www.jiathis.com/send/?webid=tsina&url="+tab.url+"&title=@ETY001%25"+encodeURI(tab.title);
    $('#weibo').attr('href', weibo_url);
  }
  var tab_id;
  var url;
  if(window.localStorage.preview_switch=='on'){
    $('#openpreview').hide();
  } else {
    $('#closepreivew').hide();
  }

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
    "notitle_text"
  ];

  var port = chrome.runtime.connect({name: "bookmark_manager_ety001"});

  $('#block').click(function(){
    port.postMessage({ctype:"block",cdata:tab_id});
    port.postMessage({ctype:"getbookmark",cdata:false});
  });
  $('#nouse').click(function(){
    port.postMessage({ctype:"remove_bookmark",cdata:tab_id});
    port.postMessage({ctype:"getbookmark",cdata:false});
  });

  $('#openpreview').click(function(){
    window.localStorage.preview_switch='on';
    $(this).hide();
    $('iframe').attr('src', url);
    $('#closepreivew').show();
  });

  $('#closepreivew').click(function(){
    window.localStorage.preview_switch='off';
    $(this).hide();
    $('iframe').attr('src', '');
    $('#openpreview').show();
  });

  $('#blockmanager').click(function(e){
    e.stopPropagation();
    port.postMessage({ctype:"get_block_list",cdata:false});
    $('#blocklist').animate({right: 0});
  });

  $('#screen,#frame').click(function(e){
    e.stopPropagation();
    $('#blocklist').animate({right: "-"+$('#blocklist').width()+"px"});
  });

  port.postMessage({ctype:"getbookmark",cdata:false});
  port.postMessage({ctype:"lang", cdata:lang_req});
  port.onMessage.addListener(function(msg) {
    //console.log(msg);
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'getbookmark':
        var title = cdata[0].title;
        url = cdata[0].url + "#review_bookmark";
        tab_id = cdata[0].id;
        $('#bookmark_title').html(title+" | "+url);
        if(window.localStorage.preview_switch=='on'){
          $('iframe').attr('src', url);
        }
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
        $('#chat').html(cdata.chat);
        $('#blockmanager').html(cdata.blockmanager);
        $('#blockmanager_title').html(cdata.blockmanager);
        $('#notitle_text').val(cdata.notitle_text);
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
      case 'get_block_list':
        if(cdata){
          var tmpl = '';
          var notitle_text = $('#notitle_text').val();
          for(var i in cdata){
            tmpl += '<li id="blockitem_'+cdata[i].id+'" class="pure-menu-item">';
            if(cdata[i].url.match(/javascript\:/)==null){
              var list_url = cdata[i].url + "#review_bookmark";
            } else {
              var list_url = '#';
            }
            tmpl += '<a href="'+ list_url +'" class="pure-menu-link" target="_blank">';
            if(cdata[i].title!=''){
              var title = cdata[i].title;
            } else {
              var title = notitle_text;
            }
            tmpl += title +'</a><hr>';
            tmpl += '<button data-id="'+cdata[i].id+'" class="cancelblock button-yellow pure-button">cancel</button></li>';
          }
          $('#blocklist .pure-menu-list').html( $(tmpl) );
          $('.cancelblock').click(function(){
            var tab_id = $(this).attr('data-id');
            $(this).parent().animate({right: "-"+$('#blocklist').width()+"px"}, function(){
              $(this).parent().remove();
            });
            port.postMessage({ctype:"cancelblock",cdata:tab_id});
          });
        }
        break;
      case 'cancelblock':
        break;
    }
  });
});
