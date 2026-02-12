import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
let players = {};

io.on("connection", (socket) => {
  players[socket.id] = {
    x: Math.random() * 1800 + 100,
    y: Math.random() * 1800 + 100,
    angle: 0,
    health: 100,
    kills: 0
  };

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", { id: socket.id, player: players[socket.id] });

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].angle = data.angle;
      socket.broadcast.emit("playerMoved", { id: socket.id, player: players[socket.id] });
    }
  });

  socket.on("shoot", (bullet) => {
    io.emit("bulletFired", { id: socket.id, bullet });
  });

  socket.on("killPlayer", (victimId) => {
    if (players[victimId]) {
        io.emit("playerKilled", victimId);
        // Respawn Logic
        setTimeout(() => {
            if(players[victimId]) {
                players[victimId].health = 100;
                players[victimId].x = Math.random() * 1800 + 100;
                players[victimId].y = Math.random() * 1800 + 100;
                io.emit("newPlayer", { id: victimId, player: players[victimId] });
            }
        }, 3000);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

httpServer.listen(PORT, () => console.log("Arena Server Live on " + PORT));
