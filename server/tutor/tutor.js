// ============================================================
// tutor.js — AI Tutor with RL Simulation-Backed Suggestions
// IMPROVED: Integrates runRLSimulation for simulation-based
//           action ranking, richer situation analysis, 
//           and per-lane threat modelling.
// ============================================================

const { runRLSimulation, UNIT_TYPES } = require("../game/gameState");

const SUGGESTION_COOLDOWN_TICKS = 30;
let lastSuggestionTick = -999;
let rlResultCache = null;      // Cache last RL result to avoid re-running every tick
let lastRLTick = -999;
const RL_COOLDOWN_TICKS = 60;  // Run RL sim every 6s (~60 ticks at 100ms)

/**
 * Main entry point — called once per game tick.
 * Returns null if on cooldown, else a rich suggestion object.
 */
function analyzeTick(state) {
  if (state.gameOver) return null;
  if (state.tick - lastSuggestionTick < SUGGESTION_COOLDOWN_TICKS) return null;

  lastSuggestionTick = state.tick;

  // Run RL simulation periodically (expensive — throttled separately)
  if (state.tick - lastRLTick >= RL_COOLDOWN_TICKS) {
    try {
      rlResultCache = runRLSimulation(state, 12, 100);
    } catch (e) {
      rlResultCache = null;
    }
    lastRLTick = state.tick;
  }

  const situation  = assessSituation(state);
  const suggestion = pickBestSuggestion(situation, state, rlResultCache);

  return suggestion;
}

// ---- Situation Assessment -----------------------------------
function assessSituation(state) {
  const human = state.players.human;
  const ai    = state.players.ai;

  const humanUnits = state.units.filter(u => u.owner === "human");
  const aiUnits    = state.units.filter(u => u.owner === "ai");

  // Lane breakdown
  const aiLeft   = aiUnits.filter(u => u.x < 6);
  const aiCenter = aiUnits.filter(u => u.x >= 6 && u.x < 12);
  const aiRight  = aiUnits.filter(u => u.x >= 12);

  const humanLeft   = humanUnits.filter(u => u.x < 6);
  const humanCenter = humanUnits.filter(u => u.x >= 6 && u.x < 12);
  const humanRight  = humanUnits.filter(u => u.x >= 12);

  // Proximity threat
  const humanTowerRows = human.towers.map(t => t.y);
  const closestAiDist  = aiUnits.reduce((min, u) => {
    const d = Math.min(...humanTowerRows.map(ty => Math.abs(u.y - ty)));
    return d < min ? d : min;
  }, 999);

  // Individual tower HPs
  const hKing  = human.towers.find(t => t.id === "h-king");
  const hLeft  = human.towers.find(t => t.id === "h-tower-left");
  const hRight = human.towers.find(t => t.id === "h-tower-right");

  // Tower HP totals
  const humanTowerHp = human.towers.reduce((s, t) => s + t.hp, 0);
  const aiTowerHp    = ai.towers.reduce((s, t) => s + t.hp, 0);

  // Elixir efficiency: is human holding too much?
  const elixirWaste = human.elixir >= 8;

  return {
    humanElixir: human.elixir,
    aiElixir: ai.elixir,
    humanUnitCount: humanUnits.length,
    aiUnitCount: aiUnits.length,
    aiLeftCount: aiLeft.length,
    aiCenterCount: aiCenter.length,
    aiRightCount: aiRight.length,
    humanLeftCount: humanLeft.length,
    humanCenterCount: humanCenter.length,
    humanRightCount: humanRight.length,
    closestAiDist,
    humanTowerHp,
    aiTowerHp,
    towerHpDiff: humanTowerHp - aiTowerHp,
    underAttack: closestAiDist < 4,
    kingSeverelyDamaged: hKing && hKing.hp < 100,
    leftTowerLost: !hLeft,
    rightTowerLost: !hRight,
    elixirWaste,
    humanUnits,
    aiUnits
  };
}

