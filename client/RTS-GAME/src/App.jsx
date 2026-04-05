import React, { useState } from "react";
import "./App.css";
import useSocket   from "./useSocket";
import Arena       from "./Arena";
import DeployPanel from "./DeployPanel";
import TutorPanel  from "./TutorPanel";
import StatsBar    from "./StatsBar";
import GameOver    from "./GameOver";
import RLDashboard from "./RLDashboard";

export default function App() {
  const {
    connected,
    gameState,
    unitTypes,
    suggestion,
    actionMsg,
    winner,
    deployUnit,
    restartGame,
    getSocket
  } = useSocket();

  const [selectedCol, setSelectedCol] = useState(null);
  const [showRL, setShowRL]           = useState(false);

  const handleCellClick = (col) => setSelectedCol(col);

  const handleDeploy = (type, col) => {
    deployUnit(type, col);
    setSelectedCol(null);
  };

  return (
    <div className="app-root">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="header">
        <div className="title">
          AI RTS TUTOR
          <span className={`dot ${connected ? "on" : ""}`} />
        </div>
        <StatsBar gameState={gameState} />
        <button
          onClick={() => setShowRL(v => !v)}
          style={{
            background: showRL ? "rgba(34,211,238,0.15)" : "transparent",
            border: `1px solid ${showRL ? "#22d3ee" : "#333"}`,
            color: showRL ? "#22d3ee" : "#666",
            padding: "4px 12px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, letterSpacing: 1.5, fontFamily: "Share Tech Mono, monospace",
            textTransform: "uppercase", whiteSpace: "nowrap"
          }}
        >
          🧠 RL Center
        </button>
      </div>

      {/* ── MAIN: arena | sidebar ────────────────────────────── */}
      <div className="main">

        {/* ARENA */}
        <div className="arena-box">
          {gameState ? (
            <>
              <Arena gameState={gameState} onCellClick={handleCellClick} />
              <div className="lane-label" style={{ top: "6%", color: "rgba(239,68,68,0.55)" }}>
                AI TERRITORY
              </div>
              <div className="lane-label" style={{ top: "62%", color: "rgba(59,130,246,0.55)" }}>
                YOUR TERRITORY
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13, letterSpacing: 3, fontFamily: "Share Tech Mono" }}>
              CONNECTING…
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="side">
          <TutorPanel suggestion={suggestion} />
          <DeployPanel
            unitTypes={unitTypes}
            humanElixir={gameState?.players?.human?.elixir ?? 0}
            selectedCol={selectedCol}
            onDeploy={handleDeploy}
            actionMsg={actionMsg}
          />
        </div>

      </div>

      {/* RL DASHBOARD OVERLAY */}
      {showRL && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(5,8,18,0.98)",
          borderTop: "1px solid rgba(34,211,238,0.2)",
          padding: "16px 24px",
          zIndex: 100,
          maxHeight: "50vh",
          overflowY: "auto"
        }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <RLDashboard socket={getSocket()} />
          </div>
          <button
            onClick={() => setShowRL(false)}
            style={{
              position: "absolute", top: 12, right: 20,
              background: "transparent", border: "1px solid #333",
              color: "#666", padding: "2px 8px", borderRadius: 4,
              cursor: "pointer", fontSize: 11
            }}
          >✕ Close</button>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {winner && <GameOver winner={winner} onRestart={restartGame} />}
    </div>
  );
}
