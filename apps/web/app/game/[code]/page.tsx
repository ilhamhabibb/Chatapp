"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GameState, PublicUser } from "@chating/contracts";
import { GAME_NAMESPACE } from "@chating/contracts";
import { apiFetch } from "../../../lib/api";
import { createRealtimeSocket } from "../../../lib/socket";
import { GameCanvas } from "../../../features/game/game-canvas";

type CurrentUser = PublicUser & { email: string; emailVerified: boolean };

type SocketResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export default function GameRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const code = String(params.code).toUpperCase();

  useEffect(() => {
    let active = true;
    void apiFetch<CurrentUser>("/api/auth/me").then((value) => {
      if (active) setUser(value);
    }).catch(() => router.replace("/login"));
    void apiFetch<GameState>(`/api/game/rooms/${code}`).then((value) => {
      if (active) setState(value);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Room gagal dimuat");
    });
    return () => {
      active = false;
    };
  }, [code, router]);

  useEffect(() => {
    if (!user) return;
    const socket = createRealtimeSocket(GAME_NAMESPACE);
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("game.room.join", { code }, (result: SocketResult<GameState>) => {
        if (result.success) setState(result.data);
        else setError(result.error.message);
      });
    });
    socket.on("game.state", (value: GameState) => setState(value));
    socket.on("game.room.snapshot", (value: GameState) => setState(value));
    socket.on("game.countdown", (value: { roomCode: string; durationMs: number }) => {
      setStatusMessage(`Round dimulai dalam ${Math.ceil(value.durationMs / 1000)} detik`);
    });
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, user]);

  const [statusMessage, setStatusMessage] = useState("");
  const currentPlayer = useMemo(() => state?.players.find((player) => player.id === user?.id) ?? null, [state, user]);

  function emitReady() {
    socketRef.current?.emit("game.player.ready", { ready: !currentPlayer?.ready }, (result: SocketResult<GameState>) => {
      if (result.success) setState(result.data);
      else setError(result.error.message);
    });
  }

  function startRound() {
    socketRef.current?.emit("game.start", (result: SocketResult<GameState>) => {
      if (result.success) setState(result.data);
      else setError(result.error.message);
    });
  }

  function requestRematch() {
    socketRef.current?.emit("game.rematch.request", (result: SocketResult<{ rematch: boolean }>) => {
      if (!result.success) setError(result.error.message);
      else setStatusMessage("Rematch diminta");
    });
  }

  function sendInput(input: { x: number; y: number; sequence: number }) {
    socketRef.current?.emit("game.input", input);
  }

  return (
    <main>
      <h1>Arena Skor {code}</h1>
      <button type="button" onClick={() => router.push("/game")}>Kembali ke daftar room</button>
      <p>{statusMessage}</p>
      {state ? (
        <section>
          <p>Status: {state.status}; tersisa: {state.remainingSeconds} detik</p>
          <button type="button" onClick={emitReady}>{currentPlayer?.ready ? "Batal ready" : "Ready"}</button>
          {user?.id === state.hostId ? <button type="button" onClick={startRound}>Mulai round</button> : null}
          {state.status === "FINISHED" ? <button type="button" onClick={requestRematch}>Minta rematch</button> : null}
          <ul>
            {state.players.map((player) => <li key={player.id}>{player.displayName}: {player.score} poin, {player.tokens} token</li>)}
          </ul>
          {state.status === "PLAYING" ? <GameCanvas state={state} onInput={sendInput} /> : null}
        </section>
      ) : <p>Memuat room...</p>}
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
