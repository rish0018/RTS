// ============================================================
// useSocket.js — WebSocket connection hook
// ============================================================

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected]     = useState(false);
  const [gameState, setGameState]     = useState(null);
  const [unitTypes, setUnitTypes]     = useState({});
  const [suggestion, setSuggestion]   = useState(null);
  const [actionMsg, setActionMsg]     = useState(null);
  const [gameOver, setGameOver]       = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Full initial snapshot
    socket.on("INIT_STATE", ({ gameState, unitTypes, latestSuggestion }) => {
      setGameState(gameState);
      setUnitTypes(unitTypes || {});
      if (latestSuggestion) setSuggestion(latestSuggestion);
    });

    // Incremental updates every tick
    socket.on("GAME_UPDATE", (update) => {
      setGameState(prev => prev ? { ...prev, ...update } : update);
      if (update.gameOver) setGameOver(update.winner);
    });

    // Tutor hint
    socket.on("TUTOR_SUGGESTION", (s) => setSuggestion(s));

    // Deploy result feedback
    socket.on("ACTION_RESULT", (res) => {
      setActionMsg(res);
      setTimeout(() => setActionMsg(null), 2500);
    });

    // Game restart
    socket.on("GAME_RESTARTED", (gs) => {
      setGameState(gs);
      setGameOver(null);
      setSuggestion(null);
    });

    return () => socket.disconnect();
  }, []);

  // Actions
  const deployUnit = (type, col) => {
    socketRef.current?.emit("PLAYER_ACTION", { type, col });
  };

  const restartGame = () => {
    socketRef.current?.emit("RESTART_GAME");
  };

  return { connected, gameState, unitTypes, suggestion, actionMsg, gameOver, deployUnit, restartGame };
}
