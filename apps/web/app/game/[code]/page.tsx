"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { GameState, GameRoomStatus, PublicUser } from "@chating/contracts";
import { GAME_NAMESPACE } from "@chating/contracts";
import { apiFetch } from "../../../lib/api";
import { createRealtimeSocket } from "../../../lib/socket";
import { GameCanvas } from "../../../features/game/game-canvas";
import { AppHeader } from "../../../components/ui/shell";
import { Avatar } from "../../../components/ui/avatar";
import { Button, buttonStyles } from "../../../components/ui/button";
import { Card, CardHeader } from "../../../components/ui/primitives";
import { Notice } from "../../../components/ui/notice";
import { StatusDot } from "../../../components/ui/status-dot";
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, CopyIcon, GamepadIcon, TrophyIcon } from "../../../components/ui/icons";

type CurrentUser = PublicUser & { email: string; emailVerified: boolean };

type SocketResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

const statusLabel: Record<GameRoomStatus, string> = {
  WAITING: "Menunggu pemain",
  COUNTDOWN: "Hitung mundur",
  PLAYING: "Ronde berjalan",
  FINISHED: "Ronde selesai",
  CLOSED: "Room ditutup",
};

export default function GameRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const code = String(params.code).toUpperCase();

  useEffect(() => {
    let active = true;
    void apiFetch<CurrentUser>("/api/auth/me")
      .then((value) => {
        if (active) setUser(value);
      })
      .catch(() => router.replace("/login"));
    return () => {
      active = false;
    };
  }, [code, router]);

  const [statusMessage, setStatusMessage] = useState("");

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
    socket.on("disconnect", () => setError("Koneksi terputus, mencoba menyambung ulang..."));
    socket.on("connect_error", () => setError("Tidak bisa terhubung ke server realtime."));
    socket.on("game.state", (value: GameState) => setState(value));
    socket.on("game.room.snapshot", (value: GameState) => {
      setError("");
      setState(value);
    });
    socket.on("game.countdown", (value: { roomCode: string; durationMs: number }) => {
      setStatusMessage(`Round dimulai dalam ${Math.ceil(value.durationMs / 1000)} detik`);
    });
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, user]);

  const currentPlayer = useMemo(
    () => state?.players.find((player) => player.id === user?.id) ?? null,
    [state, user],
  );

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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kode tidak bisa disalin");
    }
  }

  const slots = state?.players ?? [];
  const emptySlots = Math.max(0, 4 - slots.length);
  const isHost = user != null && state != null && user.id === state.hostId;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <AppHeader
        subtitle={`Room ${code}`}
        actions={
          <Link href="/game" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <ArrowLeftIcon width={16} height={16} />
            Daftar room
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="label-caps">Kode room</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-display text-3xl font-bold tracking-[0.12em] text-heading">{code}</span>
              <Button variant="subtle" size="sm" onClick={() => void copyCode()}>
                {copied ? <CheckCircleIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
                {copied ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>

          {state ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-inset px-3 py-1.5 text-xs font-medium text-muted">
                <span
                  className={`size-1.5 rounded-full ${
                    state.status === "PLAYING" ? "bg-online" : state.status === "FINISHED" ? "bg-offline" : "bg-idle"
                  }`}
                />
                {statusLabel[state.status]}
              </span>

              {state.status === "PLAYING" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 font-display text-sm font-bold text-accent-text tabular-nums">
                  <ClockIcon width={15} height={15} />
                  {state.remainingSeconds}s
                </span>
              ) : null}

              <Button variant={currentPlayer?.ready ? "secondary" : "primary"} onClick={emitReady}>
                {currentPlayer?.ready ? "Batal ready" : "Ready"}
              </Button>

              {isHost ? (
                <Button variant="primary" onClick={startRound} disabled={state.status !== "WAITING"}>
                  <GamepadIcon width={16} height={16} />
                  Mulai round
                </Button>
              ) : null}

              {state.status === "FINISHED" ? (
                <Button variant="secondary" onClick={requestRematch}>
                  Minta rematch
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {statusMessage ? (
          <div className="mt-5 max-w-xl">
            <Notice tone="info">{statusMessage}</Notice>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 max-w-xl">
            <Notice tone="danger">{error}</Notice>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {state?.status === "PLAYING" ? (
              <Card className="overflow-hidden bg-float p-0">
                <GameCanvas state={state} onInput={sendInput} />
              </Card>
            ) : (
              <Card className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <TrophyIcon width={34} height={34} className="text-faint" />
                <p className="font-display text-lg font-semibold text-heading">
                  {state ? statusLabel[state.status] : "Memuat room..."}
                </p>
                <p className="max-w-md text-sm text-muted">
                  {state?.status === "WAITING"
                    ? `Bagikan kode ${code} ke teman. Ronde dimulai setelah semua pemain siap.`
                    : state?.status === "FINISHED"
                      ? "Ronde sudah selesai. Minta rematch untuk bermain lagi."
                      : "Arena akan tampil di sini saat ronde berjalan."}
                </p>
              </Card>
            )}

            <p className="mt-3 hidden text-xs text-faint sm:block">
              Kontrol keyboard: <kbd className="rounded-field bg-inset px-1.5 py-0.5 font-display font-semibold">W</kbd>{" "}
              <kbd className="rounded-field bg-inset px-1.5 py-0.5 font-display font-semibold">A</kbd>{" "}
              <kbd className="rounded-field bg-inset px-1.5 py-0.5 font-display font-semibold">S</kbd>{" "}
              <kbd className="rounded-field bg-inset px-1.5 py-0.5 font-display font-semibold">D</kbd>{" "}
              atau tombol arrow
            </p>
          </div>

          <div>
            <Card>
              <CardHeader
                title="Pemain"
                icon={<TrophyIcon width={17} height={17} className="text-faint" />}
                action={
                  <span className="text-xs text-faint tabular-nums">
                    {slots.length}/4
                  </span>
                }
              />

              <ul className="flex flex-col gap-1.5 p-3">
                {slots
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <li
                      key={player.id}
                      className={`flex items-center gap-3 rounded-field px-2.5 py-2.5 ${
                        player.id === user?.id ? "bg-accent-soft" : "bg-inset"
                      }`}
                    >
                      <span className="w-3 font-display text-xs font-bold text-faint">{index + 1}</span>
                      <div className="relative shrink-0">
                        <Avatar name={player.displayName} seed={player.id} size={32} />
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface">
                          <StatusDot status={player.connected ? "online" : "offline"} size={11} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-heading">
                          {player.displayName}
                          {player.id === state?.hostId ? (
                            <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-on-accent">
                              host
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-faint">{player.tokens} token</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-sm font-bold text-heading tabular-nums">{player.score}</p>
                        {player.ready ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-online">ready</p>
                        ) : (
                          <p className="text-[10px] uppercase tracking-wide text-faint">belum</p>
                        )}
                      </div>
                    </li>
                  ))}

                {Array.from({ length: emptySlots }).map((_, index) => (
                  <li
                    key={`empty-${index}`}
                    className="flex items-center gap-3 rounded-field border border-dashed border-strong px-2.5 py-2.5"
                  >
                    <span className="w-3 font-display text-xs font-bold text-faint">{slots.length + index + 1}</span>
                    <StatusDot status="offline" />
                    <p className="flex-1 text-[13px] text-faint">Slot kosong</p>
                    <span className="text-[11px] text-faint">Kirim kode {code}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
