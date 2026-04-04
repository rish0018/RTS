// ============================================================
// tutor.js — AI Tutor: observes GameState, gives explainable suggestions
// ============================================================
// This module is READ-ONLY — it never mutates the game state.
// It analyses the situation and returns a human-readable suggestion
// with a confidence score and reasoning.
// ============================================================

const SUGGESTION_COOLDOWN_TICKS = 30; // suggest every ~3s
let lastSuggestionTick = -999;

/**
 * Main entry point.
 * Call once per game tick. Returns null if too early, else a suggestion object.
 */
function analyzeTick(state) {
  if (state.gameOver) return null;
  if (state.tick - lastSuggestionTick < SUGGESTION_COOLDOWN_TICKS) return null;

  lastSuggestionTick = state.tick;

  const situation = assessSituation(state);
  const suggestion = pickBestSuggestion(situation, state);

  return suggestion;
}

// ---- Situation Assessment -----------------------------------

function assessSituation(state) {
  const human  = state.players.human;
  const ai     = state.players.ai;

  const humanUnits = state.units.filter(u => u.owner === "human");
  const aiUnits    = state.units.filter(u => u.owner === "ai");

  // Left lane = x < 9, Right lane = x >= 9
  const aiPushLeft  = aiUnits.filter(u => u.x < 9).length;
  const aiPushRight = aiUnits.filter(u => u.x >= 9).length;

  // How close are AI units to human towers?
  const humanTowerRows = human.towers.map(t => t.y);
  const closestAiUnit  = aiUnits.reduce((min, u) => {
    const dist = Math.min(...humanTowerRows.map(ty => Math.abs(u.y - ty)));
    return dist < min ? dist : min;
  }, 999);

  // Tower health
  const humanTowerHp = human.towers.reduce((s, t) => s + t.hp, 0);
  const aiTowerHp    = ai.towers.reduce((s, t) => s + t.hp, 0);
  const towerHpDiff  = humanTowerHp - aiTowerHp; // positive = human winning

  return {
    humanElixir: human.elixir,
    aiElixir: ai.elixir,
    humanUnitCount: humanUnits.length,
    aiUnitCount: aiUnits.length,
    aiPushLeft,
    aiPushRight,
    closestAiUnit,
    towerHpDiff,
    humanTowerHp,
    aiTowerHp,
    underAttack: closestAiUnit < 4,
    humanUnits,
    aiUnits
  };
}

// ---- Suggestion Picker --------------------------------------

function pickBestSuggestion(s, state) {
  const suggestions = [];

  // --- DEFENCE: Under attack ---
  if (s.underAttack) {
    if (s.humanElixir >= 3) {
      suggestions.push({
        priority: 10,
        action: "deploy",
        unit: "knight",
        lane: s.aiPushLeft >= s.aiPushRight ? "left" : "right",
        col: s.aiPushLeft >= s.aiPushRight ? 3 : 14,
        title: "⚠️ Defend Now!",
        reason: `Enemy troops are ${s.closestAiUnit} cells from your towers. Deploy a Knight to intercept on the ${s.aiPushLeft >= s.aiPushRight ? "left" : "right"} lane.`,
        confidence: 92
      });
    } else {
      suggestions.push({
        priority: 9,
        action: "wait",
        title: "⏳ Save Elixir",
        reason: `Under attack but only ${s.humanElixir} elixir — wait ${3 - s.humanElixir} more to deploy a defender.`,
        confidence: 85
      });
    }
  }

  // --- OFFENCE: Enemy lane is weak ---
  if (s.aiPushLeft === 0 && s.humanElixir >= 3) {
    suggestions.push({
      priority: 7,
      action: "deploy",
      unit: "archer",
      lane: "left",
      col: 4,
      title: "🏹 Push Left Lane",
      reason: "No enemy units in left lane. Send an Archer to pressure their tower.",
      confidence: 78
    });
  }

  if (s.aiPushRight === 0 && s.humanElixir >= 3) {
    suggestions.push({
      priority: 6,
      action: "deploy",
      unit: "knight",
      lane: "right",
      col: 13,
      title: "⚔️ Push Right Lane",
      reason: "Right lane is clear. A Knight can reach the enemy tower uncontested.",
      confidence: 75
    });
  }

  // --- TOWER HP ADVANTAGE: Go aggressive ---
  if (s.towerHpDiff > 100 && s.humanElixir >= 5 && !s.underAttack) {
    suggestions.push({
      priority: 8,
      action: "deploy",
      unit: "giant",
      lane: "center",
      col: 8,
      title: "🗿 Giant Push!",
      reason: `You're ahead by ${s.towerHpDiff} HP. Sending a Giant now can end the game.`,
      confidence: 88
    });
  }

  // --- ELIXIR: Sitting on max ---
  if (s.humanElixir >= 9 && s.aiUnitCount < 3) {
    suggestions.push({
      priority: 5,
      action: "deploy",
      unit: "wizard",
      lane: s.aiPushLeft >= s.aiPushRight ? "left" : "right",
      col: s.aiPushLeft >= s.aiPushRight ? 5 : 12,
      title: "🧙 Spend Your Elixir!",
      reason: "You're at max elixir — wasted regeneration. Deploy a Wizard to deal area damage.",
      confidence: 80
    });
  }

  // --- EQUALISER: Tower HP is low ---
  if (s.humanTowerHp < 200 && s.humanElixir >= 5) {
    suggestions.push({
      priority: 9,
      action: "deploy",
      unit: "giant",
      lane: "center",
      col: 8,
      title: "🔥 Equalise — Attack!",
      reason: "Your towers are damaged. Best defence is offence — send a Giant to threaten their king.",
      confidence: 70
    });
  }

  // --- DEFAULT: Generic advice ---
  if (suggestions.length === 0) {
    suggestions.push({
      priority: 1,
      action: "wait",
      title: "💡 Build Elixir",
      reason: `Situation is balanced. Save elixir until you reach at least 5. You currently have ${s.humanElixir}.`,
      confidence: 60
    });
  }

  // Return highest priority
  suggestions.sort((a, b) => b.priority - a.priority);
  return suggestions[0];
}

// ---- Reset (call when new game starts) ----------------------
function resetTutor() {
  lastSuggestionTick = -999;
}

module.exports = { analyzeTick, resetTutor };
