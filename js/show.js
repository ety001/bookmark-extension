$(function(){
  console.log('send');
  /*chrome.runtime.sendMessage({"command": {"ctype":"getbookmark","cdata":false}}, function(response) {
    console.log(response.res);
  });*/
  var port = chrome.runtime.connect({name: "bookmark_manager_ety001"});
  port.postMessage({ctype:"getbookmark",cdata:false});

  port.onMessage.addListener(function(msg) {
    console.log(msg);
    var ctype = msg.ctype;
    var cdata = msg.cdata;
    switch (ctype) {
      case 'getbookmark':
        console.log(cdata);
        break;
    }
  });
});
