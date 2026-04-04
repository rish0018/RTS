// ============================================================
// GameOver.jsx — Win/Loss overlay
// ============================================================

import React from "react";

export default function GameOver({ winner, onRestart }) {
  const won = winner === "human";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(10,14,26,0.88)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      backdropFilter: "blur(8px)"
    }}>
      <div style={{
        background: "var(--surface)",
        border: `2px solid ${won ? "var(--success)" : "var(--ai-col)"}`,
        borderRadius: 20,
        padding: "48px 64px",
        textAlign: "center",
        boxShadow: `0 0 60px ${won ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        animation: "fadeSlideIn 0.5s ease-out"
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {won ? "🏆" : "💀"}
        </div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: 4,
          color: won ? "var(--success)" : "var(--ai-col)",
          marginBottom: 8
        }}>
          {won ? "VICTORY!" : "DEFEATED"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 32, letterSpacing: 1 }}>
          {won
            ? "You destroyed the enemy King Tower! Well played."
            : "The AI destroyed your King Tower. Better luck next time!"}
        </p>
        <button
          onClick={onRestart}
          style={{
            background: "linear-gradient(135deg, var(--accent), #0084ff)",
            border: "none",
            borderRadius: 12,
            padding: "14px 40px",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Rajdhani",
            letterSpacing: 3,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,212,255,0.4)"
          }}
        >
          ↺ PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
