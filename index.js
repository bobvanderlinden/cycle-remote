var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , app = express()
  , port = 4080;

app.use(express.static(__dirname));

var connections = [];
var actions = [];

wss.on('connection', function connection(ws) {
  var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
  console.log('connected');
  connections.push(ws);
  // actions.forEach(function(action) {
  //   ws.send(action);
  // });

  ws.on('message', function incoming(message) {
    console.log('broadcast', message);
    actions.push(message);
    connections.forEach(function(connection) {
      if (ws === connection) { return; }
      connection.send(message);
    });
  });

  ws.on('close', function close() {
    console.log('disconnected');
    connections.splice(connections.indexOf(ws), 1);
  });

  ws.on('error', function error() {
    console.log('error, disconnect');
    connections.splice(connections.indexOf(ws), 1);
    ws.close(1001);
  });
});

server.on('request', app);
server.listen(port, function () {
  console.log('Listening on ' + server.address().address + ':' + server.address().port);
});