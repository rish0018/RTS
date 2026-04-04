// ============================================================
// gameState.js — Single Source of Truth for the entire simulation
// ============================================================

const GRID_COLS = 18;
const GRID_ROWS = 10;
const RIVER_Y   = 4; // row index that divides top (enemy) from bottom (player)

let unitIdCounter = 0;

function createGameState() {
  return {
    tick: 0,
    arena: { cols: GRID_COLS, rows: GRID_ROWS },
    riverY: RIVER_Y,

    players: {
      human: {
        elixir: 5,
        maxElixir: 10,
        towers: [
          { id: "h-tower-left",   x: 2,  y: 8, hp: 100, maxHp: 100, owner: "human" },
          { id: "h-tower-right",  x: 15, y: 8, hp: 100, maxHp: 100, owner: "human" },
          { id: "h-king",         x: 8,  y: 9, hp: 200, maxHp: 200, owner: "human" }
        ]
      },
      ai: {
        elixir: 5,
        maxElixir: 10,
        towers: [
          { id: "ai-tower-left",  x: 2,  y: 1, hp: 100, maxHp: 100, owner: "ai" },
          { id: "ai-tower-right", x: 15, y: 1, hp: 100, maxHp: 100, owner: "ai" },
          { id: "ai-king",        x: 8,  y: 0, hp: 200, maxHp: 200, owner: "ai" }
        ]
      }
    },

    units: [],   // active units on the field
    lastAction: null,
    gameOver: false,
    winner: null
  };
}

// ---- Unit Templates ----------------------------------------
const UNIT_TYPES = {
  knight: {
    name: "Knight",
    hp: 80,
    maxHp: 80,
    speed: 1,       // cells per second
    damage: 15,
    range: 1,
    attackSpeed: 1, // attacks per second
    elixirCost: 3,
    emoji: "⚔️"
  },
  archer: {
    name: "Archer",
    hp: 40,
    maxHp: 40,
    speed: 1,
    damage: 20,
    range: 3,
    attackSpeed: 1.2,
    elixirCost: 3,
    emoji: "🏹"
  },
  giant: {
    name: "Giant",
    hp: 200,
    maxHp: 200,
    speed: 0.5,
    damage: 30,
    range: 1,
    attackSpeed: 0.8,
    elixirCost: 5,
    emoji: "🗿"
  },
  wizard: {
    name: "Wizard",
    hp: 60,
    maxHp: 60,
    speed: 0.8,
    damage: 50,
    range: 4,
    attackSpeed: 0.7,
    elixirCost: 5,
    emoji: "🧙"
  }
};

// ---- Spawn a unit ------------------------------------------
function spawnUnit(state, type, owner, col) {
  const template = UNIT_TYPES[type];
  if (!template) return null;

  const player  = state.players[owner];
  if (player.elixir < template.elixirCost) return null; // not enough elixir

  player.elixir -= template.elixirCost;

  // Human units start at bottom (riverY+1), AI at top (riverY-1)
  const row = owner === "human" ? RIVER_Y + 1 : RIVER_Y - 1;

  const unit = {
    id: `unit-${++unitIdCounter}`,
    type,
    owner,
    x: Math.max(0, Math.min(GRID_COLS - 1, col)),
    y: row,
    hp: template.maxHp,
    maxHp: template.maxHp,
    speed: template.speed,
    damage: template.damage,
    range: template.range,
    attackSpeed: template.attackSpeed,
    elixirCost: template.elixirCost,
    emoji: template.emoji,
    name: template.name,
    attackCooldown: 0,
    moveCooldown: 0,
    target: null
  };

  state.units.push(unit);
  return unit;
}

