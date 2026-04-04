// ============================================================
// DeployPanel.jsx — Unit selector + deployment
// ============================================================

import React, { useState } from "react";

const UNIT_ORDER = ["knight", "archer", "giant", "wizard"];

export default function DeployPanel({ unitTypes, humanElixir, selectedCol, onDeploy, actionMsg }) {
  const [selected, setSelected] = useState("knight");

  const handleDeploy = () => {
    if (selectedCol === null) return;
    onDeploy(selected, selectedCol);
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ color: "var(--accent)", fontSize: 13, letterSpacing: 2, fontWeight: 700 }}>
          DEPLOY UNIT
        </h3>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(168,85,247,0.12)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 8,
          padding: "4px 10px"
        }}>
          <span style={{ fontSize: 14 }}>💎</span>
          <span style={{ color: "var(--elixir)", fontFamily: "Share Tech Mono", fontSize: 16, fontWeight: 700 }}>
            {humanElixir ?? "--"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>/ 10</span>
        </div>
      </div>

      {/* Unit Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {UNIT_ORDER.map(type => {
          const info  = unitTypes[type];
          if (!info) return null;
          const affordable = humanElixir >= info.elixirCost;
          const isSelected = selected === type;

          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              style={{
                background: isSelected
                  ? "rgba(0,212,255,0.15)"
                  : affordable
                    ? "var(--surface2)"
                    : "rgba(0,0,0,0.2)",
                border: `2px solid ${isSelected ? "var(--accent)" : affordable ? "var(--border)" : "rgba(100,116,139,0.3)"}`,
                borderRadius: 10,
                padding: "10px 8px",
                cursor: affordable ? "pointer" : "not-allowed",
                opacity: affordable ? 1 : 0.45,
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: "var(--text)"
              }}
            >
              <span style={{ fontSize: 22 }}>{info.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{info.name}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                <Stat label="HP"  value={info.hp} />
                <Stat label="DMG" value={info.damage} />
                <Stat label="RNG" value={info.range} />
              </div>
              <div style={{
                marginTop: 2,
                background: "rgba(168,85,247,0.2)",
                borderRadius: 5,
                padding: "2px 8px",
                fontSize: 12,
                color: "var(--elixir)",
                fontFamily: "Share Tech Mono",
                fontWeight: 700
              }}>
                💎 {info.elixirCost}
              </div>
            </button>
          );
        })}
      </div>

      {/* Column info */}
      <div style={{
        padding: "8px 12px",
        background: "var(--surface2)",
        borderRadius: 8,
        fontSize: 13,
        color: selectedCol !== null ? "var(--text)" : "var(--text-muted)",
        border: "1px solid var(--border)"
      }}>
        {selectedCol !== null
          ? `📍 Column ${selectedCol} selected — click Deploy`
          : "👆 Click a cell in YOUR half to pick a column"}
      </div>

      {/* Deploy button */}
      <button
        onClick={handleDeploy}
        disabled={selectedCol === null || humanElixir < (unitTypes[selected]?.elixirCost ?? 99)}
        style={{
          background: selectedCol !== null ? "linear-gradient(135deg, var(--human), #1d4ed8)" : "var(--surface2)",
          border: "none",
          borderRadius: 10,
          padding: "12px",
          color: "white",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "Rajdhani",
          letterSpacing: 2,
          cursor: selectedCol !== null ? "pointer" : "not-allowed",
          opacity: selectedCol !== null ? 1 : 0.5,
          transition: "all 0.2s",
          boxShadow: selectedCol !== null ? "0 4px 20px rgba(59,130,246,0.3)" : "none"
        }}
      >
        ⚔️ DEPLOY {selected?.toUpperCase()}
      </button>

      {/* Action feedback */}
      {actionMsg && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: actionMsg.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${actionMsg.success ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: actionMsg.success ? "var(--success)" : "var(--ai-col)",
          fontSize: 13,
          fontWeight: 600
        }}>
          {actionMsg.success ? `✅ ${actionMsg.unit?.name} deployed!` : `❌ ${actionMsg.reason}`}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span style={{
      fontSize: 10,
      background: "rgba(255,255,255,0.05)",
      borderRadius: 4,
      padding: "1px 5px",
      color: "var(--text-muted)"
    }}>
      {label} <b style={{ color: "var(--text)" }}>{value}</b>
    </span>
  );
}
