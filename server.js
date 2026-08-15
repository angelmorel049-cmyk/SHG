const http = require("http");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const SERVER_VERSION = "1.0.0";

const rooms = {};

const BANNED_IPS = [
    // "123.123.123.123"
];


// ============================================================
// GENERATE ROOM CODE
// ============================================================

function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}


// ============================================================
// GENERATE PLAYER ID
// ============================================================

function generatePlayerId() {
    return Math.random().toString(36).substring(2, 10);
}


// ============================================================
// GET PLAYER IP
// ============================================================

function getClientIP(req) {
    const forwarded = req.headers["x-forwarded-for"];

    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    return req.socket.remoteAddress || "";
}


// ============================================================
// SERVER
// ============================================================

const server = http.createServer((req, res) => {

    const host = req.headers.host || "localhost";
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;


    // ========================================================
    // ROOT / HEALTH CHECK
    // ========================================================

    if (path === "/") {

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            status: "Server running",
            success: true
        }));

        return;
    }


    // ========================================================
    // VERSION CHECK
    // ========================================================

    if (path === "/version") {

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            version: SERVER_VERSION
        }));

        return;
    }


    // ========================================================
    // CHECK BAN
    // ========================================================

    if (path === "/check-ban") {

        const ip = getClientIP(req);

        const banned = BANNED_IPS.includes(ip);

        console.log(
            `Ban check: ${ip} -> ${banned ? "BANNED" : "ALLOWED"}`
        );

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true,
            banned: banned
        }));

        return;
    }


    // ========================================================
    // CREATE ROOM
    // ========================================================

    if (path === "/create") {

        let code = generateRoomCode();

        while (rooms[code]) {
            code = generateRoomCode();
        }

        const playerId = generatePlayerId();
        const playerIP = getClientIP(req);

        rooms[code] = {
            players: 1,

            lastHeartbeat: Date.now(),

            playerIds: [
                playerId
            ],

            playerStates: {},

            playerIPs: {
                [playerId]: playerIP
            }
        };

        console.log(
            `Room created: ${code}. Host Player ID: ${playerId}. IP: ${playerIP}`
        );

        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true,
            code: code,
            playerId: playerId,
            players: 1
        }));

        return;
    }


    // ========================================================
    // JOIN ROOM
    // ========================================================

    if (path === "/join") {

        const code = url.searchParams.get("code");

        if (!code || !rooms[code]) {

            res.writeHead(404, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));

            return;
        }

        const playerId = generatePlayerId();
        const playerIP = getClientIP(req);

        rooms[code].players += 1;

        rooms[code].lastHeartbeat = Date.now();


        if (!rooms[code].playerIds) {
            rooms[code].playerIds = [];
        }

        if (!rooms[code].playerStates) {
            rooms[code].playerStates = {};
        }

        if (!rooms[code].playerIPs) {
            rooms[code].playerIPs = {};
        }


        rooms[code].playerIds.push(playerId);

        rooms[code].playerIPs[playerId] = playerIP;


        console.log(
            `Player joined room ${code}. Player ID: ${playerId}. IP: ${playerIP}. Total players: ${rooms[code].players}`
        );


        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true,
            playerId: playerId,
            players: rooms[code].players
        }));

        return;
    }


    // ========================================================
    // PLAYER STATE
    // ========================================================

    if (path === "/state") {


        // ====================================================
        // POST PLAYER STATE
        // ====================================================

        if (req.method === "POST") {

            let body = "";

            req.on("data", chunk => {
                body += chunk;
            });


            req.on("end", () => {

                try {

                    const data = JSON.parse(body);

                    const code = data.code;
                    const playerId = data.playerId;


                    if (!code || !playerId || !rooms[code]) {

                        res.writeHead(404, {
                            "Content-Type": "application/json"
                        });

                        res.end(JSON.stringify({
                            success: false,
                            error: "Room not found"
                        }));

                        return;
                    }


                    if (!rooms[code].playerIds.includes(playerId)) {

                        res.writeHead(403, {
                            "Content-Type": "application/json"
                        });

                        res.end(JSON.stringify({
                            success: false,
                            error: "Player not in room"
                        }));

                        return;
                    }


                    if (!rooms[code].playerStates) {
                        rooms[code].playerStates = {};
                    }


                    rooms[code].playerStates[playerId] = {

                        head: data.head || null,

                        left_hand: data.left_hand || null,

                        right_hand: data.right_hand || null,

                        lastUpdate: Date.now()
                    };


                    rooms[code].lastHeartbeat = Date.now();


                    res.writeHead(200, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify({
                        success: true
                    }));


                } catch (error) {

                    console.log(
                        "STATE JSON ERROR:",
                        error
                    );


                    res.writeHead(400, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify({
                        success: false,
                        error: "Invalid JSON"
                    }));
                }
            });

            return;
        }


        // ====================================================
        // GET ALL PLAYER STATES
        // ====================================================

        if (req.method === "GET") {

            const code =
                url.searchParams.get("code");

            const playerId =
                url.searchParams.get("playerId");


            if (!code || !rooms[code]) {

                res.writeHead(404, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: false,
                    error: "Room not found"
                }));

                return;
            }


            const allStates =
                rooms[code].playerStates || {};


            const otherPlayers = {};


            for (const id in allStates) {

                if (id !== playerId) {

                    otherPlayers[id] =
                        allStates[id];
                }
            }


            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                success: true,
                players: otherPlayers
            }));

            return;
        }
    }


    // ========================================================
    // HEARTBEAT
    // ========================================================

    if (path === "/heartbeat") {

        const code =
            url.searchParams.get("code");


        console.log(
            "HEARTBEAT RECEIVED:",
            code
        );


        if (!code || !rooms[code]) {

            res.writeHead(404, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));

            return;
        }


        rooms[code].lastHeartbeat =
            Date.now();


        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true
        }));

        return;
    }


    // ========================================================
    // LEAVE ROOM
    // ========================================================

    if (path === "/leave") {

        const code =
            url.searchParams.get("code");

        const playerId =
            url.searchParams.get("playerId");


        if (!code || !rooms[code]) {

            res.writeHead(404, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                success: false,
                error: "Room not found"
            }));

            return;
        }


        // Remove player ID

        if (
            playerId &&
            rooms[code].playerIds
        ) {

            rooms[code].playerIds =
                rooms[code].playerIds.filter(
                    id => id !== playerId
                );
        }


        // Remove player state

        if (
            playerId &&
            rooms[code].playerStates
        ) {

            delete rooms[code]
                .playerStates[playerId];
        }


        // Remove player IP

        if (
            playerId &&
            rooms[code].playerIPs
        ) {

            delete rooms[code]
                .playerIPs[playerId];
        }


        rooms[code].players -= 1;


        // Delete empty room

        if (rooms[code].players <= 0) {

            delete rooms[code];


            console.log(
                "Room deleted:",
                code
            );


            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                success: true,
                deleted: true
            }));

            return;
        }


        console.log(
            `Player left room ${code}. Remaining players: ${rooms[code].players}`
        );


        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true,
            deleted: false,
            players: rooms[code].players
        }));

        return;
    }


    // ========================================================
    // LIST ROOMS
    // ========================================================

    if (path === "/rooms") {

        const roomList = {};


        for (const code in rooms) {

            const room = rooms[code];


            roomList[code] = {

                players: room.players,

                playerIds:
                    room.playerIds || [],

                playerIPs:
                    room.playerIPs || {}
            };
        }


        res.writeHead(200, {
            "Content-Type": "application/json"
        });


        res.end(JSON.stringify({
            success: true,
            rooms: roomList
        }));

        return;
    }


    // ========================================================
    // UNKNOWN REQUEST
    // ========================================================

    res.writeHead(404, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        success: false,
        error: "Unknown request"
    }));
});


// ============================================================
// ROOM CLEANUP
// ============================================================

setInterval(() => {

    const now = Date.now();


    for (const code in rooms) {

        const room = rooms[code];


        const timeSinceHeartbeat =
            now - room.lastHeartbeat;


        // 30 seconds without heartbeat
        // = room timeout

        if (timeSinceHeartbeat > 30000) {

            console.log(
                "Room timed out:",
                code
            );

            delete rooms[code];

            continue;
        }


        // ====================================================
        // REMOVE OLD PLAYER TRACKING DATA
        // ====================================================

        if (room.playerStates) {

            for (
                const playerId in room.playerStates
            ) {

                const state =
                    room.playerStates[playerId];


                if (
                    now - state.lastUpdate >
                    10000
                ) {

                    console.log(
                        `Tracking timeout for player ${playerId} in room ${code}`
                    );


                    delete room
                        .playerStates[playerId];
                }
            }
        }
    }

}, 5000);


// ============================================================
// START SERVER
// ============================================================

server.listen(PORT, HOST, () => {

    console.log(
        `Server running on ${HOST}:${PORT}`
    );

});
