// ============================================================
// index.js — Main Server with RL Training + Metrics Endpoints
// ============================================================

const express  = require("express");
const http     = require("http");
const { Server } = require("socket.io");
const cors     = require("cors");

const { createGameState, tickGameState, spawnUnit, UNIT_TYPES } = require("./game/gameState");
const { analyzeTick, resetTutor } = require("./tutor/tutor");
const db = require("./rl/rlDatabase");
const { runOfflineTraining } = require("./rl/offlineTrainer");

// ---- Server Setup ------------------------------------------
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// ---- REST Endpoints ----------------------------------------
app.get("/", (req, res) => res.json({ status: "AI RTS Tutor Server Running" }));
app.get("/unit-types", (req, res) => res.json(UNIT_TYPES));

app.get("/stats", (req, res) => {
  res.json({
    tick: gameState.tick,
    stats: gameState.stats,
    winner: gameState.winner,
    gameOver: gameState.gameOver
  });
});

// RL Q-table metadata + improvement metrics
app.get("/rl-stats", (req, res) => {
  const meta = db.getMeta();
  res.json({
    ...meta,
    trainingLog: db.getTrainingLog().slice(-50),  // last 50 sessions
    rewardHistory: meta.avgRewardHistory.slice(-100)
  });
});

// Full training data log
app.get("/rl-log", (req, res) => {
  res.json({
    sessions: db.getTrainingLog(),
    meta: db.getMeta()
  });
});

// Trigger offline training run on-demand
let trainingInProgress = false;
app.post("/run-training", async (req, res) => {
  if (trainingInProgress) {
    return res.status(409).json({ error: "Training already in progress" });
  }

  const sims = Math.min(req.body?.simulations ?? 1000, 5000);
  trainingInProgress = true;

  res.json({ started: true, simulations: sims, message: `Running ${sims} offline simulations...` });

  let lastBroadcast = 0;
  runOfflineTraining(sims, (done, total, latest) => {
    const now = Date.now();
    if (now - lastBroadcast > 500) {  // broadcast progress every 500ms
      io.emit("RL_TRAINING_PROGRESS", { done, total, pct: Math.round(done/total*100), latest });
      lastBroadcast = now;
    }
  }).then(summary => {
    trainingInProgress = false;
    io.emit("RL_TRAINING_COMPLETE", summary);
    console.log("✅ On-demand training complete");
  }).catch(e => {
    trainingInProgress = false;
    console.error("❌ Training failed:", e);
    io.emit("RL_TRAINING_COMPLETE", { error: e.message });
  });
});

// ---- Global State ------------------------------------------
let gameState        = createGameState();
let latestSuggestion = null;

// ---- Auto-train on startup if DB is sparse -----------------
const AUTO_TRAIN_THRESHOLD = 50;
setTimeout(async () => {
  const size = db.getSize();
  if (size < AUTO_TRAIN_THRESHOLD) {
    console.log(`\n🤖 DB sparse (${size} entries) — running initial training (500 sims)…`);
    try {
      await runOfflineTraining(500);
    } catch (e) {
      console.error("Auto-train error:", e.message);
    }
  } else {
    console.log(`✅ RL Q-table has ${size} entries — skipping auto-train`);
  }
}, 2000);

// ---- Game Loop (100ms ticks) --------------------------------
setInterval(() => {
  if (gameState.gameOver) return;

  tickGameState(gameState);

  const suggestion = analyzeTick(gameState);
  if (suggestion) {
    latestSuggestion = suggestion;
    io.emit("TUTOR_SUGGESTION", suggestion);
  }

  io.emit("GAME_UPDATE", {
    tick:     gameState.tick,
    players:  gameState.players,
    units:    gameState.units,
    gameOver: gameState.gameOver,
    winner:   gameState.winner,
    stats:    gameState.stats
  });
}, 100);

// ---- Socket.IO Events --------------------------------------
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.emit("INIT_STATE", {
    gameState,
    unitTypes: UNIT_TYPES,
    latestSuggestion,
    rlMeta: db.getMeta()
  });

  socket.on("PLAYER_ACTION", (data) => {
    const { type, col } = data;
    if (gameState.gameOver) {
      socket.emit("ACTION_RESULT", { success: false, reason: "Game is over." });
      return;
    }
    const unit = spawnUnit(gameState, type, "human", col);
    if (!unit) {
      const cost = UNIT_TYPES[type]?.elixirCost ?? "?";
      socket.emit("ACTION_RESULT", { success: false,
        reason: `Not enough elixir. ${type} costs ${cost}, you have ${gameState.players.human.elixir}.` });
    } else {
      gameState.lastAction = { type, col, owner: "human", tick: gameState.tick };
      socket.emit("ACTION_RESULT", { success: true, unit });
    }
  });

  socket.on("RESTART_GAME", () => {
    gameState = createGameState();
    resetTutor();
    latestSuggestion = null;
    io.emit("GAME_RESTARTED", { gameState, unitTypes: UNIT_TYPES });
    console.log("🔄 Game restarted");
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 AI RTS Tutor Server running on http://localhost:${PORT}`);
  console.log(`   📊 RL Stats: http://localhost:${PORT}/rl-stats`);
  console.log(`   📋 RL Log:   http://localhost:${PORT}/rl-log`);
  console.log(`   🎓 Train:    POST http://localhost:${PORT}/run-training\n`);
});
