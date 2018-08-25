"use strict";
process.title = 'node-chat';


var serverPort = 1793;

var webSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var paths = fs.readFileSync('paths.json', "utf8");
paths = paths === '' ?  {} : JSON.parse(paths);
parseDate(paths);


var password = '';





function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/**
 * HTTP server
 */
var server = http.createServer(function(req, res) {

  var index = fs.readFileSync('./index.html');
  var path = req.url.split('/');
  path[0] = path[0] === '' ? '/' : path[0];
  var flag = false;
  if(req.method === 'POST'){
    if(path[path.length-1] === 'password'){
      flag = true;
      var str = '';
      req.on('data', function(data){
        str += typeof data === 'undefined' ? '' : data;
      });
      req.on('end', function(data){
        str += typeof data === 'undefined' ? '' : data;
        changePasswd(req, res, path, str);

      });

    }
    if(!flag) res.end(index);
  } else{
    if(req.method === 'GET'){
      var str = '';
      req.on('data', function(data){
        str += typeof data === 'undefined' ? '' : data;
      });
      req.on('end', function(data){
        str += typeof data === 'undefined' ? '' : data;
        if(str !== ''){
          var reqData = isJson(str) ? JSON.parse(str) : res.end('error parsing json');
          if(typeof reqData === 'object'){
            if(reqData.type === 'path'){
              flag = true;
              getChildren(req, res, path, str);
            }

          }


        }

        if(!flag) res.end(index);
      });


    }
  }
});
server.listen(serverPort, '0.0.0.0', function() {
  console.log(new Date() + " - Server is listening on port "
      + serverPort);
});



function changePasswd(req, res, path, str){

  var tmp = paths;
  for(var ind in path){
    var key = path[ind];
    if(key === 'password') continue;
    tmp[key] = typeof tmp[key] === 'object' ? tmp[key] : {history: {}, lastDate: getDate()};
    tmp = tmp[key];
  }
  var reqData = isJson(str) ? JSON.parse(str) : res.end('error parsing json');
  if(typeof reqData !== 'object') return;

  reqData.new = typeof reqData.new === 'undefined' ? '' : reqData.new;
  reqData.curr = typeof reqData.curr === 'undefined' ? '' : reqData.curr;
  if(typeof tmp.password === 'undefined'){
    tmp.password = reqData.new;
    res.end('ok');
  }else{
    if(tmp.password === reqData.curr){
      tmp.password = reqData.new;
      res.end('ok');
    } else{
      res.end('wrong password');
    }
  }



}






function getChildren (req, res, path, str){
  var temp = paths;
  for(var ind in path){
    var key = path[ind];
    if(typeof temp[key] === 'undefined'){
      res.end('url não existe');
      return;
    }
    temp = temp[key];
    var obj = {}
    for(var ind in temp){
      if(ind === 'history' || ind === 'lastDate' || ind === 'password') continue;
      obj[ind] = ind;
    }
    res.end(JSON.stringify(obj));
  }
}


var wsServer = new webSocketServer({
  'httpServer': server
});

wsServer.on('request', function(request) {

  console.log(new Date() + ' - Connection from origin '
      + request.origin);

  var connection = request.accept(null, request.origin);
  var tryPass = false;
  var send;
  var path;
  var pathObj;

  var text;

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

       path = msg.path;
       path = path.split('/');
       var temp = paths;
       path[0] = path[0] === '' ? '/' : path[0];
       for(var ind in path){
         var key = path[ind];
         if(key === 'history' || key === 'lastDate'  || (key === '' && path.length > 1)) continue;
         temp[key] = typeof temp[key] === 'object' ? temp[key] : {history: {}, lastDate: getDate()};
         console.log('temp['+key+'] - ' + temp[key]);
         temp = temp[key];
       }

       pathObj = temp;
       text = typeof pathObj.history[pathObj.lastDate] !== "undefined" ?  pathObj.history[pathObj.lastDate] : {date: new Date(), text: ''};

       var passwd = typeof pathObj['password'] === 'string' ? pathObj['password'] : password ;
        if(tryPass !== passwd) {
          tryPass = false;
          connection.sendUTF(JSON.stringify({ type: 'login', data: false}));
        } else {
          connection.sendUTF(JSON.stringify({ type: 'login', data: true}));
          console.log(new Date() + ' - User connected');
          connection.sendUTF(JSON.stringify({ type: 'text', data: text}));
          send = setInterval(function(){
            connection.sendUTF(JSON.stringify({ type: 'text', data: text}));
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
          text.text = msg.data.text;
          text.date = msg.data.date;
          pathObj.lastDate = getDate(msg.data.date);
          pathObj.history[pathObj.lastDate] = text;
          // console.log(pathObj);
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

var rewrite = setInterval(function(){
  console.log('writing...');
  fs.writeFile('paths.json', JSON.stringify(paths), function(){ console.log('OK!') });
}, 1000);



function parseDate(obj){
  if(typeof obj['history'] === 'object'){
    for(var i in obj['history']){
      obj['history'][i]['date'] = new Date(obj['history'][i]['date']);
    }
  }
  for(var i in obj){
    if(i === 'history' || i === 'lastDate' || i === 'password') continue;
    parseDate(obj[i]);
  }
}


function getDate( date ){
  var str = typeof date !== 'undefined' ? date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear() : new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear();;
  return str;
}
