import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

let players = {};

app.get("/", (req, res) => {
  res.send("Multiplayer server is running.");
});

io.on("connection", (socket) => {

  console.log("Player connected:", socket.id);

  // Create player
  players[socket.id] = {
    x: 400,
    y: 300,
    angle: 0,
    health: 100
  };

  // Send all current players to new player
  socket.emit("currentPlayers", players);

  // Notify others
  socket.broadcast.emit("newPlayer", {
    id: socket.id,
    player: players[socket.id]
  });

  // Movement update
  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].angle = data.angle;

    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      player: players[socket.id]
    });
  });

  // Shooting event
  socket.on("shoot", (bullet) => {
    socket.broadcast.emit("bulletFired", {
      id: socket.id,
      bullet
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    delete players[socket.id];

    io.emit("playerDisconnected", socket.id);
  });

});

httpServer.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
