const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(8888);

let logged_connections = { count: 0 };

app.get('/', function (req, res) {
    res.send('<h1 style="text-align: center;">Rex-Signalling-Server is running on port 8888.</h1>');
});

io.on('connection', function (socket) {

    // console.log("Peer connected " + socket.id);

    socket.on('message', function (message) {
        // console.log("Message sent by: " + socket.id);
        let data;

        //accepting only JSON messages 
        try {
            data = JSON.parse(message);

        } catch (e) {
            console.log("Invalid JSON by: " + data.msg.user_id);
            socket.emit('message', { type: "joinRoom", status: "error", msg: "Invalid JSON" });
            data = { type: "" };
        }

        switch (data.type) {
            case "joinRoom":
                onjoinRoom(socket, data);
                break;
            case "offer":
                onoffer(socket, data);
                break;
            case "answer":
                onanswer(socket, data);
                break;
            case "icecandidate":
                onicecandidate(socket, data);
                break;
            case "leaveRoom":
                onleaveRoom(socket, data);
                break;
            default:
                console.log("Invlalid message type by: " + data.msg.user_id);
                socket.emit('message', { type: "error", status: "error", msg: "Message type not found" });

        }

    });

    function onjoinRoom(socket, data) {
        console.log("joinRoom request sent by: " + data.msg.user_id);

        logged_connections[data.msg.user_id] = socket;
        socket.name = data.msg.user_id;
        logged_connections.count++;

        socket.emit('message', { type: "joinRoom", status: "connected", msg: "User successfully joined" });

    }

    function onoffer(socket, data) {
        let conn = logged_connections[data.offer.userid];
        if (conn != null) {
            console.log("Sending offer to: " + data.offer.userid);
            socket.otherName = data.offer.userid;
            conn.emit('message', { type: "offer", offer: data.offer, msg: { user_id: data.offer.userid } });
        }
    }

    function onanswer(socket, data) {
        let conn = logged_connections[data.answer.userid];
        if (conn != null) {
            console.log("Sending answer to: " + data.answer.userid);
            socket.otherName = data.answer.userid;
            conn.emit('message', { type: "answer", answer: data.answer, msg: { user_id: data.answer.userid } });
        }
    }

    function onicecandidate(socket, data) {
        let conn = logged_connections[socket.otherName];
        if (conn != null) {
            console.log("Sending candidates to: " + socket.otherName);
            conn.emit('message', { type: "icecandidate", candidate: data.candidate });
        }
    }

    function onleaveRoom(socket, data) {
        console.log("leaveRoom request sent by: " + data.msg.user_id);
        if (logged_connections[data.msg.user_id] != null) {
            delete logged_connections[data.msg.user_id];
            logged_connections.count--;
        }
        socket.emit('message', { type: "leaveRoom", status: "disconnected", msg: "User successfully leaved" });
        if (logged_connections[socket.otherName] != null)
            logged_connections[socket.otherName].emit('message', { type: "leaveRoom", status: "disconnected", msg: { user_id: socket.otherName } });
    }

});

