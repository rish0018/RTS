// ============================================================
// StatsBar.jsx — Top HUD: tick, towers HP, elixir bars
// ============================================================

import React from "react";

export default function StatsBar({ gameState }) {
  if (!gameState) return null;

  const { tick, players } = gameState;
  const human = players?.human;
  const ai    = players?.ai;

  const humanTowerHp = human?.towers?.reduce((s, t) => s + t.hp, 0) ?? 0;
  const aiTowerHp    = ai?.towers?.reduce((s, t) => s + t.hp, 0) ?? 0;
  const maxTowerHp   = 400; // 2×100 + 1×200

  const seconds = ((tick ?? 0) * 0.1).toFixed(1);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "10px 20px",
      gap: 20,
      fontFamily: "Share Tech Mono"
    }}>
      {/* Human side */}
      <PlayerHud
        label="YOU"
        color="var(--human)"
        elixir={human?.elixir ?? 0}
        towerHp={humanTowerHp}
        maxTowerHp={maxTowerHp}
        flip={false}
      />

      {/* Clock */}
      <div style={{ textAlign: "center", minWidth: 90 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 2 }}>TICK</div>
        <div style={{ fontSize: 22, color: "var(--accent)", fontWeight: 700 }}>{tick ?? 0}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{seconds}s</div>
      </div>

      {/* AI side */}
      <PlayerHud
        label="AI ENEMY"
        color="var(--ai-col)"
        elixir={ai?.elixir ?? 0}
        towerHp={aiTowerHp}
        maxTowerHp={maxTowerHp}
        flip={true}
      />
    </div>
  );
}

function PlayerHud({ label, color, elixir, towerHp, maxTowerHp, flip }) {
  const elixirCells = Array.from({ length: 10 });
  const hpPct = towerHp / maxTowerHp;
  const hpColor = hpPct > 0.6 ? "var(--success)" : hpPct > 0.3 ? "var(--warn)" : "var(--ai-col)";

  return (
    <div style={{
      display: "flex",
      flexDirection: flip ? "row-reverse" : "row",
      alignItems: "center",
      gap: 16,
      flex: 1
    }}>
      {/* Label */}
      <div style={{ fontSize: 12, color, letterSpacing: 2, fontWeight: 700, minWidth: 60, textAlign: flip ? "right" : "left" }}>
        {label}
      </div>

      <div style={{ flex: 1 }}>
        {/* Tower HP bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1 }}>TOWERS</span>
          <span style={{ fontSize: 10, color: hpColor }}>{towerHp} HP</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            width: `${Math.max(0, hpPct * 100)}%`,
            height: "100%",
            background: hpColor,
            borderRadius: 4,
            transition: "width 0.3s"
          }} />
        </div>

        {/* Elixir cells */}
        <div style={{ display: "flex", gap: 3, flexDirection: flip ? "row-reverse" : "row" }}>
          {elixirCells.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 3,
                background: i < elixir
                  ? color === "var(--human)" ? "var(--elixir)" : "rgba(239,68,68,0.5)"
                  : "rgba(255,255,255,0.06)",
                transition: "background 0.2s",
                boxShadow: i < elixir ? `0 0 6px ${color === "var(--human)" ? "var(--elixir)" : "rgba(239,68,68,0.5)"}` : "none"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
