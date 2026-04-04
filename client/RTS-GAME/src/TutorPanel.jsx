// ============================================================
// TutorPanel.jsx — AI Tutor suggestion display
// ============================================================

import React, { useEffect, useState } from "react";

export default function TutorPanel({ suggestion }) {
  const [visible, setVisible] = useState(false);
  const [displayedSuggestion, setDisplayedSuggestion] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (suggestion) {
      setDisplayedSuggestion(suggestion);
      setVisible(true);
      setFadeKey(k => k + 1);
    }
  }, [suggestion]);

  if (!displayedSuggestion) {
    return (
      <div style={panelStyle}>
        <Header />
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          🤔 Analysing the battlefield…
        </div>
      </div>
    );
  }

  const { title, reason, confidence, action, unit, lane } = displayedSuggestion;
  const confColor = confidence >= 80 ? "var(--success)" : confidence >= 65 ? "var(--warn)" : "var(--text-muted)";

  return (
    <div style={panelStyle} key={fadeKey}>
      <Header />

      {/* Suggestion card */}
      <div style={{
        background: "var(--surface2)",
        border: "1px solid rgba(0,212,255,0.25)",
        borderRadius: 10,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "fadeSlideIn 0.4s ease-out"
      }}>
        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
          {title}
        </div>

        {/* Reason */}
        <div style={{
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
          fontFamily: "Rajdhani"
        }}>
          {reason}
        </div>

        {/* Details row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {action && (
            <Tag label="Action" value={action.toUpperCase()} color="var(--accent)" />
          )}
          {unit && (
            <Tag label="Unit" value={unit.charAt(0).toUpperCase() + unit.slice(1)} color="var(--human)" />
          )}
          {lane && (
            <Tag label="Lane" value={lane.toUpperCase()} color="var(--accent2)" />
          )}
        </div>

        {/* Confidence bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: 1 }}>CONFIDENCE</span>
            <span style={{ fontSize: 12, color: confColor, fontFamily: "Share Tech Mono", fontWeight: 700 }}>
              {confidence}%
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              width: `${confidence}%`,
              height: "100%",
              background: confColor,
              borderRadius: 4,
              transition: "width 0.6s ease",
              boxShadow: `0 0 8px ${confColor}`
            }} />
          </div>
        </div>
      </div>

      {/* Explainability note */}
      <div style={{
        fontSize: 11,
        color: "var(--text-muted)",
        padding: "8px 10px",
        background: "rgba(0,0,0,0.2)",
        borderRadius: 8,
        lineHeight: 1.5,
        letterSpacing: 0.5
      }}>
        💡 <b>Why this suggestion?</b> The AI analyses enemy positions, elixir levels, tower HP, and lane pressure to rank possible actions.
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--accent)",
        boxShadow: "0 0 8px var(--accent)",
        animation: "ping 1.5s ease-in-out infinite"
      }} />
      <h3 style={{ color: "var(--accent)", fontSize: 13, letterSpacing: 2, fontWeight: 700 }}>
        AI TUTOR
      </h3>
    </div>
  );
}

function Tag({ label, value, color }) {
  return (
    <div style={{
      fontSize: 11,
      background: "rgba(0,0,0,0.3)",
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: "3px 8px",
      display: "flex",
      gap: 4
    }}>
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const panelStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: 12
};
