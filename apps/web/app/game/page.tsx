"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameRoomSummary, GameRoomStatus } from "@chating/contracts";
import { apiFetch, jsonBody } from "../../lib/api";
import { AppHeader } from "../../components/ui/shell";
import { Button, buttonStyles } from "../../components/ui/button";
import { Card, CardHeader, TextInput } from "../../components/ui/primitives";
import { Notice } from "../../components/ui/notice";
import { GamepadIcon, UsersIcon } from "../../components/ui/icons";
import type { Status } from "../../components/ui/status-dot";
import { StatusDot } from "../../components/ui/status-dot";

const statusMeta: Record<GameRoomStatus, { label: string; dot: Status; open: boolean }> = {
  WAITING: { label: "Menunggu pemain", dot: "idle", open: true },
  COUNTDOWN: { label: "Hitung mundur", dot: "idle", open: true },
  PLAYING: { label: "Ronde berjalan", dot: "online", open: false },
  FINISHED: { label: "Selesai", dot: "offline", open: false },
  CLOSED: { label: "Ditutup", dot: "offline", open: false },
};

export default function GamePage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<GameRoomSummary[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  async function loadRooms() {
    try {
      setRooms(await apiFetch<GameRoomSummary[]>("/api/game/rooms"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Room gagal dimuat");
    }
  }

  useEffect(() => {
    void loadRooms();
  }, []);

  async function createRoom() {
    setError("");
    try {
      const room = await apiFetch<GameRoomSummary>("/api/game/rooms", jsonBody({ roundDurationSeconds: 90 }));
      router.push(`/game/${room.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Room gagal dibuat");
    }
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joinCode.trim()) router.push(`/game/${joinCode.trim().toUpperCase()}`);
  }

  const joinable = rooms.filter((room) => statusMeta[room.status].open);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <AppHeader subtitle="Arena Skor" />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-10">
        <section className="flex flex-col items-start gap-6 border-b border-hairline pb-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="label-caps inline-flex items-center gap-2 rounded-full border border-hairline bg-inset px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-online" />
              {joinable.length} room bisa digabung
            </span>
            <h1 className="mt-5 text-[2.25rem] leading-tight">Arena Skor</h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              Maksimal empat pemain. Kumpulkan token, hindari hazard, dan pemain yang bertahan
              paling lama dengan skor tertinggi akan menutup ronde.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
            <Button variant="primary" size="lg" onClick={() => void createRoom()} className="justify-center">
              <GamepadIcon width={18} height={18} />
              Buat game room
            </Button>

            <form onSubmit={joinRoom} className="flex gap-2">
              <label htmlFor="join-code" className="sr-only">
                Kode room
              </label>
              <TextInput
                id="join-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Kode room"
                maxLength={6}
                className="w-32 text-center font-display text-sm font-bold uppercase tracking-[0.2em]"
                required
              />
              <Button type="submit" variant="secondary" size="lg">
                Gabung
              </Button>
            </form>
          </div>
        </section>

        {error ? (
          <div className="mt-6 max-w-xl">
            <Notice tone="danger">{error}</Notice>
          </div>
        ) : null}

        <section className="py-8">
          <Card>
            <CardHeader
              title="Room tersedia"
              icon={<UsersIcon width={17} height={17} className="text-faint" />}
              action={
                <Button variant="subtle" size="sm" onClick={() => void loadRooms()}>
                  Muat ulang
                </Button>
              }
            />

            {rooms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <GamepadIcon width={30} height={30} className="text-faint" />
                <p className="font-display text-base font-semibold text-heading">Belum ada room aktif</p>
                <p className="max-w-sm text-sm text-muted">
                  Buat room pertama kamu, lalu bagikan kode empat huruf ke teman.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {rooms.map((room) => {
                  const meta = statusMeta[room.status];
                  const full = room.playerCount >= room.maxPlayers;
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        disabled={!meta.open || full}
                        onClick={() => router.push(`/game/${room.code}`)}
                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-inset font-display text-sm font-bold tracking-[0.12em] text-heading">
                          {room.code}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                              {meta.label}
                            </span>
                            <StatusDot status={meta.dot} size={8} />
                          </span>
                          <span className="mt-1 block text-xs text-faint">
                            {meta.open ? "Klik untuk masuk room" : "Ronde sedang berjalan atau sudah ditutup"}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                          <UsersIcon width={15} height={15} />
                          <span className="tabular-nums">
                            {room.playerCount}/{room.maxPlayers}
                          </span>
                        </span>

                        {meta.open && !full ? (
                          <span className={buttonStyles({ variant: "secondary", size: "sm" })}>Gabung</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
