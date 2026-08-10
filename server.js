const http = require("http");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const rooms = {};

function generateCode() {
    let code;

    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms[code]);

    return code;
}

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });

    
  if (req.url === "/version") {
    res.end(JSON.stringify({
        version: "1.0.0"
    }));
    return;
  }  
    // SERVER STATUS
    if (req.url === "/") {
        res.end(JSON.stringify({
            online: true,
            message: "Scary Horror Game Server is online!"
        }));
        return;
    }

    // CREATE ROOM
    if (req.url === "/create") {
        const code = generateCode();

        rooms[code] = {
            players: 1,
            lastHeartbeat: Date.now()
        };

        console.log("Room created:", code);

        res.end(JSON.stringify({
            success: true,
            code: code
        }));
        return;
    }

    // HEARTBEAT
    if (req.url.startsWith("/heartbeat")) {
        const url = new URL(
            req.url,
            `http://${req.headers.host}`
        );

        const code = url.searchParams.get("code");

        console.log("HEARTBEAT RECEIVED:", code);

        if (!code || !rooms[code]) {
            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));
            return;
        }

        rooms[code].lastHeartbeat = Date.now();

        res.end(JSON.stringify({
            success: true,
            code: code
        }));
        return;
    }

    // LEAVE ROOM
    if (req.url.startsWith("/leave")) {
        const url = new URL(
            req.url,
            `http://${req.headers.host}`
        );

        const code = url.searchParams.get("code");

        if (!code || !rooms[code]) {
            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));
            return;
        }

        rooms[code].players -= 1;

        if (rooms[code].players <= 0) {
            delete rooms[code];

            console.log("Room deleted:", code);

            res.end(JSON.stringify({
                success: true,
                deleted: true
            }));
            return;
        }

        console.log("Player left room:", code);

        res.end(JSON.stringify({
            success: true,
            deleted: false,
            players: rooms[code].players
        }));
        return;
    }

    // LIST ROOMS
    if (req.url === "/rooms") {
        res.end(JSON.stringify({
            rooms: rooms
        }));
        return;
    }

    // UNKNOWN REQUEST
    res.end(JSON.stringify({
        success: false,
        error: "Unknown request"
    }));
});

// CHECK FOR DEAD ROOMS EVERY 5 SECONDS
setInterval(() => {
    const now = Date.now();

    for (const code in rooms) {
        const timeSinceHeartbeat =
            now - rooms[code].lastHeartbeat;

        // 30 seconds without heartbeat = disconnected
        if (timeSinceHeartbeat > 30000) {
            console.log("Room timed out:", code);

            delete rooms[code];
        }
    }
}, 5000);

server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
