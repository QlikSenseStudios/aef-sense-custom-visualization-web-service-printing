/**
 * @description The script will run on a node thread and will be executed by phantomjs-prebuilt
 *              It will pass system parameters used to identify Qlik Sense application, object 
 *              and what file extension to use (png, jpg). 
 * @author André R. Ferreira <andre.ferreira@qlik.com>
 * @author Corrado Lorefice <corrado.lorefice@qlik.com>
 */
(function () {
  "use strict";
  var system = require('system'),
    page = require('webpage').create();

  if (system.args.length !== 7) {
    console.log("Required system arguments missing");
    phantom.exit();
  }
  
  // Modify to suit your need 
  // @todo - move this to configuration and allow cmd arguments
  page.settings.userName = "DOMAIN\\USER";
  page.settings.password = "PASSWORDHERE";
  // Don"t change any thing else, unless you need to ;)
  
  
  if (system.args[5] === "true") {
    page.viewportSize = { width: 1024, height: 768 };
    page.clipRect = { top: 0, left: 0, width: 1024, height: 768 };
  }

  page.open(constructEndPoint(system.args) , function (status) {
    console.log("Opening page in Phantom");
    if (status === "fail") {
      phantom.exit(); 
    }

    setTimeout(function () {
      console.log("Rendering image");
      page.render("images/" + system.args[4]  + '.' + system.args[6]);
      phantom.exit();
    }, system.args[2] * 1000);
  });

  function constructEndPoint (args) {
    var requestUrl = args[1] + "?appid=" + args[3];
  
    if (args[5] === "true") {
      requestUrl += "&sheet=" + args[4];
    } else {
      requestUrl += "&obj=" + args[4];
    }
  
    requestUrl += "&opt=nointeraction";
    console.log(requestUrl);
    return requestUrl;
  } 

})();

