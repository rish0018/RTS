# Remaining Issues - Quick Fix Guide

This document provides code snippets for the remaining medium/low priority issues identified in the audit.

---

## MEDIUM PRIORITY FIXES

### Issue #1: Request Body Validation (index.js:71)

**File**: `server/index.js`
**Current**:
```javascript
const sims = Math.min(req.body?.simulations ?? 1000, 5000);
```

**Fix**:
```javascript
const sims = Math.min(
  Math.max(1, req.body?.simulations ?? 1000),  // Ensure at least 1
  5000  // Cap at 5000
);
```

---

### Issue #3: Early Exit Wastes Training (offlineTrainer.js:126)

**File**: `server/rl/offlineTrainer.js`
**Current**:
```javascript
for (let stateIdx = 0; stateIdx < statesPerRound && done < totalSims; stateIdx++) {
  const baseState = generateDiverseState(stateIdx);
  if (baseState.gameOver) continue;  // ← Skips but counter still increments
  // ... training code
}
```

**Fix**:
```javascript
let validStates = 0;
for (let stateIdx = 0; validStates < statesPerRound && done < totalSims; stateIdx++) {
  const baseState = generateDiverseState(stateIdx);
  if (baseState.gameOver) continue;
  validStates++;  // ← Only count valid states
  // ... training code
}
```

---

### Issue #4: Silent DB Load Failures (rlDatabase.js:30)

**File**: `server/rl/rlDatabase.js`
**Current**:
```javascript
} catch (e) {
  console.error("⚠️  RL DB load error:", e.message);
  qTable = {};
  trainingLog = [];
}
```

**Fix**:
```javascript
} catch (e) {
  console.error("🚨 CRITICAL: RL DB load error:", e.message);
  console.error("Stack:", e.stack);
  // Optionally: emit event or throw for critical errors
  if (e.code === 'EACCES') {
    throw new Error("Permission denied accessing RL database files");
  }
  // Otherwise continue with empty tables
  qTable = {};
  trainingLog = [];
  meta = {
    totalSimulations: 0,
    totalSessions: 0,
    lastTrainingAt: null,
    improvedEntries: 0,
    coverageSize: 0,
    avgRewardHistory: []
  };
}
```

---

### Issue #5: SimCount Validation Missing (RLDashboard.jsx)

**File**: `client/RTS-GAME/src/RLDashboard.jsx`
**Current**:
```javascript
const handleRunTraining = async () => {
  if (training) return;
  setTraining(true);
  // ... no validation on simCount
};
```

**Fix**:
```javascript
const handleRunTraining = async () => {
  if (training) return;
  
  // Validate simCount
  if (!simCount || simCount < 1 || simCount > 50000) {
    setConnectionError("Invalid simulation count. Use 1-50,000.");
    return;
  }
  
  setTraining(true);
  setProgress({ done: 0, total: simCount, pct: 0 });
  try {
    const r = await fetch(`${SERVER}/run-training`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulations: Math.floor(simCount) })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    setConnectionError(null);
  } catch (e) {
    setConnectionError(`Training failed: ${e.message}`);
    setTraining(false);
  }
};
```

---

### Issue #6: Silent Fetch Errors (RLDashboard.jsx:20)

**File**: `client/RTS-GAME/src/RLDashboard.jsx`
**Current**:
```javascript
const fetchStats = async () => {
  try {
    const r = await fetch(`${SERVER}/rl-stats`);
    const d = await r.json();
    setMeta(d);
    setLog(d.trainingLog || []);
  } catch (e) { /* server not up yet */ }
};
```

**Fix**:
```javascript
const fetchStats = async () => {
  try {
    const r = await fetch(`${SERVER}/rl-stats`);
    if (!r.ok) throw new Error(`Server returned ${r.status}`);
    const d = await r.json();
    setMeta(d);
    setLog(d.trainingLog || []);
    setConnectionError(null);  // Clear error on success
  } catch (e) {
    console.warn("RL stats fetch failed:", e.message);
    setConnectionError(`Connection failed: ${e.message}`);
    // Retry after 5 seconds
    setTimeout(fetchStats, 5000);
  }
};
```

---

## LOW PRIORITY IMPROVEMENTS

### Issue #9: Extract Magic Numbers to Constants (tutor.js)

**File**: `server/tutor/tutor.js`

