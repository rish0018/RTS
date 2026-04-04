// ============================================================
// Arena.jsx — Grid + Units + Towers renderer
// ============================================================

import React, { useState } from "react";

const COLS = 18;
const ROWS = 10;
const RIVER_Y = 4;

const CELL_SIZE = 52; // px

export default function Arena({ gameState, onCellClick }) {
  const [hoverCol, setHoverCol] = useState(null);

  if (!gameState) return null;

  const { units = [], players, riverY = RIVER_Y } = gameState;
  const allTowers = [
    ...(players?.human?.towers || []),
    ...(players?.ai?.towers || [])
  ];

  // Build lookup: "x,y" → entity (unit or tower)
  const cellMap = {};

  allTowers.forEach(t => {
    const key = `${t.x},${t.y}`;
    cellMap[key] = cellMap[key] || [];
    cellMap[key].push({ ...t, kind: "tower" });
  });

  units.forEach(u => {
    const key = `${Math.round(u.x)},${Math.round(u.y)}`;
    cellMap[key] = cellMap[key] || [];
    cellMap[key].push({ ...u, kind: "unit" });
  });

  const gridW = COLS * CELL_SIZE;
  const gridH = ROWS * CELL_SIZE;

  return (
    <div style={{ position: "relative", width: gridW, height: gridH, flexShrink: 0 }}>
      {/* Grid cells */}
      {Array.from({ length: ROWS }).map((_, row) =>
        Array.from({ length: COLS }).map((_, col) => {
          const isRiver    = row === riverY;
          const isHuman    = row > riverY;
          const isHovered  = hoverCol === col && isHuman;
          const entities   = cellMap[`${col},${row}`] || [];

          return (
            <div
              key={`${col}-${row}`}
              onClick={() => isHuman && onCellClick(col)}
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              style={{
                position: "absolute",
                left: col * CELL_SIZE,
                top:  row * CELL_SIZE,
                width:  CELL_SIZE,
                height: CELL_SIZE,
                borderRight:  "1px solid var(--grid-line)",
                borderBottom: "1px solid var(--grid-line)",
                background: isRiver
                  ? "var(--river)"
                  : isHuman
                    ? isHovered
                      ? "rgba(59,130,246,0.12)"
                      : "rgba(59,130,246,0.03)"
                    : "rgba(239,68,68,0.03)",
                cursor: isHuman ? "crosshair" : "default",
                transition: "background 0.1s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 2,
                overflow: "hidden"
              }}
            >
              {/* River label */}
              {isRiver && col === 8 && (
                <span style={{ fontSize: 9, color: "var(--accent)", opacity: 0.6, position: "absolute", letterSpacing: 2 }}>
                  ～ RIVER ～
                </span>
              )}

              {/* Entities */}
              {entities.map((e, i) => (
                <EntityToken key={e.id || i} entity={e} />
              ))}
            </div>
          );
        })
      )}

      {/* Column hover indicator */}
      {hoverCol !== null && (
        <div style={{
          position: "absolute",
          left: hoverCol * CELL_SIZE,
          top: 0,
          width: CELL_SIZE,
          height: gridH,
          background: "rgba(0,212,255,0.04)",
          pointerEvents: "none",
          borderLeft: "1px dashed rgba(0,212,255,0.2)",
          borderRight: "1px dashed rgba(0,212,255,0.2)"
        }} />
      )}
    </div>
  );
}

// ---- Single cell entity token ------------------------------

function EntityToken({ entity }) {
  const isHuman  = entity.owner === "human";
  const isTower  = entity.kind === "tower";
  const isKing   = entity.id?.includes("king");
  const hpPct    = entity.hp / entity.maxHp;

  const emoji = isTower
    ? isKing ? (isHuman ? "🏰" : "👑") : (isHuman ? "🗼" : "⚫")
    : entity.emoji || "?";

  const hpColor = hpPct > 0.6 ? "var(--success)" : hpPct > 0.3 ? "var(--warn)" : "var(--ai-col)";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      padding: "1px 2px",
      borderRadius: 4,
      background: isHuman
        ? "rgba(59,130,246,0.18)"
        : "rgba(239,68,68,0.18)",
      border: `1px solid ${isHuman ? "rgba(59,130,246,0.4)" : "rgba(239,68,68,0.4)"}`,
      minWidth: isTower ? 36 : 28,
      animation: entity.kind === "unit" ? "pulse 1.5s ease-in-out infinite" : "none"
    }}>
      <span style={{ fontSize: isTower ? 18 : 14, lineHeight: 1 }}>{emoji}</span>

      {/* HP bar */}
      <div style={{ width: "100%", height: 3, background: "rgba(0,0,0,0.4)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${Math.max(0, hpPct * 100)}%`,
          height: "100%",
          background: hpColor,
          transition: "width 0.3s"
        }} />
      </div>

      {/* HP text for towers */}
      {isTower && (
        <span style={{ fontSize: 7, color: hpColor, fontFamily: "Share Tech Mono" }}>
          {entity.hp}
        </span>
      )}
    </div>
  );
}
