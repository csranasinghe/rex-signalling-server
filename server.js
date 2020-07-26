const app = require("express")();
const cors = require("cors");

app.use(cors());

const server = require("http").Server(app);
const io = require("socket.io")(server);

server.listen(process.env.PORT || 5500);
let number_of_connections = 0;
let logged_connections = new Map();

app.get("/", function (req, res) {
    res.send(
        '<h1 style="text-align: center;">Rex-Signalling-Server is running on port 8888.</h1>'
    );
});

io.on("connection", function (socket) {
    console.log("Peer connected " + socket.id);
    let peerObj = { id: "", name: "" };
    socket.on("message", function (message) {
        // console.log("Message sent by: " + socket.id);
        let data;

        //accepting only JSON messages
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON by: " + socket.id);
            onError(socket, message, "Invalid JSON");
            data = { type: "" };
        }

        switch (data.type) {
            case "join":
                onJoin(socket, data.data);
                break;
            case "offer":
                onoffer(socket, data.data);
                break;
            case "answer":
                onanswer(socket, data.data);
                break;
            case "hangup":
                onhangup(socket, data.data);
                break;
            case "icecandidate":
                onicecandidate(socket, data.data);
                break;
            case "leave":
                onleave(socket, data.data);
                break;
            default:
                console.log("Invlalid message type by: " + socket.id);
                onError(socket, data, "Message type not found");
        }
    });

    socket.on("disconnect", (reason) => {
        console.log(reason);

        console.log("Connection disconneccted: " + socket.id);
        onleave(socket, {});
    });

    function onError(socket, data, cause) {
        socket.emit("message", {
            type: "error",
            data: { msg: cause, error: data },
        });
    }

    function onJoin(socket, data) {
        console.log("join request sent by: " + socket.id);

        number_of_connections++;

        let connected_peer_list = [];

        peerObj = {
            id: socket.id,
            name: data.peer.name,
        };
        // Notify others about the new peer join
        logged_connections.forEach((data, id, map) => {
            data.conn.emit("message", {
                type: "peer-joined",
                data: {
                    msg: "new peer joined",
                    peer: peerObj,
                },
            });
        });

        // Notify the success
        socket.emit("message", {
            type: "peer-joined-success",
            data: {
                msg: "joined",
                peer: peerObj,
            },
        });

        // Send list of connected peers
        logged_connections.forEach((data, id, map) => {
            connected_peer_list.push(data.peer);
        });

        socket.emit("message", {
            type: "peer-list",
            data: {
                msg: "connected peer list",
                peerList: connected_peer_list,
            },
        });
        logged_connections.set(socket.id, {
            peer: peerObj,
            conn: socket,
        });
    }

    function onoffer(socket, data) {
        if (logged_connections.has(data.destinationId)) {
            let connObj = logged_connections.get(data.destinationId);
            console.log("Sending offer to: " + data.destinationId);
            connObj.conn.emit("message", {
                type: "offer",
                data: {
                    offer: data.offer,
                    callee: connObj.peer,
                    caller: peerObj,
                },
            });
        } else {
            console.log("Connection not found:" + data.destinationId);
        }
    }

    function onanswer(socket, data) {
        if (logged_connections.has(data.destinationId)) {
            let connObj = logged_connections.get(data.destinationId);
            console.log("Sending answer to: " + data.destinationId);
            connObj.conn.emit("message", {
                type: "answer",
                data: {
                    answer: data.answer,
                    callee: peerObj,
                    caller: connObj.peer,
                },
            });
        } else {
            console.log("Connection not found:" + data.destinationId);
        }
    }

    function onicecandidate(socket, data) {
        if (logged_connections.has(data.destinationId)) {
            let connObj = logged_connections.get(data.destinationId);
            console.log("Sending icecandidate to: " + data.destinationId);
            connObj.conn.emit("message", {
                type: "icecandidate",
                data: {
                    ice: data.ice,
                },
            });
        } else {
            console.log("Connection not found:" + data.destinationId);
        }
    }

    function onhangup(socket, data) {
        console.log("hangup request sent by: " + socket.id);
        if (logged_connections.has(data.destinationId)) {
            let connObj = logged_connections.get(data.destinationId);
            connObj.conn.emit("message", {
                type: "hangup",
                data: {
                    leftPeer: peerObj,
                },
            });
        } else {
            console.log("Connection not found:" + data.destinationId);
        }
    }

    function onleave(socket, data) {
        console.log("leave request sent by: " + socket.id);

        if (logged_connections.has(socket.id)) {
            logged_connections.delete[socket.id];
            logged_connections.count--;

            // Notify others about the peer leave
            logged_connections.forEach((data, id, map) => {
                data.conn.emit("message", {
                    type: "peer-left",
                    data: {
                        msg: "peer left",
                        peer: peerObj,
                    },
                });
            });
        } else {
            console.log(logged_connections);
            console.log("Connection not found:" + data.destinationId);
        }
    }
});
