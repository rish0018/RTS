// gameState.js 

const GRID_COLS = 18;
const GRID_ROWS = 10;
const RIVER_Y   = 4;

let unitIdCounter = 0;

function createGameState() {
  // Reset unit ID counter for each new game
  unitIdCounter = 0;
  return {
    tick: 0,
    arena: { cols: GRID_COLS, rows: GRID_ROWS },
    riverY: RIVER_Y,
    players: {
      human: {
        elixir: 5, maxElixir: 10,
        towers: [
          { id: "h-tower-left",  x: 2,  y: 8, hp: 100, maxHp: 100, owner: "human" },
          { id: "h-tower-right", x: 15, y: 8, hp: 100, maxHp: 100, owner: "human" },
          { id: "h-king",        x: 8,  y: 9, hp: 200, maxHp: 200, owner: "human" }
        ]
      },
      ai: {
        elixir: 5, maxElixir: 10,
        towers: [
          { id: "ai-tower-left",  x: 2,  y: 1, hp: 100, maxHp: 100, owner: "ai" },
          { id: "ai-tower-right", x: 15, y: 1, hp: 100, maxHp: 100, owner: "ai" },
          { id: "ai-king",        x: 8,  y: 0, hp: 200, maxHp: 200, owner: "ai" }
        ]
      }
    },
    units: [],
    lastAction: null,
    gameOver: false,
    winner: null,
    stats: {
      human: { unitsDeployed: 0, towersDestroyed: 0, elixirSpent: 0 },
      ai:    { unitsDeployed: 0, towersDestroyed: 0, elixirSpent: 0 }
    },
    events: []
  };
}

// ---- Unit Templates ----------------------------------------
const UNIT_TYPES = {
  knight: {
    name: "Knight", hp: 80, maxHp: 80, speed: 1,
    damage: 15, range: 1, attackSpeed: 1,
    elixirCost: 3, emoji: "⚔️",
    description: "Balanced melee fighter."
  },
  archer: {
    name: "Archer", hp: 40, maxHp: 40, speed: 1,
    damage: 20, range: 3, attackSpeed: 1.2,
    elixirCost: 3, emoji: "🏹",
    description: "Ranged attacker. Weak vs. melee."
  },
  giant: {
    name: "Giant", hp: 200, maxHp: 200, speed: 0.5,
    damage: 30, range: 1, attackSpeed: 0.8,
    elixirCost: 5, emoji: "🗿",
    description: "Tank that targets towers first.",
    prefersTowers: true
  },
  wizard: {
    name: "Wizard", hp: 60, maxHp: 60, speed: 0.8,
    damage: 50, range: 4, attackSpeed: 0.7,
    elixirCost: 5, emoji: "🧙",
    description: "High damage, long range. Squishy."
  },
  minion: {
    name: "Minion", hp: 25, maxHp: 25, speed: 1.5,
    damage: 10, range: 1, attackSpeed: 1.5,
    elixirCost: 2, emoji: "😈",
    description: "Fast and cheap swarm unit."
  },
  bomber: {
    name: "Bomber", hp: 50, maxHp: 50, speed: 0.7,
    damage: 35, range: 3, attackSpeed: 0.6,
    elixirCost: 4, emoji: "💣", splash: true,
    description: "Slow but deals splash damage to groups."
  }
};

const ALL_UNIT_KEYS = Object.keys(UNIT_TYPES);

// ---- Spawn a unit ------------------------------------------
function spawnUnit(state, type, owner, col) {
  const template = UNIT_TYPES[type];
  if (!template) return null;
  const player = state.players[owner];
  if (player.elixir < template.elixirCost) return null;
  // Ensure unitIdCounter is fresh (important for sim environments)
  if (unitIdCounter > 10000) unitIdCounter = 0;

  player.elixir -= template.elixirCost;

  const row = owner === "human" ? RIVER_Y + 1 : RIVER_Y - 1;
  const unit = {
    id: `unit-${++unitIdCounter}`,
    type, owner,
    x: Math.max(0, Math.min(GRID_COLS - 1, col)),
    y: row,
    hp: template.maxHp, maxHp: template.maxHp,
    speed: template.speed, damage: template.damage,
    range: template.range, attackSpeed: template.attackSpeed,
    splash: template.splash || false,
    prefersTowers: template.prefersTowers || false,
    elixirCost: template.elixirCost,
    emoji: template.emoji, name: template.name,
    attackCooldown: 0, moveCooldown: 0, target: null
  };

  state.units.push(unit);
  if (state.stats) {
    state.stats[owner].unitsDeployed++;
    state.stats[owner].elixirSpent += template.elixirCost;
  }
  logEvent(state, { type: "spawn", owner, unitType: type, col, tick: state.tick });
  return unit;
}

