var http = require('http');
var ws = require('websocket');
var fs = require('fs');

var port = 3000;

var server = http.createServer((req, res) => {

  var index = fs.readFileSync('./index.html');
  res.end(index);

}).listen(port, () => {
  console.log('Listening on port ' + port);
});

var wsServer = new ws.server({
    httpServer: server
  });

wsServer.on('connection', () => {
  console.log(oi);
});