// ---- Tick: update the simulation ---------------------------
function tickGameState(state) {
  if (state.gameOver) return;

  state.tick++;

  // 1. Elixir regen (every 2.8s = 28 ticks at 100ms per tick)
  ["human", "ai"].forEach(owner => {
    const p = state.players[owner];
    if (state.tick % 28 === 0 && p.elixir < p.maxElixir) {
      p.elixir = Math.min(p.maxElixir, p.elixir + 1);
    }
  });

  // 2. AI spawns units occasionally (simple rule-based)
  aiSpawnLogic(state);

  // 3. Move units
  state.units.forEach(unit => {
    unit.moveCooldown = Math.max(0, unit.moveCooldown - 1);
    unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);

    if (unit.moveCooldown > 0) return;

    const target = findTarget(state, unit);

    if (target) {
      const dist = getDistance(unit, target);
      if (dist <= unit.range) {
        // Attack
        if (unit.attackCooldown === 0) {
          target.hp -= unit.damage;
          unit.attackCooldown = Math.round(10 / unit.attackSpeed);
          if (target.hp <= 0) {
            removeTarget(state, target);
          }
        }
      } else {
        // Move toward target
        moveToward(unit, target);
        unit.moveCooldown = Math.round(10 / unit.speed);
      }
    } else {
      // No target — march to enemy side
      marchForward(unit);
      unit.moveCooldown = Math.round(10 / unit.speed);
    }
  });

  // 4. Remove dead units
  state.units = state.units.filter(u => u.hp > 0);

  // 5. Check win condition
  const humanKing = state.players.human.towers.find(t => t.id === "h-king");
  const aiKing    = state.players.ai.towers.find(t => t.id === "ai-king");

  if (!humanKing || humanKing.hp <= 0) {
    state.gameOver = true;
    state.winner   = "ai";
  } else if (!aiKing || aiKing.hp <= 0) {
    state.gameOver = true;
    state.winner   = "human";
  }
}

// ---- Helpers -----------------------------------------------

function getDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
}

function findTarget(state, unit) {
  const enemies = unit.owner === "human"
    ? [...state.units.filter(u => u.owner === "ai"), ...state.players.ai.towers]
    : [...state.units.filter(u => u.owner === "human"), ...state.players.human.towers];

  if (enemies.length === 0) return null;

  // Closest enemy
  return enemies.reduce((closest, e) => {
    const d = getDistance(unit, e);
    return d < getDistance(unit, closest) ? e : closest;
  });
}

function removeTarget(state, target) {
  // Could be a unit or a tower
  state.units = state.units.filter(u => u.id !== target.id);
  ["human", "ai"].forEach(owner => {
    state.players[owner].towers = state.players[owner].towers.filter(t => t.id !== target.id);
  });
}

function moveToward(unit, target) {
  const dx = target.x - unit.x;
  const dy = target.y - unit.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    unit.x += dx > 0 ? 1 : -1;
  } else {
    unit.y += dy > 0 ? 1 : -1;
  }

  unit.x = Math.max(0, Math.min(17, unit.x));
  unit.y = Math.max(0, Math.min(9, unit.y));
}

function marchForward(unit) {
  if (unit.owner === "human") {
    unit.y = Math.max(0, unit.y - 1);
  } else {
    unit.y = Math.min(9, unit.y + 1);
  }
}

// ---- Simple AI Opponent ------------------------------------
const AI_UNIT_TYPES = ["knight", "archer", "giant", "wizard"];

function aiSpawnLogic(state) {
  const ai = state.players.ai;

  // Spawn every ~5s (50 ticks) if enough elixir
  if (state.tick % 50 !== 0) return;

  const affordable = AI_UNIT_TYPES.filter(t => {
    const cost = { knight: 3, archer: 3, giant: 5, wizard: 5 }[t];
    return ai.elixir >= cost;
  });

  if (affordable.length === 0) return;

  const type = affordable[Math.floor(Math.random() * affordable.length)];
  const col  = Math.floor(Math.random() * 14) + 2; // cols 2..15
  spawnUnit(state, type, "ai", col);
}

module.exports = { createGameState, tickGameState, spawnUnit, UNIT_TYPES };
