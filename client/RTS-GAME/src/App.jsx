import React, { useState } from "react";
import "./App.css";
import useSocket   from "./useSocket";
import Arena       from "./Arena";
import DeployPanel from "./DeployPanel";
import TutorPanel  from "./TutorPanel";
import StatsBar    from "./StatsBar";
import GameOver    from "./GameOver";

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
      </div>

      {/* ── MAIN: arena | sidebar ────────────────────────────── */}
      <div className="main">

        {/* ARENA */}
        <div className="arena-box">
          {gameState ? (
            <>
              <Arena
                gameState={gameState}
                onCellClick={handleCellClick}
              />
              <div
                className="lane-label"
                style={{ top: "6%", color: "rgba(239,68,68,0.55)" }}
              >
                AI TERRITORY
              </div>
              <div
                className="lane-label"
                style={{ top: "62%", color: "rgba(59,130,246,0.55)" }}
              >
                YOUR TERRITORY
              </div>
            </>
          ) : (
            <div style={{
              color:         "var(--text-muted)",
              fontSize:      13,
              letterSpacing: 3,
              fontFamily:    "Share Tech Mono"
            }}>
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

      {/* GAME OVER OVERLAY */}
      {gameOver && <GameOver winner={gameOver} onRestart={restartGame} />}
    </div>
  );
}