// ---- Suggestion Picker with RL Input -----------------------
function pickBestSuggestion(s, state, rlResult) {
  const suggestions = [];

  // --- RL-BACKED SUGGESTION (highest priority if available) ---
  if (rlResult && rlResult.bestAction && rlResult.bestReward > 20) {
    const { bestAction, bestReward, ranked } = rlResult;
    const topAction = ranked[0];

    if (topAction && topAction.action.type) {
      const unitInfo = UNIT_TYPES[topAction.action.type];
      const canAfford = s.humanElixir >= (unitInfo?.elixirCost ?? 99);

      suggestions.push({
        priority: 12,
        action: "deploy",
        unit: topAction.action.type,
        col: topAction.action.col,
        lane: topAction.action.col < 7 ? "left" : topAction.action.col > 10 ? "right" : "center",
        title: ` RL Recommends: ${unitInfo?.name || topAction.action.type}`,
        reason: `Simulated ${rlResult.ranked[0].simCount} futures. Deploying ${unitInfo?.name} at column ${topAction.action.col} gives the best expected outcome (score: ${Math.round(bestReward)}).`,
        confidence: Math.min(95, Math.round(60 + (bestReward / 20))),
        rlBacked: true,
        canAfford
      });
    } else if (topAction?.action.type === null) {
      suggestions.push({
        priority: 11,
        action: "wait",
        title: " RL Recommends: Wait",
        reason: `Simulations show holding elixir now leads to better outcomes (score: ${Math.round(bestReward)}). Be patient.`,
        confidence: 72,
        rlBacked: true
      });
    }
  }

  // --- RULE-BASED SUGGESTIONS ---

  // EMERGENCY: King is nearly dead
  if (s.kingSeverelyDamaged && s.humanElixir >= 3) {
    suggestions.push({
      priority: 15,
      action: "deploy",
      unit: "giant",
      lane: "center",
      col: 8,
      title: " KING UNDER THREAT!",
      reason: "Your King tower is critically damaged! Deploy a Giant to draw fire and counter-push.",
      confidence: 95
    });
  }

  // URGENT DEFENCE: Under active attack
  if (s.underAttack) {
    if (s.humanElixir >= 2) {
      const rushLane = s.aiLeftCount >= s.aiRightCount ? "left" : "right";
      const rushCol  = rushLane === "left" ? 3 : 14;
      const defender = s.humanElixir >= 3 ? "knight" : "minion";

      suggestions.push({
        priority: 10,
        action: "deploy",
        unit: defender,
        lane: rushLane,
        col: rushCol,
        title: ` Defend the ${rushLane.toUpperCase()} Lane!`,
        reason: `Enemy troops are ${s.closestAiDist} tiles from your towers. Drop a ${UNIT_TYPES[defender]?.name} on ${rushLane} to intercept.`,
        confidence: 90
      });
    } else {
      suggestions.push({
        priority: 9,
        action: "wait",
        title: " Stall — No Elixir",
        reason: `Enemy attacking but you only have ${s.humanElixir} elixir. Wait ${3 - s.humanElixir} more.`,
        confidence: 80
      });
    }
  }

  // SPLASH AGAINST GROUPS: Multiple enemies in same lane
  if (s.aiLeftCount >= 3 && s.humanElixir >= 4) {
    suggestions.push({
      priority: 8,
      action: "deploy",
      unit: "bomber",
      lane: "left",
      col: 4,
      title: " Splash the Left Horde!",
      reason: `${s.aiLeftCount} enemies cramped in the left lane. A Bomber's splash damage will devastate them.`,
      confidence: 85
    });
  }
  if (s.aiRightCount >= 3 && s.humanElixir >= 4) {
    suggestions.push({
      priority: 8,
      action: "deploy",
      unit: "bomber",
      lane: "right",
      col: 13,
      title: "💣 Splash the Right Horde!",
      reason: `${s.aiRightCount} enemies grouped on the right. Bomber splash is extremely effective here.`,
      confidence: 85
    });
  }

  // OPEN LANE PUSH
  if (s.aiLeftCount === 0 && s.humanElixir >= 3) {
    suggestions.push({
      priority: 7,
      action: "deploy",
      unit: "archer",
      lane: "left",
      col: 4,
      title: " Push Open Left Lane",
      reason: "No enemies in the left lane. An Archer can deal free damage to their tower.",
      confidence: 78
    });
  }
  if (s.aiRightCount === 0 && s.humanElixir >= 3) {
    suggestions.push({
      priority: 6,
      action: "deploy",
      unit: "knight",
      lane: "right",
      col: 13,
      title: "⚔️ Push Open Right Lane",
      reason: "Right lane is uncontested. Send a Knight to pressure the enemy tower.",
      confidence: 75
    });
  }

  // TOWER ADVANTAGE PUSH
  if (s.towerHpDiff > 100 && s.humanElixir >= 5 && !s.underAttack) {
    suggestions.push({
      priority: 8,
      action: "deploy",
      unit: "giant",
      lane: "center",
      col: 8,
      title: " Giant Push — Finish Them!",
      reason: `You lead by ${s.towerHpDiff} HP. A Giant push now can end the game.`,
      confidence: 88
    });
  }

  // SWARM: Cheap minions when elixir is building
  if (s.humanElixir >= 7 && s.aiUnitCount < 2 && !s.underAttack) {
    suggestions.push({
      priority: 5,
      action: "deploy",
      unit: "minion",
      lane: s.aiLeftCount <= s.aiRightCount ? "left" : "right",
      col: s.aiLeftCount <= s.aiRightCount ? 5 : 12,
      title: " Minion Swarm",
      reason: `High elixir, low threat. Send cheap fast Minions to harass and probe defenses.`,
      confidence: 68
    });
  }

  // ELIXIR WASTE PREVENTION
  if (s.elixirWaste && s.aiUnitCount < 4) {
    suggestions.push({
      priority: 5,
      action: "deploy",
      unit: "wizard",
      lane: s.aiLeftCount >= s.aiRightCount ? "left" : "right",
      col: s.aiLeftCount >= s.aiRightCount ? 5 : 12,
      title: " Spend That Elixir!",
      reason: `You're at ${s.humanElixir}/10 — you're losing regen. Deploy a Wizard to get value.`,
      confidence: 80
    });
  }

  // DEFAULT: Hold and build
  if (suggestions.length === 0) {
    suggestions.push({
      priority: 1,
      action: "wait",
      title: " Build Elixir",
      reason: `Situation is balanced. Save elixir to at least 5. You currently have ${s.humanElixir}.`,
      confidence: 60
    });
  }

  suggestions.sort((a, b) => b.priority - a.priority);
  return suggestions[0];
}

// ---- Reset (call on new game) --------------------------------
function resetTutor() {
  lastSuggestionTick = -999;
  lastRLTick = -999;
  rlResultCache = null;
}

module.exports = { analyzeTick, resetTutor };