// ---- Tick: update the simulation ---------------------------
function tickGameState(state) {
  if (state.gameOver) return;
  state.tick++;

  // Elixir regen every 28 ticks (~2.8s)
  ["human", "ai"].forEach(owner => {
    const p = state.players[owner];
    if (state.tick % 28 === 0 && p.elixir < p.maxElixir) {
      p.elixir = Math.min(p.maxElixir, p.elixir + 1);
    }
  });

  // AI decision-making
  aiDecisionLogic(state);

  // Update units
  state.units.forEach(unit => {
    unit.moveCooldown   = Math.max(0, unit.moveCooldown - 1);
    unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
    if (unit.moveCooldown > 0) return;

    const target = findTarget(state, unit);

    if (target) {
      const dist = getDistance(unit, target);
      if (dist <= unit.range) {
        if (unit.attackCooldown === 0) {
          const atkCd = Math.round(10 / unit.attackSpeed);
          if (unit.splash) {
            // Splash: damage all enemies within range
            const enemies = getEnemies(state, unit);
            enemies.forEach(e => {
              if (getDistance(unit, e) <= unit.range) {
                e.hp -= unit.damage;
              }
            });
          } else {
            target.hp -= unit.damage;
          }
          unit.attackCooldown = atkCd;

          // Process kills
          processKills(state, unit.owner);
        }
      } else {
        moveToward(unit, target, state);
        unit.moveCooldown = Math.round(10 / unit.speed);
      }
    } else {
      marchForward(unit);
      unit.moveCooldown = Math.round(10 / unit.speed);
    }
  });

  // Final cleanup
  state.units = state.units.filter(u => u.hp > 0);
  ["human", "ai"].forEach(owner => {
    state.players[owner].towers = state.players[owner].towers.filter(t => t.hp > 0);
  });

  // Win condition
  const hKing = state.players.human.towers.find(t => t.id === "h-king");
  const aKing = state.players.ai.towers.find(t => t.id === "ai-king");
  if (!hKing || hKing.hp <= 0) { state.gameOver = true; state.winner = "ai"; }
  else if (!aKing || aKing.hp <= 0) { state.gameOver = true; state.winner = "human"; }

  // Trim event ring buffer
  if (state.events && state.events.length > 200) {
    state.events = state.events.slice(-200);
  }
}

function processKills(state, killerOwner) {
  const deadTowers = [
    ...state.players.human.towers.filter(t => t.hp <= 0),
    ...state.players.ai.towers.filter(t => t.hp <= 0)
  ];
  deadTowers.forEach(t => {
    logEvent(state, { type: "tower_destroyed", id: t.id, owner: t.owner, tick: state.tick });
    if (state.stats) state.stats[killerOwner].towersDestroyed++;
  });
}

// ---- Helpers -----------------------------------------------
function getDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getEnemies(state, unit) {
  if (unit.owner === "human") {
    return [...state.units.filter(u => u.owner === "ai"), ...state.players.ai.towers];
  } else {
    return [...state.units.filter(u => u.owner === "human"), ...state.players.human.towers];
  }
}

function findTarget(state, unit) {
  const enemies = getEnemies(state, unit);
  if (enemies.length === 0) return null;

  // Giants prefer towers if within approach range
  if (unit.prefersTowers) {
    const towers = enemies.filter(e => e.id && e.id.includes("tower") || (e.id && e.id.includes("king")));
    if (towers.length > 0) {
      const nearTower = towers.find(t => getDistance(unit, t) <= unit.range + 3);
      if (nearTower) return nearTower;
    }
  }

  return enemies.reduce((closest, e) =>
    getDistance(unit, e) < getDistance(unit, closest) ? e : closest
  );
}

function moveToward(unit, target, state) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  let nx = unit.x, ny = unit.y;

  if (Math.abs(dx) >= Math.abs(dy)) nx += dx > 0 ? 1 : -1;
  else ny += dy > 0 ? 1 : -1;

  // Collision avoidance with friendlies
  const occupied = state.units.some(
    u => u !== unit && u.owner === unit.owner
      && Math.round(u.x) === Math.round(nx) && Math.round(u.y) === Math.round(ny)
  );

  if (occupied) {
    // Try orthogonal alternative
    if (Math.abs(dx) >= Math.abs(dy)) {
      ny = unit.y + (dy !== 0 ? (dy > 0 ? 1 : -1) : 1);
      nx = unit.x;
    } else {
      nx = unit.x + (dx !== 0 ? (dx > 0 ? 1 : -1) : 1);
      ny = unit.y;
    }
  }

  // Bounds check both primary and alternative moves
  unit.x = Math.max(0, Math.min(GRID_COLS - 1, nx));
  unit.y = Math.max(0, Math.min(GRID_ROWS - 1, ny));
}

function marchForward(unit) {
  if (unit.owner === "human") unit.y = Math.max(0, unit.y - 1);
  else unit.y = Math.min(GRID_ROWS - 1, unit.y + 1);
}

