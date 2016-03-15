/**
 * @description Web service with 2 endpoints:
 *  - ping (GET): check if the web service is up and runining and responsive
 *  - getImage (POST) : download image of image from a Qlik Sense Object. It has 4 GET arguments:
 *     - appID {string}
 *     - objectId {string}
 *     - isSheet (optional) {boolean} - true or false
 *     - extension (optional) {string} - jpg or png
 * @author André R. Ferreira <andre.ferreira@qlik.com>
 * @copyright Qliktech 2016 - All rights reserved
 */
(function () { 
  "use strict";

  var express = require("../grunt/node_modules/express"),
    phantomjs = require("../grunt/node_modules/phantomjs-prebuilt"),
    childProcess = require("child_process"),
    path = require("path"),
    fs = require("fs"),
    app = express(),
    env = process.env.environment || "development",
    config;


  // Modify to suit your need 
  config = {
    port : process.argv.PORT || 1977,
    wait : 10,
    senseInstanceURL : "http://localhost:4848"
  };
  // Don"t change any thing else, unless you need to ;)


  prepareCommandLineArguments(process.argv, config);


  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


  app.use("/images", express.static(__dirname + '/images'));


  /**
   * The endpoint accepts 4 parameters: appId, objectId, isSheet and imageExtension (jpg or png)
   * A webpage with Qlik Sense Single URL will be used to render the extension.
   * The render will need time to download all of the files, but once its done it will
   * donwload a image to the /images folder wich is after sent back to the web client.
   */
  app.post("/getImage", function (request, response) {
    var extension = request.query.extension || "png",
      isSheet = (request.query.isSheet && request.query.isSheet.toLowerCase() === 'true') || false,
      childArgs = [
        path.join(__dirname, "renderWebpage.js"),
        config.senseInstanceURL + "/single",
        config.wait,
        request.query.appId,
        request.query.objectId,
        isSheet,
        extension
      ];

    console.log("\nRequest received! endpoint: /getImage");
    
    if (!request.query.appId || request.query.appId === "null" ||!request.query.objectId) {
      console.log("invalid or missing appId or objectId\n");
      response.status(400).send("Mandatory parameters missing! usage: /getImage?appId=foo&objectId=bar");
      return -1;
    }
    
    if (request.query.objectId.indexOf(".") !== -1 || request.query.objectId.indexOf("\\") !== -1 || request.query.objectId.indexOf("/") !== -1) {
      console.log("ALERT! Possibel path traversal attack attempted:" + request.query.objectId);
      response.status(400).send("There was an error creating the image!");
      return -1;
    }

    console.log("Application ID:", request.query.appId);
    console.log("objectId: ", request.query.objectId);
    console.log("isSheet:", isSheet);
    console.log("Extension:", extension);
    console.log("Processing ...");

    childProcess.execFile(phantomjs.path, childArgs, function(err, stdout, stderr) {
      if (err || stdout.length < 1) {
        console.log(err, stderr);
        response.status(400).send("There was an error creating the image!");
        return -1;
      }
 
      console.log("Sucessfull image creation", stdout, "./images/" + request.query.objectId + "." + extension);
      getFile("./images/" + request.query.objectId + "." + extension, response);

    });
 
    return 1;

  });

  /**
   * Allows a developer to query the server to ensure its alive
   */
  app.get("/ping", function (request, response) {
    console.log("\nRequest received! endpoint: /ping");
    response.json({ pong : Date.now() }); 
  });


  app.listen(config.port, function () {
    console.log("\nInitializing script");
    console.log(" - Qlik Sense Server:", config.senseInstanceURL);
    console.log(" - Web Service Listening Port:", config.port);
    console.log(" - Download/Render Wait", config.wait);
    console.log(" - Environment", env);
  });


  /**
   * Parses command line arguments allowing to set:
   *  - senseServerInstanceURL
   *  - port
   *  - wait
   * @see config
   */
  function prepareCommandLineArguments(cmdArguments, config) {
    var argument;

    for (argument in cmdArguments) {
      if (cmdArguments.hasOwnProperty(argument)) {
        if (cmdArguments[argument].indexOf("--sense=") !== -1) {
          config.senseInstanceURL = cmdArguments[argument].split("--sense=")[1];
        }
        else if (cmdArguments[argument].indexOf("--port=") !== -1) {
          config.port = cmdArguments[argument].split("--port=")[1];
        }
        else if (cmdArguments[argument].indexOf("--wait=") !== -1) {
          config.wait = cmdArguments[argument].split("--wait=")[1];
        }
        else {
          // no action
        }
      }
    }
  }
  
  function getFile(filePath, responseObject) {
    fs.exists(filePath, function(exists) {
      if(exists) {
        fs.readFile(filePath, function(err, contents) {
          if(!err) {
            responseObject.json({ filePath : filePath }); 
          } else {
            console.dir("There was an error: " + err);
          };
        });
		  } else {
        console.log("can't find image!");
        responseObject.writeHead(404, {'Content-Type': 'text/html'});
        responseObject.end(contents);
      }
    });
  }
  
})();

