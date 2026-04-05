import React from "react";

export default function StatsBar({ gameState }) {
  if (!gameState) return null;

  const { tick, players } = gameState;
  const human = players?.human;
  const ai    = players?.ai;

  const humanTowerHp = human?.towers?.reduce((s, t) => s + t.hp, 0) ?? 0;
  const aiTowerHp    = ai?.towers?.reduce((s, t)    => s + t.hp, 0) ?? 0;
  
  // Calculate maxTowerHp dynamically from initial tower values
  const maxTowerHp = (human?.towers?.reduce((s, t) => s + (t.maxHp ?? 0), 0) ?? 0);
  const maxTowerHp_Normalized = Math.max(maxTowerHp, 400); // Fallback to 400 if not available

  const seconds = ((tick ?? 0) * 0.1).toFixed(1);

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            16,
      flex:           1,
      minWidth:       0,
      fontFamily:     "Share Tech Mono, monospace"
    }}>
      {/* YOU */}
      <PlayerHud
        label="YOU"
        color="var(--human)"
        elixir={human?.elixir ?? 0}
        towerHp={humanTowerHp}
        maxTowerHp={maxTowerHp_Normalized}
        flip={false}
      />

      {/* CLOCK */}
      <div style={{ textAlign: "center", flexShrink: 0, minWidth: 70 }}>
        <div style={{ fontSize: 9,  color: "var(--text-muted)", letterSpacing: 2 }}>TICK</div>
        <div style={{ fontSize: 20, color: "var(--accent)", fontWeight: 700, lineHeight: 1 }}>{tick ?? 0}</div>
        <div style={{ fontSize: 9,  color: "var(--text-muted)" }}>{seconds}s</div>
      </div>

      {/* AI ENEMY */}
      <PlayerHud
        label="AI ENEMY"
        color="var(--ai-col)"
        elixir={ai?.elixir ?? 0}
        towerHp={aiTowerHp}
        maxTowerHp={maxTowerHp_Normalized}
        flip={true}
      />
    </div>
  );
}

function PlayerHud({ label, color, elixir, towerHp, maxTowerHp, flip }) {
  const cells  = Array.from({ length: 10 });
  const hpPct  = towerHp / maxTowerHp;
  const hpColor =
    hpPct > 0.6 ? "var(--success)" :
    hpPct > 0.3 ? "var(--warn)"    :
    "var(--ai-col)";

  const isHumanSide = color === "var(--human)";

  return (
    <div style={{
      display:       "flex",
      flexDirection: flip ? "row-reverse" : "row",
      alignItems:    "center",
      gap:           12,
      flex:          1,
      minWidth:      0
    }}>
      {/* Label */}
      <div style={{
        fontSize:   11,
        color,
        letterSpacing: 2,
        fontWeight: 700,
        flexShrink: 0,
        minWidth:   56,
        textAlign:  flip ? "right" : "left"
      }}>
        {label}
      </div>

      {/* Bars */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tower HP row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>TOWERS</span>
          <span style={{ fontSize: 9, color: hpColor }}>{towerHp} HP</span>
        </div>
        <div style={{
          height:       5,
          background:   "rgba(255,255,255,0.06)",
          borderRadius: 3,
          overflow:     "hidden",
          marginBottom: 6
        }}>
          <div style={{
            width:        `${Math.max(0, hpPct * 100)}%`,
            height:       "100%",
            background:   hpColor,
            borderRadius: 3,
            transition:   "width 0.3s"
          }} />
        </div>

        {/* Elixir cells */}
        <div style={{
          display:       "flex",
          gap:           2,
          flexDirection: flip ? "row-reverse" : "row"
        }}>
          {cells.map((_, i) => {
            const filled = i < elixir;
            return (
              <div key={i} style={{
                flex:         1,
                height:       8,
                borderRadius: 2,
                background:   filled
                  ? isHumanSide ? "var(--elixir)" : "rgba(239,68,68,0.55)"
                  : "rgba(255,255,255,0.06)",
                transition:   "background 0.2s",
                boxShadow:    filled
                  ? `0 0 5px ${isHumanSide ? "var(--elixir)" : "rgba(239,68,68,0.6)"}`
                  : "none"
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