// ---- Enhanced Rule-Based AI --------------------------------
function aiDecisionLogic(state) {
  const ai    = state.players.ai;
  const human = state.players.human;
  if (state.tick % 20 !== 0) return;

  const humanUnits = state.units.filter(u => u.owner === "human");
  const aiUnits    = state.units.filter(u => u.owner === "ai");
  const threatLevel = humanUnits.filter(u => u.y <= RIVER_Y + 2).length;
  const humanLeft   = humanUnits.filter(u => u.x < 9).length;
  const humanRight  = humanUnits.filter(u => u.x >= 9).length;
  const aiTowerHp   = ai.towers.reduce((s, t) => s + t.hp, 0);
  const humanTowerHp = human.towers.reduce((s, t) => s + t.hp, 0);

  let type = null, col = null;

  if (threatLevel >= 2 && ai.elixir >= 3) {
    // Defend
    type = humanLeft > humanRight ? "knight" : "archer";
    col  = humanLeft > humanRight ? 3 : 14;
  } else if (aiTowerHp > humanTowerHp + 100 && ai.elixir >= 5) {
    // Winning — push hard
    type = "giant";
    col  = humanLeft <= humanRight ? 4 : 13;
  } else if (ai.elixir >= 9) {
    // Elixir full — must spend
    const affordable = ALL_UNIT_KEYS.filter(t => UNIT_TYPES[t].elixirCost <= ai.elixir);
    type = affordable[Math.floor(Math.random() * affordable.length)];
    col  = Math.floor(Math.random() * 14) + 2;
  } else if (ai.elixir >= 4 && aiUnits.length < 3 && state.tick % 40 === 0) {
    const affordable = ALL_UNIT_KEYS.filter(t => UNIT_TYPES[t].elixirCost <= ai.elixir);
    type = affordable[Math.floor(Math.random() * affordable.length)];
    col  = Math.floor(Math.random() * 14) + 2;
  }

  if (type && col !== null) {
    spawnUnit(state, type, "ai", col);
  }
}

// ---- RL Simulation Engine ----------------------------------
// Runs N Monte-Carlo simulations from the current state,
// evaluating each possible human action by avg future reward.
// Called by tutor.js to produce RL-backed suggestions.

function runRLSimulation(baseState, numSimulations = 15, horizonTicks = 120) {
  const actionValues = {};

  const possibleActions = [];
  ALL_UNIT_KEYS.forEach(type => {
    if (baseState.players.human.elixir >= UNIT_TYPES[type].elixirCost) {
      [3, 8, 13].forEach(col => possibleActions.push({ type, col }));
    }
  });
  possibleActions.push({ type: null, col: null }); // "wait"

  possibleActions.forEach(action => {
    const key = action.type ? `${action.type}-${action.col}` : "wait";
    let totalReward = 0;

    for (let sim = 0; sim < numSimulations; sim++) {
      const simState = deepCloneState(baseState);

      if (action.type) spawnUnit(simState, action.type, "human", action.col);

      for (let t = 0; t < horizonTicks && !simState.gameOver; t++) {
        tickGameState(simState);
      }

      totalReward += calcReward(simState, baseState);
    }

    actionValues[key] = {
      action,
      avgReward: totalReward / numSimulations,
      simCount: numSimulations
    };
  });

  const ranked = Object.values(actionValues).sort((a, b) => b.avgReward - a.avgReward);
  return {
    ranked,
    bestAction: ranked[0]?.action ?? null,
    bestReward: ranked[0]?.avgReward ?? 0
  };
}

function calcReward(finalState, initialState) {
  if (finalState.gameOver) {
    return finalState.winner === "human" ? 1000 : -1000;
  }
  const humanHp   = finalState.players.human.towers.reduce((s, t) => s + t.hp, 0);
  const aiHp      = finalState.players.ai.towers.reduce((s, t) => s + t.hp, 0);
  const unitAdv   = (finalState.units.filter(u => u.owner === "human").length -
                     finalState.units.filter(u => u.owner === "ai").length) * 10;
  return (humanHp - aiHp) + unitAdv;
}

function deepCloneState(state) {
  return {
    tick: state.tick,
    arena: { ...state.arena },
    riverY: state.riverY,
    players: {
      human: {
        elixir: state.players.human.elixir,
        maxElixir: state.players.human.maxElixir,
        towers: state.players.human.towers.map(t => ({ ...t }))
      },
      ai: {
        elixir: state.players.ai.elixir,
        maxElixir: state.players.ai.maxElixir,
        towers: state.players.ai.towers.map(t => ({ ...t }))
      }
    },
    units: state.units.map(u => ({ ...u })),
    lastAction: null,
    gameOver: state.gameOver,
    winner: state.winner,
    stats: {
      human: { ...state.stats?.human },
      ai: { ...state.stats?.ai }
    },
    events: []
  };
}

function logEvent(state, event) {
  if (!state.events) state.events = [];
  state.events.push(event);
}

module.exports = { createGameState, tickGameState, spawnUnit, UNIT_TYPES, runRLSimulation, deepCloneState };
