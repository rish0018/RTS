import React, { useState } from "react";

const COLS   = 18;
const ROWS   = 10;
const RIVER_Y = 4;

// ── Dynamic cell size: fills the available arena space ────
// We compute this at render time from the container, but as a
// safe static default we use 46px so 18×46=828 and 10×46=460,
// which comfortably fits a 1080p screen minus the header + sidebar.
const CELL_SIZE = 46;

export default function Arena({ gameState, onCellClick }) {
  const [hoverCol, setHoverCol] = useState(null);

  if (!gameState) return null;

  const { units = [], players, riverY = RIVER_Y } = gameState;

  const allTowers = [
    ...(players?.human?.towers || []),
    ...(players?.ai?.towers   || [])
  ];

  // ── Build cell-map: "x,y" → list of entities ──────────────
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
    <div
      className="arena-glow"
      style={{
        width:     gridW,
        height:    gridH,
        position:  "relative",
        flexShrink: 0,
        borderRadius: 10,
        overflow: "hidden"
      }}
    >
      {/* ── Grid cells ──────────────────────────────────────── */}
      {Array.from({ length: ROWS }).map((_, row) =>
        Array.from({ length: COLS }).map((_, col) => {
          const isRiver   = row === riverY;
          const isHuman   = row > riverY;
          const isHovered = hoverCol === col && isHuman;
          const entities  = cellMap[`${col},${row}`] || [];

          return (
            <div
              key={`${col}-${row}`}
              onClick={() => isHuman && onCellClick(col)}
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              className={isHovered ? "cell-hover" : ""}
              style={{
                position:     "absolute",
                left:         col * CELL_SIZE,
                top:          row * CELL_SIZE,
                width:        CELL_SIZE,
                height:       CELL_SIZE,
                borderRight:  "1px solid var(--grid-line)",
                borderBottom: "1px solid var(--grid-line)",
                background: isRiver
                  ? "var(--river)"
                  : isHuman
                    ? "rgba(59,130,246,0.04)"
                    : "rgba(239,68,68,0.04)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexWrap:       "wrap",
                gap:            2,
                cursor: isHuman ? "crosshair" : "default",
                transition:     "background 0.1s"
              }}
            >
              {/* River label */}
              {isRiver && col === 8 && (
                <span style={{
                  fontSize:    8,
                  color:       "var(--accent)",
                  opacity:     0.55,
                  letterSpacing: 2,
                  pointerEvents: "none",
                  userSelect:  "none"
                }}>
                  ~RIVER~
                </span>
              )}

              {/* Deploy preview on hover */}
              {isHuman && isHovered && entities.length === 0 && (
                <div className="deploy-preview">⚔️</div>
              )}

              {/* Entities */}
              {entities.map((e, i) => (
                <EntityToken key={e.id || i} entity={e} />
              ))}
            </div>
          );
        })
      )}

      {/* ── Column hover highlight ───────────────────────────── */}
      {hoverCol !== null && (
        <div style={{
          position:       "absolute",
          left:           hoverCol * CELL_SIZE,
          top:            0,
          width:          CELL_SIZE,
          height:         gridH,
          background:     "rgba(0,212,255,0.05)",
          pointerEvents:  "none",
          borderLeft:     "1px dashed rgba(0,212,255,0.18)",
          borderRight:    "1px dashed rgba(0,212,255,0.18)"
        }} />
      )}
    </div>
  );
}

// ── Single entity token ────────────────────────────────────
function EntityToken({ entity }) {
  const isHuman = entity.owner === "human";
  const isTower = entity.kind  === "tower";
  const isKing  = entity.id?.includes("king");

  const hpPct = entity.hp / entity.maxHp;

  // HP bar colour
  const hpColor = hpPct > 0.6 ? "#22c55e" : hpPct > 0.3 ? "#f59e0b" : "#ef4444";

  const emoji = isTower
    ? isKing
      ? isHuman ? "🏰" : "👑"
      : isHuman ? "🗼" : "⚫"
    : entity.emoji || "⚔️";

  return (
    <div className={`entity ${isHuman ? "human" : "enemy"} ${isTower ? "tower" : "unit"}`}>
      <span className="emoji">{emoji}</span>

      {/* HP bar */}
      <div className="hp-bar">
        <div
          className="hp-fill"
          style={{
            width:      `${Math.max(0, hpPct * 100)}%`,
            background: hpColor
          }}
        />
      </div>

      {/* HP number — towers only */}
      {isTower && (
        <span style={{ fontSize: 7, color: hpColor, fontFamily: "Share Tech Mono" }}>
          {entity.hp}
        </span>
      )}
    </div>
  );
}
