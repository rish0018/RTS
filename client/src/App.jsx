// ============================================================
// App.jsx — Root layout: StatsBar + Arena + Sidebar
// ============================================================

import React, { useState } from "react";
import useSocket from "./useSocket";
import Arena from "./Arena";
import DeployPanel from "./DeployPanel";
import TutorPanel from "./TutorPanel";
import StatsBar from "./StatsBar";
import GameOver from "./GameOver";

export default function App() {
  const {
    connected,
    gameState,
    unitTypes,
    suggestion,
    actionMsg,
    gameOver,
    deployUnit,
    restartGame
  } = useSocket();

  const [selectedCol, setSelectedCol] = useState(null);

  const handleCellClick = (col) => {
    setSelectedCol(col);
  };

  const handleDeploy = (type, col) => {
    deployUnit(type, col);
    setSelectedCol(null);
  };

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      padding: "12px",
      gap: 12,
      background: "var(--bg)",
      overflow: "hidden"
    }}>

      {/* === Header === */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 220 }}>
          <h1 style={{
            fontFamily: "Rajdhani",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 3,
            background: "linear-gradient(90deg, var(--accent), var(--human))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            AI RTS TUTOR
          </h1>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "var(--success)" : "var(--ai-col)",
            boxShadow: `0 0 8px ${connected ? "var(--success)" : "var(--ai-col)"}`,
            flexShrink: 0
          }} />
        </div>

        {/* Stats bar */}
        <div style={{ flex: 1 }}>
          <StatsBar gameState={gameState} />
        </div>
      </div>

      {/* === Main layout: Arena + Sidebar === */}
      <div style={{ display: "flex", gap: 12, flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Arena */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          position: "relative"
        }}>
          {!gameState ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, letterSpacing: 2 }}>
              CONNECTING TO SERVER…
            </div>
          ) : (
            <>
              {/* Lane labels */}
              <LaneLabel text="AI TERRITORY" top="6%" color="rgba(239,68,68,0.5)" />
              <LaneLabel text="YOUR TERRITORY" top="62%" color="rgba(59,130,246,0.5)" />

              <Arena
                gameState={gameState}
                onCellClick={handleCellClick}
              />
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          width: 280,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
          flexShrink: 0
        }}>
          <TutorPanel suggestion={suggestion} />
          <DeployPanel
            unitTypes={unitTypes}
            humanElixir={gameState?.players?.human?.elixir ?? 0}
            selectedCol={selectedCol}
            onDeploy={handleDeploy}
            actionMsg={actionMsg}
          />

          {/* Legend */}
          <Legend />
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <GameOver winner={gameOver} onRestart={restartGame} />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function LaneLabel({ text, top, color }) {
  return (
    <div style={{
      position: "absolute",
      top,
      left: 12,
      fontSize: 10,
      letterSpacing: 3,
      color,
      fontFamily: "Share Tech Mono",
      pointerEvents: "none",
      userSelect: "none"
    }}>
      {text}
    </div>
  );
}

function Legend() {
  const items = [
    { emoji: "🏰", label: "Your King Tower" },
    { emoji: "🗼", label: "Your Side Tower" },
    { emoji: "👑", label: "Enemy King Tower" },
    { emoji: "⚫", label: "Enemy Side Tower" },
    { emoji: "⚔️", label: "Knight (melee)" },
    { emoji: "🏹", label: "Archer (ranged)" },
    { emoji: "🗿", label: "Giant (tank)" },
    { emoji: "🧙", label: "Wizard (area)" },
  ];

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "12px 14px"
    }}>
      <h4 style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>LEGEND</h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
        {items.map(({ emoji, label }) => (
          <div key={label} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ fontSize: 14 }}>{emoji}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
