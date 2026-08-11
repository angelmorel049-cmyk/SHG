const http = require("http");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// Server configuration & memory state
const SERVER_VERSION = "1.0.0";
const rooms = {};

// Helper to generate a random 4-digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

const server = http.createServer((req, res) => {
    // Parse the incoming URL safely using the Host header
    const host = req.headers.host || "localhost";
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;

    // --- ROOT / HEALTH CHECK ---
    if (path === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            status: "Server running",
            success: true
        }));
        return;
    }

    // --- VERSION CHECK ---
    if (path === "/version") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            version: SERVER_VERSION
        }));
        return;
    }

    // --- CREATE ROOM ---
    if (path === "/create") {
        let code = generateRoomCode();
        while (rooms[code]) {
            code = generateRoomCode();
        }

        rooms[code] = {
            players: 1,
            lastHeartbeat: Date.now()
        };

        console.log("Room created:", code);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            code: code
        }));
        return;
    }

    // --- JOIN ROOM ---
    if (path === "/join") {
        const code = url.searchParams.get("code");

        if (!code || !rooms[code]) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));
            return;
        }

        // Add player and refresh heartbeat
        rooms[code].players += 1;
        rooms[code].lastHeartbeat = Date.now();

        console.log(`Player joined room ${code}. Total players: ${rooms[code].players}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            players: rooms[code].players
        }));
        return;
    }

    // --- HEARTBEAT ---
    if (path === "/heartbeat") {
        const code = url.searchParams.get("code");

        console.log("HEARTBEAT RECEIVED:", code);

        if (!code || !rooms[code]) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));
            return;
        }

        // Refresh heartbeat timestamp
        rooms[code].lastHeartbeat = Date.now();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true
        }));
        return;
    }

    // --- LEAVE ROOM ---
    if (path === "/leave") {
        const code = url.searchParams.get("code");

        if (!code || !rooms[code]) {
            res.writeHead(404, { "Content-Type": "application/json" });
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

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: true,
                deleted: true
            }));
            return;
        }

        console.log("Player left room:", code);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            deleted: false,
            players: rooms[code].players
        }));
        return;
    }

    // --- LIST ROOMS ---
    if (path === "/rooms") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            rooms: rooms
        }));
        return;
    }

    // --- UNKNOWN REQUEST ---
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        success: false,
        error: "Unknown request"
    }));
});

// CHECK FOR DEAD ROOMS EVERY 5 SECONDS
setInterval(() => {
    const now = Date.now();

    for (const code in rooms) {
        const timeSinceHeartbeat = now - rooms[code].lastHeartbeat;

        // 30 seconds without heartbeat = timeout
        if (timeSinceHeartbeat > 30000) {
            console.log("Room timed out:", code);
            delete rooms[code];
        }
    }
}, 5000);

// START SERVER
server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
