var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

var users = {

};

io.on('connection', function(socket) {

  socket.on('user connected', function(userId) {
    users[userId] = {
      name: 'Anonymous user',
      socketId: socket.id,
      color: 'black',
      lockedOut: false
    };
    io.emit('user connected', users);
  });

  socket.on('disconnect', function(){
    let userName;
    let userId;
    for (let user in users) {
      if (users.hasOwnProperty(user)) {
        if (users[user].socketId === socket.id) {
          userName = users[user].name;
          userId = user;
          delete users[user];
        }
      }
    }
    io.emit('user disconnected', {
      name: userName,
      user: userId
    });
  });

  socket.on('chat message', function(payload) {
    if (payload.message.startsWith('/')) {
      handleCommand(payload, io);
    }
    else {
      io.emit('chat message', {
        message: users[payload.id].name + ' says: ' + payload.message,
        color: users[payload.id].color
      });
    }
  });

  socket.on('user typing', function(payload) {
    if (payload.key === '/') {
      users[payload.id].lockedOut = true;
      setTimeout(() => {
        users[payload.id].lockedOut = false;
      },5000);
    } else if (users[payload.id].lockedOut) {
      console.log(users[payload.id].name + ' is locked out');
    } else {
      io.emit('user typing', payload);
    }
  });

  socket.on('user stop typing', function(msg) {
    io.emit('user stop typing', msg);
  });
});

http.listen(process.env.PORT || 5000, function() {
  console.log('listening on *:3000');
});

function handleCommand(payload, io) {
  let operation = payload.message.split(' ')[0];
  let argument = payload.message.split(' ')[1];
  users[payload.id].lockedOut = false;
  switch (operation) {
    case '/name':
      var previousName = users[payload.id].name;
      users[payload.id].name = argument;
      io.emit('set name', {
        message: previousName + ' changed their name to ' + argument,
        users: users
      });
      break;
    
    case '/color':
      users[payload.id].color = argument;
      io.emit('set color', {
        message: 'You changed your color to ' + argument + '.',
        id: payload.id
      });
      break;

    case '/commands':
      io.emit('list commands', {
        message: "/name [new name] - change your name. /color [desired color] - change your font (to everyone).",
        id: payload.id
      });
      break;
    default:

  }
}
