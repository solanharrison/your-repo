import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

let players = {};

app.get("/", (req, res) => {
  res.send("Multiplayer server running.");
});

// Helper function to reset player position (Respawn)
function respawnPlayer(id) {
    if (players[id]) {
        players[id].x = Math.floor(Math.random() * 700) + 50;
        players[id].y = Math.floor(Math.random() * 500) + 50;
        players[id].health = 100;
    }
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  players[socket.id] = {
    x: 400,
    y: 300,
    angle: 0,
    health: 100
  };

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", {
    id: socket.id,
    player: players[socket.id]
  });

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

  socket.on("shoot", (bullet) => {
    socket.broadcast.emit("bulletFired", {
      id: socket.id,
      bullet
    });
  });

  // --- NEW: KILL & RESPAWN FEATURE ---
  socket.on("killPlayer", (victimId) => {
    if (players[victimId]) {
      console.log(`${socket.id} killed ${victimId}`);
      
      // Tell everyone this player died
      io.emit("playerKilled", victimId);

      // Give it a small delay before they reappear at a random spot
      setTimeout(() => {
        respawnPlayer(victimId);
        io.emit("newPlayer", {
          id: victimId,
          player: players[victimId]
        });
      }, 2000); 
    }
  });

  socket.on("pingCheck", () => {
    socket.emit("pongCheck");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
