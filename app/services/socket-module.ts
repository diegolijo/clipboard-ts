
const Server = require('socket.io');
const http = require('http');
const conf = require('../conf/conf.json');


let io;
const init = (mainCbFunction) => {
  const httpServer = http.createServer();
  const port = conf.port_socket;
  io = Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', (socket) => {

    socket.once('disconnect', () => {
      console.log('disconnect socket ' + JSON.stringify(socket.handshake.query));
      mainCbFunction('disconnect', socket.id);
    });

    socket.on('value', (data) => {
      console.log(data.key + ': value ' + data.value);
       mainCbFunction(data.key, data.value);
    });

    mainCbFunction('connection', socket.id);
    console.log('connection socket ' + JSON.stringify(socket.handshake.query));

  });

  httpServer.listen(port);
  console.log('socket listen on port ' + port);
}

const emitMessage = (key, message, id) => {
  if (id) {
    io.to(id).emit(key, message);
  } else {
    io.emit(key, message);
  }

}



module.exports =
{
  init,
  emitMessage
}
