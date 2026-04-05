// ============================================================
// rlDatabase.js — Persistent Q-Table Store
// Maps state_hash → { action, avgReward, visitCount, sessions }
// Survives server restarts via atomic JSON file writes.
// ============================================================

const fs   = require("fs");
const path = require("path");

const DB_PATH     = path.join(__dirname, "rl_qtable.json");
const LOG_PATH    = path.join(__dirname, "rl_training_log.json");
const META_PATH   = path.join(__dirname, "rl_meta.json");

// In-memory Q-table: { [stateHash_action]: { avgReward, visitCount, lastUpdated } }
let qTable   = {};
let trainingLog = [];   // Array of session summaries
let meta     = {
  totalSimulations: 0,
  totalSessions: 0,
  lastTrainingAt: null,
  improvedEntries: 0,
  coverageSize: 0,
  avgRewardHistory: []  // [{session, avgReward, timestamp}]
};

// ---- Load from disk on startup --------------------------------
function loadFromDisk() {
  try {
    if (fs.existsSync(DB_PATH)) {
      qTable = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      console.log(`RL Q-table loaded: ${Object.keys(qTable).length} entries`);
    }
    if (fs.existsSync(LOG_PATH)) {
      trainingLog = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
      console.log(`RL training log loaded: ${trainingLog.length} sessions`);
    }
    if (fs.existsSync(META_PATH)) {
      meta = { ...meta, ...JSON.parse(fs.readFileSync(META_PATH, "utf8")) };
    }
  } catch (e) {
    console.error("RL DB load error:", e.message);
    qTable = {};
    trainingLog = [];
  }
}

// ---- Atomic write to disk ------------------------------------
function saveToDisk() {
  try {
    const tmpQ   = DB_PATH + ".tmp";
    const tmpLog = LOG_PATH + ".tmp";
    const tmpMeta = META_PATH + ".tmp";

    fs.writeFileSync(tmpQ,    JSON.stringify(qTable,      null, 2));
    fs.writeFileSync(tmpLog,  JSON.stringify(trainingLog, null, 2));
    fs.writeFileSync(tmpMeta, JSON.stringify(meta,        null, 2));

    fs.renameSync(tmpQ,    DB_PATH);
    fs.renameSync(tmpLog,  LOG_PATH);
    fs.renameSync(tmpMeta, META_PATH);
  } catch (e) {
    console.error(" RL DB save error:", e.message);
  }
}

// ---- Key builder ---------------------------------------------
function makeKey(stateHash, actionKey) {
  return `${stateHash}::${actionKey}`;
}

// ---- Lookup best action for a state hash ---------------------
function lookup(stateHash) {
  const prefix = `${stateHash}::`;
  const matches = Object.entries(qTable).filter(([k]) => k.startsWith(prefix));
  if (matches.length === 0) return null;

  matches.sort((a, b) => b[1].avgReward - a[1].avgReward);
  const [key, entry] = matches[0];
  const actionKey = key.replace(prefix, "");

  return {
    actionKey,
    avgReward:  entry.avgReward,
    visitCount: entry.visitCount,
    confidence: Math.min(95, 40 + Math.log2(entry.visitCount + 1) * 10)
  };
}

// ---- Update a Q-table entry (running average) ----------------
function update(stateHash, actionKey, reward, sessionId) {
  const key = makeKey(stateHash, actionKey);

  if (!qTable[key]) {
    qTable[key] = { avgReward: 0, visitCount: 0, lastUpdated: null, sessions: [] };
    meta.improvedEntries++;
  }

  const entry = qTable[key];
  const oldAvg = entry.avgReward;

  // Incremental running average
  entry.visitCount++;
  entry.avgReward = oldAvg + (reward - oldAvg) / entry.visitCount;
  entry.lastUpdated = new Date().toISOString();

  if (!entry.sessions.includes(sessionId)) {
    entry.sessions.push(sessionId);
    if (entry.sessions.length > 10) entry.sessions.shift(); // keep last 10
  }
}

// ---- Append a training session summary -----------------------
function logSession(summary) {
  trainingLog.push({
    ...summary,
    timestamp: new Date().toISOString()
  });
  if (trainingLog.length > 500) trainingLog.shift(); // rolling window

  meta.totalSimulations += summary.simulations || 0;
  meta.totalSessions++;
  meta.lastTrainingAt = new Date().toISOString();
  meta.coverageSize   = Object.keys(qTable).length;
  meta.avgRewardHistory.push({
    session:   meta.totalSessions,
    avgReward: summary.avgReward || 0,
    timestamp: new Date().toISOString()
  });
  if (meta.avgRewardHistory.length > 200) meta.avgRewardHistory.shift();
}

// ---- Read-only accessors -------------------------------------
function getQTable()      { return qTable; }
function getTrainingLog() { return trainingLog; }
function getMeta()        { return { ...meta, coverageSize: Object.keys(qTable).length }; }
function getSize()        { return Object.keys(qTable).length; }

// Load on module require
loadFromDisk();

module.exports = {
  lookup,
  update,
  logSession,
  saveToDisk,
  getQTable,
  getTrainingLog,
  getMeta,
  getSize,
  makeKey
};
