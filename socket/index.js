const express = require('express')
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server, {cors : {origin : "*"}});
const port = 5000;

io.listen(port, () => {
  console.log('Server listening at port %d', port);
});
