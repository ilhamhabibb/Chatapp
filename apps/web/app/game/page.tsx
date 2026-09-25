"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameRoomSummary } from "@chating/contracts";
import { apiFetch, jsonBody } from "../../lib/api";

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

  return (
    <main>
      <h1>Arena Skor</h1>
      <p>Maksimal empat pemain. Kumpulkan token dan hindari hazard.</p>
      <button type="button" onClick={() => void createRoom()}>Buat game room</button>
      <form onSubmit={joinRoom}>
        <label>
          Kode room
          <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} required />
        </label>
        <button type="submit">Gabung room</button>
      </form>
      <button type="button" onClick={() => void loadRooms()}>Muat ulang</button>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <button type="button" onClick={() => router.push(`/game/${room.code}`)}>
              {room.code}: {room.playerCount}/{room.maxPlayers} - {room.status}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
