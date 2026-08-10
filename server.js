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

    console.log("Player left room:", code);

    res.end(JSON.stringify({
        success: true,
        deleted: false,
        players: rooms[code].players
    }));
    return;
            }
