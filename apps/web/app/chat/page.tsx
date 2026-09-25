"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConversationSummary, Message, MessagePage, PublicUser } from "@chating/contracts";
import { CHAT_NAMESPACE } from "@chating/contracts";
import { apiFetch, jsonBody } from "../../lib/api";
import { createRealtimeSocket } from "../../lib/socket";

type CurrentUser = PublicUser & { email: string; emailVerified: boolean };

export default function ChatPage() {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [publicName, setPublicName] = useState("");
  const [privateUserId, setPrivateUserId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => conversations.find((conversation) => conversation.id === selectedId) ?? null, [conversations, selectedId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentUser = await apiFetch<CurrentUser>("/api/auth/me");
        if (!active) return;
        setUser(currentUser);
        const list = await apiFetch<ConversationSummary[]>("/api/conversations");
        if (!active) return;
        setConversations(list);
        if (list[0]) setSelectedId(list[0].id);
      } catch {
        router.replace("/login");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const socket = createRealtimeSocket(CHAT_NAMESPACE);
    socketRef.current = socket;
    socket.on("connect", () => setStatus("Terhubung"));
    socket.on("disconnect", () => setStatus("Terputus"));
    socket.on("message.created", (message: Message) => {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100));
    });
    socket.on("typing.updated", (payload: { userId: string; isTyping: boolean }) => {
      setStatus(payload.isTyping ? "Someone is typing" : "Terhubung");
    });
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) return;
    let active = true;
    socket.emit("conversation.join", { conversationId: selectedId });
    void apiFetch<MessagePage>(`/api/conversations/${selectedId}/messages`).then((history) => {
      if (active) setMessages(history.items);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "Riwayat gagal dimuat");
    });
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function createPublicRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const conversation = await apiFetch<ConversationSummary>("/api/conversations/public", jsonBody({ name: publicName }));
      setConversations((current) => [conversation, ...current]);
      setSelectedId(conversation.id);
      setPublicName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Public room gagal dibuat");
    }
  }

  async function createPrivateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const conversation = await apiFetch<ConversationSummary>("/api/conversations/private", jsonBody({ userId: privateUserId }));
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setPrivateUserId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Private chat gagal dibuat");
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !body.trim()) return;
    socketRef.current?.emit("message.send", { conversationId: selectedId, clientMessageId: crypto.randomUUID(), body: body.trim() });
    setBody("");
  }

  function updateBody(value: string) {
    setBody(value);
    if (selectedId) {
      socketRef.current?.emit(value ? "typing.start" : "typing.stop", { conversationId: selectedId });
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!user) return <main>Memuat sesi...</main>;

  return (
    <main>
      <header>
        <h1>Chat</h1>
        <span>{user.displayName} ({user.username})</span>
        <span>ID: {user.id}</span>
        <span>{status}</span>
        <button type="button" onClick={() => router.push("/game")}>Buka game</button>
        <button type="button" onClick={() => void logout()}>Logout</button>
      </header>
      <section>
        <h2>Percakapan</h2>
        <form onSubmit={createPublicRoom}>
          <label>
            Public room
            <input value={publicName} onChange={(event) => setPublicName(event.target.value)} placeholder="Nama room" required />
          </label>
          <button type="submit">Buat public room</button>
        </form>
        <form onSubmit={createPrivateRoom}>
          <label>
            User ID untuk private chat
            <input value={privateUserId} onChange={(event) => setPrivateUserId(event.target.value)} placeholder="UUID user" required />
          </label>
          <button type="submit">Buat private chat</button>
        </form>
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button type="button" onClick={() => setSelectedId(conversation.id)}>
                {conversation.name ?? (conversation.type === "PRIVATE" ? "Private chat" : "Public room")} ({conversation.memberCount})
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{selected?.name ?? (selected ? "Private chat" : "Pilih percakapan")}</h2>
        <ul>
          {messages.map((message) => (
            <li key={message.id}>
              <strong>{message.sender.displayName}</strong>: {message.body}
            </li>
          ))}
        </ul>
        <form onSubmit={sendMessage}>
          <label>
            Pesan
            <input value={body} onChange={(event) => updateBody(event.target.value)} disabled={!selectedId} />
          </label>
          <button type="submit" disabled={!selectedId || !body.trim()}>Kirim</button>
        </form>
      </section>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