**Add at top**:
```javascript
const LANE_BOUNDARIES = {
  LEFT: 7,
  CENTER_START: 6,
  CENTER_END: 12,
  RIGHT: 10
};

const THREAT_THRESHOLDS = {
  CLOSE_THREAT: 4,  // Distance to towers
  MEDIUM_THREAT: 8,
  FAR: 999
};

const ELIXIR_EFFICIENCY_THRESHOLD = 8;  // Warn if >= 8
```

**Use instead of hardcoded values**:
```javascript
// Before:
if (col < 7) laneCount.left++;

// After:
if (col < LANE_BOUNDARIES.LEFT) laneCount.left++;
```

---

### Issue #10: Remove Dead Code (offlineTrainer.js:23)

**File**: `server/rl/offlineTrainer.js`

**Current**:
```javascript
const hpBand = (towers, owner) =>  // ← 'owner' parameter unused
  towers.reduce((s, t) => s + t.hp, 0);
```

**Fix**:
```javascript
const hpBand = (towers) =>  // ← Remove unused parameter
  towers.reduce((s, t) => s + t.hp, 0);
```

---

### Issue #11: Consolidate RIVER_Y Definition (Arena.jsx)

**File**: `client/RTS-GAME/src/Arena.jsx`

**Current**:
```javascript
const RIVER_Y = 4;  // Local duplicate
const { units = [], players, riverY = RIVER_Y } = gameState;
```

**Fix** (use only gameState source):
```javascript
// Remove local constant
const { units = [], players, riverY } = gameState;
// Also update code to not use hardcoded 4
```

---

### Issue #12: Optimize Tower Filtering (gameState.js:172)

**File**: `server/game/gameState.js`

**Current**:
```javascript
// Don two separate filter loops
state.units = state.units.filter(u => u.hp > 0);
["human", "ai"].forEach(owner => {
  state.players[owner].towers = state.players[owner].towers.filter(t => t.hp > 0);
});
```

**Fix** (consolidate with event logging):
```javascript
// Do in one optimized pass
state.units = state.units.filter(u => {
  if (u.hp <= 0) {
    logEvent(state, { type: "unit_killed", id: u.id, owner: u.owner, tick: state.tick });
    if (state.stats) state.stats[u.owner === "human" ? "ai" : "human"].unitsDeployed++; // Adjust as needed
  }
  return u.hp > 0;
});

["human", "ai"].forEach(owner => {
  const before = state.players[owner].towers.length;
  state.players[owner].towers = state.players[owner].towers.filter(t => {
    if (t.hp <= 0) {
      logEvent(state, { type: "tower_destroyed", id: t.id, owner, tick: state.tick });
    }
    return t.hp > 0;
  });
});
```

---

## Performance Optimizations

### TutorPanel: Avoid Key-Based Remounting

**File**: `client/RTS-GAME/src/TutorPanel.jsx`

**Current** (inefficient):
```javascript
const [fadeKey, setFadeKey] = useState(0);
useEffect(() => {
  if (suggestion) {
    setFadeKey(k => k + 1);  // Causes full remount
  }
}, [suggestion]);

return <div key={fadeKey} style={{ animation: "fadeSlideIn 0.4s" }}>
```

**Better**:
```javascript
// Remove key-based approach, use CSS transitions directly
return (
  <div 
    style={{
      animation: suggestion ? "fadeSlideIn 0.4s ease-out" : "none",
      key: suggestion?.title,  // React can use title as key instead
      transition: "opacity 0.3s ease-out"
    }}
  >
```

---

## Testing Checklist for Remaining Fixes

After implementing the remaining fixes, test:

- [ ] Start game with 0 simulations → should show validation error
- [ ] Start game with 100,000 simulations → should cap at 50,000
- [ ] Disconnect backend → RLDashboard shows connection error
- [ ] Run training → all states are counted equally
- [ ] Training with 5000 sims → completes without timeout
- [ ] Restart game multiple times → no ID overflow
- [ ] Check database files exist → no "silent load" issues

---

## Summary

✅ **APPLIED STABILITY FIXES:**
- Issue #2: Math.min guard on empty array (tutor.js)
- Issue #7: Socket.IO & Server error handlers (index.js)
- Issue #8: Improved bounds checking & movement fallbacks (gameState.js)

**Remaining Work**: ~1.5-2 hours for all remaining fixes  
**Complexity**: Low to Medium  
**Risk**: Very Low (mostly validation and optimization code)  
**Priority**: Medium (quality improvements, not critical functionality)

All remaining fixes are isolated and can be applied independently without conflicts.
