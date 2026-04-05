// ============================================================
// offlineTrainer.js — Offline RL Training Loop
// Runs N simulations across diverse synthetic game states,
// stores (stateHash, action) → avgReward in the Q-table.
// ============================================================

const { createGameState, tickGameState, spawnUnit, UNIT_TYPES, deepCloneState } = require("../game/gameState");
const db = require("./rlDatabase");

const UNIT_KEYS    = Object.keys(UNIT_TYPES);
const COLS         = [2, 3, 4, 8, 9, 13, 14, 15];
const HORIZON      = 20;   // ticks to simulate per action evaluation

// ---- Hash a game state into a compact key --------------------
// Captures elixir buckets, tower HP bands, enemy unit pressure per lane
function hashState(state) {
  const h = state.players.human;
  const a = state.players.ai;

  const elixirBucket = Math.floor(h.elixir / 2);   // 0–4

  const hpBand = (towers, owner) =>
    towers.reduce((s, t) => s + t.hp, 0);

  const humanHpBand  = Math.floor(hpBand(h.towers) / 100);  // 0–4
  const aiHpBand     = Math.floor(hpBand(a.towers) / 100);

  const units = state.units;
  const aiLeft   = units.filter(u => u.owner === "ai" && u.x < 6).length;
  const aiCenter = units.filter(u => u.owner === "ai" && u.x >= 6 && u.x < 12).length;
  const aiRight  = units.filter(u => u.owner === "ai" && u.x >= 12).length;
  const aiNear   = units.filter(u => u.owner === "ai" && u.y >= 7).length; // near human towers

  return `e${elixirBucket}_hHP${humanHpBand}_aHP${aiHpBand}_L${Math.min(aiLeft,3)}_C${Math.min(aiCenter,3)}_R${Math.min(aiRight,3)}_N${Math.min(aiNear,2)}`;
}

// ---- Reward function -----------------------------------------
function calcReward(finalState, initialState) {
  if (finalState.gameOver) {
    return finalState.winner === "human" ? 1000 : -1000;
  }
  const humanHp = finalState.players.human.towers.reduce((s, t) => s + t.hp, 0);
  const aiHp    = finalState.players.ai.towers.reduce((s, t) => s + t.hp, 0);
  const unitAdv = (finalState.units.filter(u => u.owner === "human").length -
                   finalState.units.filter(u => u.owner === "ai").length) * 8;
  return (humanHp - aiHp) + unitAdv;
}

// ---- Generate diverse synthetic initial states ---------------
function generateDiverseState(seed) {
  const state = createGameState();

  // Fast-forward a randomish number of ticks to get mid-game variety
  const preTicks = (seed % 5) * 30; // 0, 30, 60, 90, 120 ticks in
  for (let t = 0; t < preTicks && !state.gameOver; t++) {
    tickGameState(state);
  }

  // Inject some random units to vary the scene
  const humanUnits = ["knight", "archer", "minion", "giant"];
  const aiUnits    = ["knight", "minion", "bomber", "wizard"];

  const humanSpawns = seed % 3;
  const aiSpawns    = (seed + 1) % 4;

  for (let i = 0; i < humanSpawns; i++) {
    const type = humanUnits[(seed + i) % humanUnits.length];
    const col  = COLS[(seed * (i + 1)) % COLS.length];
    if (state.players.human.elixir >= UNIT_TYPES[type].elixirCost) {
      spawnUnit(state, type, "human", col);
    }
  }

  for (let i = 0; i < aiSpawns; i++) {
    const type = aiUnits[(seed + i) % aiUnits.length];
    const col  = COLS[(seed * (i + 2)) % COLS.length];
    if (state.players.ai.elixir >= UNIT_TYPES[type].elixirCost) {
      spawnUnit(state, type, "ai", col);
    }
  }

  // Vary elixir
  state.players.human.elixir = Math.min(10, 2 + (seed % 9));

  // Vary tower health
  const dmgBands = [0, 30, 60, 80];
  const dmg = dmgBands[seed % dmgBands.length];
  if (dmg > 0) {
    const towerIdx = seed % state.players.human.towers.length;
    state.players.human.towers[towerIdx].hp = Math.max(1, state.players.human.towers[towerIdx].hp - dmg);
  }

  return state;
}

