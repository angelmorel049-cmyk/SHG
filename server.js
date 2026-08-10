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

    // Server status
    if (req.url === "/") {
        res.end(JSON.stringify({
            online: true,
            message: "Scary Horror Game Server is online!"
        }));
        return;
    }

    // Create room
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

    // Heartbeat
    if (req.url.startsWith("/heartbeat")) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const code = url.searchParams.get("code");

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

    // Manual leave
    if (req.url.startsWith("/leave")) {
        const url = new URL(req.url, `http://${req.headers.host}`);
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

        res.end(JSON.stringify({
            success: true,
            deleted: false,
            players: rooms[code].players
        }));
        return;
    }

    // Room list
    if (req.url === "/rooms") {
        res.end(JSON.stringify({
            rooms: rooms
        }));
        return;
    }

    // Unknown request
    res.end(JSON.stringify({
        success: false,
        error: "Unknown request"
    }));
});

// Check for players that stopped sending heartbeats
setInterval(() => {
    const now = Date.now();

    for (const code in rooms) {
        const room = rooms[code];

        if (now - room.lastHeartbeat > 10000) {
            console.log("Player timed out:", code);

            delete rooms[code];

            console.log("Room deleted:", code);
        }
    }
}, 1000);

server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
