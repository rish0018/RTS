// ============================================================
// useSocket.js — WebSocket connection hook
// ============================================================

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Server URL from environment or default to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") || "http://localhost:3001";

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected]     = useState(false);
  const [gameState, setGameState]     = useState(null);
  const [unitTypes, setUnitTypes]     = useState({});
  const [suggestion, setSuggestion]   = useState(null);
  const [actionMsg, setActionMsg]     = useState(null);
  const [winner, setWinner]           = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("INIT_STATE", ({ gameState, unitTypes, latestSuggestion }) => {
      setGameState(gameState);
      setUnitTypes(unitTypes || {});
      if (latestSuggestion) setSuggestion(latestSuggestion);
    });

    socket.on("GAME_UPDATE", (update) => {
      setGameState(prev => prev ? { ...prev, ...update } : update);
      if (update.gameOver) setWinner(update.winner);
    });

    socket.on("TUTOR_SUGGESTION", (s) => setSuggestion(s));

    socket.on("ACTION_RESULT", (res) => {
      setActionMsg(res);
      const timeoutId = setTimeout(() => setActionMsg(null), 2500);
      return () => clearTimeout(timeoutId);
    });

    socket.on("GAME_RESTARTED", (gs) => {
      setGameState(gs);
      setWinner(null);
      setSuggestion(null);
    });

    return () => socket.disconnect();
  }, []);

  const deployUnit = (type, col) => {
    socketRef.current?.emit("PLAYER_ACTION", { type, col });
  };

  const restartGame = () => {
    socketRef.current?.emit("RESTART_GAME");
  };

  // Expose raw socket for RL dashboard event listeners
  const getSocket = () => socketRef.current;

  return { connected, gameState, unitTypes, suggestion, actionMsg, winner, deployUnit, restartGame, getSocket };
}
