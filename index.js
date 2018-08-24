"use strict";
process.title = 'node-chat';


var serverPort = 9090;

var webSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var history = {};
var text = {'date': new Date(),
            'text': ''}
var lastDate = new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear();
history[lastDate] = {'text': text,
                     'changes': 0};
var password = '4m08ici';



function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
  var index = fs.readFileSync('./index.html');
  response.end(index);
});
server.listen(serverPort, function() {
  console.log(new Date() + " - Server is listening on port "
      + serverPort);
});

var wsServer = new webSocketServer({
  'httpServer': server
});

wsServer.on('request', function(request) {
  console.log(new Date() + ' - Connection from origin '
      + request.origin);

  var connection = request.accept(null, request.origin);
  var tryPass = false;
  var send;


  // send back chat history

  // user sent some message
  connection.on('message', function(message) {
    if (message.type === 'utf8') {

     if (tryPass === false) {

       var msg;
       var txt;

       if(isJson(message.utf8Data)){
         msg = JSON.parse(message.utf8Data);
         tryPass = htmlEntities(msg.data);
       } else {
         tryPass = false;
         return;
       }


        if(tryPass !== password) {
          tryPass = false;
          connection.sendUTF(JSON.stringify({ type: 'login', data: false}));
        } else {
          connection.sendUTF(JSON.stringify({ type: 'login', data: true}));
          console.log(new Date() + ' - User connected');
          connection.sendUTF(JSON.stringify({ type: 'text', data: text}));
          send = setInterval(function(){
            connection.sendUTF(JSON.stringify({ type: 'text', data: text}));
            console.log(text.date + " - " + text.text);
          }, 1000);
        }






      } else {


        var msg;

        if(isJson(message.utf8Data)){
          msg = JSON.parse(message.utf8Data);
        } else {
          return;
        }
        msg.data.date = new Date(msg.data.date);
        console.log(new Date() + ' - Received Message: ' + msg.data.text);


        if(text.date < msg.data.date){
          text = msg.data;
          history[lastDate] = text;
        }

      }
    }
  });

  // user disconnected
  connection.on('close', function(connection) {
    if (tryPass !== false) {
      console.log(new Date() + " - Disconnected");

      clearInterval(send);

    }
  });
});



function isJson(txt){
  try {
    JSON.parse(txt);
  } catch (e){
    return false;
  }
  return true;
}


var update = setInterval(function(){
    var date = new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear();
    if( date !== lastDate ){
      lastDate = date;
      history[date] = text;
    }

}, 30000);
