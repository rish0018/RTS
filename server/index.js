// ============================================================
// index.js — Main Server
// Express + Socket.IO + Game Loop + AI Tutor
// ============================================================

const express  = require("express");
const http     = require("http");
const { Server } = require("socket.io");
const cors     = require("cors");

const { createGameState, tickGameState, spawnUnit, UNIT_TYPES } = require("./game/gameState");
const { analyzeTick, resetTutor } = require("./tutor/tutor");

// ---- Server Setup ------------------------------------------
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ status: "AI RTS Tutor Server Running" }));

// Expose unit types so frontend can list them
app.get("/unit-types", (req, res) => res.json(UNIT_TYPES));

// ---- Global Game State ------------------------------------
let gameState = createGameState();
let latestSuggestion = null;

// ---- Game Loop (100ms ticks) -------------------------------
const TICK_MS = 100;

setInterval(() => {
  if (gameState.gameOver) return;

  tickGameState(gameState);

  // Run AI tutor analysis (throttled inside analyzeTick)
  const suggestion = analyzeTick(gameState);
  if (suggestion) {
    latestSuggestion = suggestion;
    io.emit("TUTOR_SUGGESTION", suggestion);
  }

  // Broadcast game state to all connected clients
  io.emit("GAME_UPDATE", {
    tick: gameState.tick,
    players: gameState.players,
    units: gameState.units,
    gameOver: gameState.gameOver,
    winner: gameState.winner
  });
}, TICK_MS);

// ---- Socket.IO Events --------------------------------------
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Send full initial state
  socket.emit("INIT_STATE", {
    gameState,
    unitTypes: UNIT_TYPES,
    latestSuggestion
  });

  // ---- Player deploys a unit --------------------------------
  socket.on("PLAYER_ACTION", (data) => {
    const { type, col } = data;

    if (gameState.gameOver) {
      socket.emit("ACTION_RESULT", { success: false, reason: "Game is over." });
      return;
    }

    const unit = spawnUnit(gameState, type, "human", col);

    if (!unit) {
      const cost = UNIT_TYPES[type]?.elixirCost ?? "?";
      socket.emit("ACTION_RESULT", {
        success: false,
        reason: `Not enough elixir. ${type} costs ${cost}, you have ${gameState.players.human.elixir}.`
      });
    } else {
      gameState.lastAction = { type, col, owner: "human", tick: gameState.tick };
      socket.emit("ACTION_RESULT", { success: true, unit });
    }
  });

  // ---- Restart game -----------------------------------------
  socket.on("RESTART_GAME", () => {
    gameState = createGameState();
    resetTutor();
    io.emit("GAME_RESTARTED", gameState);
    console.log("🔄 Game restarted");
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ---- Start -------------------------------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 AI RTS Tutor Server running on http://localhost:${PORT}\n`);
});
