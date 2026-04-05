// ============================================================
// RLDashboard.jsx — Real-time RL Training Metrics + Log Panel
// Shows Q-table growth, reward improvement, session log,
// and a "Run Training" trigger button.
// ============================================================

import React, { useState, useEffect, useRef } from "react";

// Server URL from environment or default to localhost
const SERVER = import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") || "http://localhost:3001";

export default function RLDashboard({ socket }) {
  const [meta, setMeta]           = useState(null);
  const [log, setLog]             = useState([]);
  const [training, setTraining]   = useState(false);
  const [progress, setProgress]   = useState(null);
  const [lastComplete, setLastComplete] = useState(null);
  const [simCount, setSimCount]   = useState(1000);
  const [tab, setTab]             = useState("metrics"); // "metrics" | "log"
  const logRef = useRef(null);

  // Fetch initial RL stats
  const fetchStats = async () => {
    try {
      const r = await fetch(`${SERVER}/rl-stats`);
      const d = await r.json();
      setMeta(d);
      setLog(d.trainingLog || []);
    } catch (e) { /* server not up yet */ }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to socket events for live training progress
  useEffect(() => {
    if (!socket) return;

    socket.on("RL_TRAINING_PROGRESS", (data) => {
      setTraining(true);
      setProgress(data);
    });

    socket.on("RL_TRAINING_COMPLETE", (summary) => {
      setTraining(false);
      setProgress(null);
      setLastComplete(summary);
      fetchStats();
    });

    return () => {
      socket.off("RL_TRAINING_PROGRESS");
      socket.off("RL_TRAINING_COMPLETE");
    };
  }, [socket]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const handleRunTraining = async () => {
    if (training) return;
    setTraining(true);
    setProgress({ done: 0, total: simCount, pct: 0 });
    try {
      await fetch(`${SERVER}/run-training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulations: simCount })
      });
    } catch (e) {
      setTraining(false);
    }
  };

  // Sparkline from reward history
  const RewardSparkline = ({ history }) => {
    if (!history || history.length < 2) return <span style={{ color: "#555", fontSize: 11 }}>No data yet</span>;
    const vals = history.map(h => h.avgReward);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const range = max - min || 1;
    const W = 160, H = 36, pad = 2;

    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const trend = vals[vals.length - 1] - vals[0];
    const color = trend >= 0 ? "#22d3ee" : "#f87171";

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width={W} height={H} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 4 }}>
          <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
        <span style={{ color, fontSize: 11 }}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}
        </span>
      </div>
    );
  };

  const StatCard = ({ label, value, sub, color = "#22d3ee" }) => (
    <div style={{
      background: "rgba(0,0,0,0.35)", border: `1px solid rgba(${color === "#22d3ee" ? "34,211,238" : "251,191,36"},0.2)`,
      borderRadius: 6, padding: "8px 12px", flex: 1, minWidth: 80
    }}>
      <div style={{ color: "#aaa", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 700, fontFamily: "Share Tech Mono, monospace" }}>{value ?? "—"}</div>
      {sub && <div style={{ color: "#666", fontSize: 9, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{
      background: "rgba(10,14,26,0.97)",
      border: "1px solid rgba(34,211,238,0.15)",
      borderRadius: 8,
      padding: 14,
      fontFamily: "Share Tech Mono, monospace",
      color: "#ccc",
      fontSize: 11
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ color: "#22d3ee", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>
          RL TRAINING CENTER
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["metrics", "log"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(34,211,238,0.15)" : "transparent",
              border: `1px solid ${tab === t ? "#22d3ee" : "#333"}`,
              color: tab === t ? "#22d3ee" : "#666",
              padding: "2px 8px", borderRadius: 4, cursor: "pointer",
              fontSize: 10, letterSpacing: 1, textTransform: "uppercase"
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* TAB: METRICS */}
      {tab === "metrics" && (
        <>
          {/* Stat Cards */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <StatCard label="Q-Table Entries" value={meta?.coverageSize ?? "—"} sub="state-action pairs" />
            <StatCard label="Total Sims" value={meta?.totalSimulations ?? "—"} sub="lifetime" color="#fbbf24" />
            <StatCard label="Sessions" value={meta?.totalSessions ?? "—"} sub="training runs" />
          </div>

          {/* Reward sparkline */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#666", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>AVG REWARD TREND</div>
            <RewardSparkline history={meta?.avgRewardHistory || []} />
          </div>

          {/* Last training */}
          {meta?.lastTrainingAt && (
            <div style={{ color: "#555", fontSize: 9, marginBottom: 10 }}>
              Last trained: {new Date(meta.lastTrainingAt).toLocaleString()}
            </div>
          )}

          {/* Last complete summary */}
          {lastComplete && !lastComplete.error && (
            <div style={{
              background: "rgba(34,211,238,0.07)",
              border: "1px solid rgba(34,211,238,0.2)",
              borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 10
            }}>
              <div style={{ color: "#22d3ee", marginBottom: 4 }}>✅ Last Training Complete</div>
              <div>Sims: <b style={{ color: "#fff" }}>{lastComplete.simulations}</b> &nbsp;|&nbsp;
                   Avg reward: <b style={{ color: "#22d3ee" }}>{lastComplete.avgReward?.toFixed(1)}</b> &nbsp;|&nbsp;
                   Elapsed: <b style={{ color: "#fff" }}>{lastComplete.elapsedSeconds}s</b></div>
              {lastComplete.topActions?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ color: "#666", marginBottom: 2 }}>Top actions:</div>
                  {lastComplete.topActions.map((a, i) => (
                    <div key={i} style={{ color: "#aaa" }}>
                      {i + 1}. {a.action} → reward <span style={{ color: "#22d3ee" }}>{a.reward}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Training controls */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#666", fontSize: 10 }}>Sims:</span>
              {[500, 1000, 2000].map(n => (
                <button key={n} onClick={() => setSimCount(n)} style={{
                  background: simCount === n ? "rgba(34,211,238,0.15)" : "transparent",
                  border: `1px solid ${simCount === n ? "#22d3ee" : "#333"}`,
                  color: simCount === n ? "#22d3ee" : "#555",
                  padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10
                }}>{n}</button>
              ))}
            </div>
            <button
              onClick={handleRunTraining}
              disabled={training}
              style={{
                background: training ? "rgba(251,191,36,0.1)" : "rgba(34,211,238,0.15)",
                border: `1px solid ${training ? "#fbbf24" : "#22d3ee"}`,
                color: training ? "#fbbf24" : "#22d3ee",
                padding: "4px 12px", borderRadius: 4,
                cursor: training ? "not-allowed" : "pointer",
                fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                transition: "all 0.2s"
              }}
            >
              {training ? "⏳ Training..." : "🎓 Run Training"}
            </button>
          </div>

          {/* Progress bar */}
          {training && progress && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 9, color: "#666" }}>
                <span>{progress.done} / {progress.total} sims</span>
                <span>{progress.pct}%</span>
              </div>
              <div style={{ background: "#111", borderRadius: 3, height: 4 }}>
                <div style={{
                  width: `${progress.pct}%`, height: "100%",
                  background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                  borderRadius: 3, transition: "width 0.3s"
                }} />
              </div>
              {progress.latest && (
                <div style={{ color: "#555", fontSize: 9, marginTop: 3 }}>
                  Latest: {progress.latest.action} (state {progress.latest.stateHash?.slice(0,16)}…) → {progress.latest.avgReward}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB: LOG */}
      {tab === "log" && (
        <div ref={logRef} style={{
          maxHeight: 280, overflowY: "auto",
          background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 8
        }}>
          {log.length === 0 && (
            <div style={{ color: "#444", textAlign: "center", paddingTop: 20 }}>
              No training sessions yet. Run training to populate the log.
            </div>
          )}
          {[...log].reverse().map((session, i) => (
            <div key={i} style={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              paddingBottom: 8, marginBottom: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "#22d3ee", fontSize: 10 }}>
                  Session #{session.sessionId?.split("_").pop()}
                </span>
                <span style={{ color: "#555", fontSize: 9 }}>
                  {new Date(session.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>Sims: <b style={{ color: "#fff" }}>{session.simulations}</b></span>
                <span>Avg Reward: <b style={{ color: session.avgReward >= 0 ? "#22d3ee" : "#f87171" }}>{session.avgReward?.toFixed(1)}</b></span>
                <span>DB: <b style={{ color: "#fbbf24" }}>{session.dbSize}</b> entries</span>
                <span>Time: <b style={{ color: "#fff" }}>{session.elapsedSeconds}s</b></span>
              </div>
              {session.topActions?.length > 0 && (
                <div style={{ marginTop: 4, color: "#666", fontSize: 9 }}>
                  Best: {session.topActions[0]?.action} → {session.topActions[0]?.reward}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