// ---- Run a single simulation for (state, action) ------------
function simulateAction(baseState, action) {
  const simState = deepCloneState(baseState);

  if (action.type !== null) {
    spawnUnit(simState, action.type, "human", action.col);
  }

  for (let t = 0; t < HORIZON && !simState.gameOver; t++) {
    tickGameState(simState);
  }

  return calcReward(simState, baseState);
}

// ---- Main training runner ------------------------------------
// totalSims: how many total simulation runs to perform
// onProgress: optional callback(done, total, latestEntry)
async function runOfflineTraining(totalSims = 1000, onProgress = null) {
  const sessionId = `session_${Date.now()}`;
  const startTime = Date.now();
  let   done      = 0;
  let   totalReward = 0;
  let   improved  = 0;

  console.log(`\n🎓 Starting offline RL training — ${totalSims} simulations, session: ${sessionId}`);

  // Build all (state, action) pairs to evaluate
  // We cycle through diverse states and all possible actions
  const statesPerRound = 20;  // distinct state seeds per batch
  const simsPerAction  = Math.max(1, Math.floor(totalSims / (statesPerRound * (UNIT_KEYS.length * 3 + 1))));

  const allResults = [];

  for (let stateIdx = 0; stateIdx < statesPerRound && done < totalSims; stateIdx++) {
    const baseState = generateDiverseState(stateIdx);
    if (baseState.gameOver) continue;

    const stateHash = hashState(baseState);

    // All possible actions: each unit type × columns + wait
    const actions = [];
    UNIT_KEYS.forEach(type => {
      if (baseState.players.human.elixir >= UNIT_TYPES[type].elixirCost) {
        [3, 8, 13].forEach(col => actions.push({ type, col, key: `${type}-${col}` }));
      }
    });
    actions.push({ type: null, col: null, key: "wait" });

    for (const action of actions) {
      if (done >= totalSims) break;

      let runReward = 0;
      const runs = Math.min(simsPerAction, totalSims - done);

      for (let r = 0; r < runs; r++) {
        const reward = simulateAction(baseState, action);
        runReward += reward;
        done++;
        totalReward += reward;
      }

      const avgReward = runReward / runs;
      db.update(stateHash, action.key, avgReward, sessionId);
      improved++;

      allResults.push({ stateHash, action: action.key, avgReward });

      if (onProgress) {
        onProgress(done, totalSims, { stateHash, action: action.key, avgReward: Math.round(avgReward) });
      }

      // Yield to event loop every 50 sims so server stays responsive
      if (done % 50 === 0) {
        await new Promise(r => setImmediate(r));
      }
    }
  }

  // Calculate improvement metrics
  const avgReward = totalReward / Math.max(done, 1);
  const elapsed   = ((Date.now() - startTime) / 1000).toFixed(1);

  // Top 5 actions by reward
  allResults.sort((a, b) => b.avgReward - a.avgReward);
  const topActions = allResults.slice(0, 5).map(r => ({
    state:  r.stateHash,
    action: r.action,
    reward: Math.round(r.avgReward)
  }));

  const summary = {
    sessionId,
    simulations:  done,
    statesCovered: statesPerRound,
    avgReward:    parseFloat(avgReward.toFixed(2)),
    improvedEntries: improved,
    elapsedSeconds: parseFloat(elapsed),
    topActions,
    dbSize: db.getSize()
  };

  db.logSession(summary);
  db.saveToDisk();

  console.log(`✅ Training complete: ${done} sims in ${elapsed}s | avgReward: ${avgReward.toFixed(1)} | DB size: ${db.getSize()} entries`);
  return summary;
}

module.exports = { runOfflineTraining, hashState };
