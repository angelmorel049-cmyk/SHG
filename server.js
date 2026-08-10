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

    if (req.url === "/") {
        res.end(JSON.stringify({
            online: true,
            message: "Scary Horror Game Server is online!"
        }));
        return;
    }

    if (req.url === "/create") {
        const code = generateCode();

        rooms[code] = {
            players: 1
        };

        res.end(JSON.stringify({
            success: true,
            code: code
        }));

        console.log("Room created:", code);
        return;
    }

    if (req.url === "/rooms") {
        res.end(JSON.stringify({
            rooms: rooms
        }));
        return;
    }

    res.end(JSON.stringify({
        success: false,
        error: "Unknown request"
    }));
});

server.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
