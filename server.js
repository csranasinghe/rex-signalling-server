// const static = require('node-static');
// const http = require('http');
// const file = new (static.Server)();
// const app = http.createServer(function (req, res) {
//     file.serve(req, res);
// }).listen(8888);

// const io = require('socket.io').listen(app);

// io.sockets.on('connection', (socket) => {

//     // convenience function to log server messages to the client
//     function log() {
//         const array = ['>>> Message from server: '];
//         for (const i = 0; i < arguments.length; i++) {
//             array.push(arguments[i]);
//         }
//         socket.emit('log', array);
//     }

//     socket.on('message', (message) => {
//         log('Got message:', message);
//         // for a real app, would be room only (not broadcast)
//         socket.broadcast.emit('message', message);
//     });

//     socket.on('create or join', (room) => {
//         const numClients = io.sockets.clients(room).length;

//         log('Room ' + room + ' has ' + numClients + ' client(s)');
//         log('Request to create or join room ' + room);

//         if (numClients === 0) {
//             socket.join(room);
//             socket.emit('created', room);
//         } else if (numClients === 1) {
//             io.sockets.in(room).emit('join', room);
//             socket.join(room);
//             socket.emit('joined', room);
//         } else { // max two clients
//             socket.emit('full', room);
//         }
//         socket.emit('emit(): client ' + socket.id +
//             ' joined room ' + room);
//         socket.broadcast.emit('broadcast(): client ' + socket.id +
//             ' joined room ' + room);

//     });

// });


const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(8888);

let logged_connections = { count: 0 };

io.on('connection', function (socket) {

    console.log("Peer connected " + socket.id);

    socket.on('message', function (message) {
        console.log("Message sent by: " + socket.id);
        let data;
        //accepting only JSON messages 
        try {
            console.log(message);
            data = JSON.parse(message);

        } catch (e) {
            console.log("Invalid JSON by: " + socket.id);
            socket.emit('message', { type: "joinRoom", success: false, msg: "Invalid JSON" });
            data = { type: "" };
        }

        switch (data.type) {
            case "joinRoom":
                onjoinRoom(socket, data);
                break;
            case "leaveRoom":
                onleaveRoom(socket, data);
                break;
            default:
                console.log("Invlalid message type by: " + data.msg.user_id);
                socket.emit('message', { type: "joinRoom", success: false, msg: "Message type not found" });

        }
        console.log(logged_connections.count);

    });

    function onjoinRoom(socket, data) {
        console.log("joinRoom request sent by: " + data.msg.user_id);
        if (logged_connections[data.msg.user_id]) {
            socket.emit('message', { type: "joinRoom", success: false, msg: "User already logged in" });
        } else {
            logged_connections[data.msg.user_id] = socket;
            logged_connections.count++;
            socket.emit('message', { type: "joinRoom", success: true, msg: "" });
        }
    }

    function onleaveRoom(socket, data) {
        console.log("leaveRoom request sent by: " + data.msg.user_id);
    }

});

