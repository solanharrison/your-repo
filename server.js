const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

let players = {};
let gameState = "WAITING";
let killerId = null;
let timer = 120;
let interval = null;

io.on("connection", (socket) => {
  socket.on("join", (name) => {
    players[socket.id] = {
      id: socket.id,
      name,
      x: Math.random() * 800,
      y: Math.random() * 500,
      role: "survivor",
      alive: true
    };

    io.emit("players", players);
  });

  socket.on("move", (data) => {
    if (!players[socket.id] || !players[socket.id].alive) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    // Kill detection
    if (socket.id === killerId) {
      for (let id in players) {
        if (id !== killerId && players[id].alive) {
          const dx = players[id].x - players[killerId].x;
          const dy = players[id].y - players[killerId].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            players[id].alive = false;
            io.emit("blood", players[id]);
          }
        }
      }
    }

    io.emit("players", players);
  });

  socket.on("startGame", () => {
    if (gameState !== "WAITING") return;

    const ids = Object.keys(players);
    if (ids.length < 2) return;

    killerId = ids[Math.floor(Math.random() * ids.length)];
    players[killerId].role = "killer";

    gameState = "PLAYING";
    timer = 120;

    interval = setInterval(() => {
      timer--;
      io.emit("timer", timer);

      const aliveSurvivors = Object.values(players).filter(
        p => p.alive && p.role === "survivor"
      );

      if (timer <= 0 || aliveSurvivors.length === 0) {
        clearInterval(interval);
        gameState = "ENDED";
        io.emit("gameOver", aliveSurvivors.length === 0 ? "KILLER" : "SURVIVORS");
      }
    }, 1000);

    io.emit("gameStarted", { killerId });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players", players);
  });
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
