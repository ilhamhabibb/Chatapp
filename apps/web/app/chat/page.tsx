"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConversationSummary, Message, MessagePage, PublicUser } from "@chating/contracts";
import type { Socket } from "socket.io-client";
import { CHAT_NAMESPACE } from "@chating/contracts";
import { apiFetch, jsonBody } from "../../lib/api";
import { createRealtimeSocket } from "../../lib/socket";
import { formatClock } from "../../lib/format";
import { createClientMessageId } from "../../lib/uuid";
import { AppHeader } from "../../components/ui/shell";
import { Avatar } from "../../components/ui/avatar";
import { Button, buttonStyles } from "../../components/ui/button";
import { Card, TextInput } from "../../components/ui/primitives";
import { Notice } from "../../components/ui/notice";
import { StatusDot } from "../../components/ui/status-dot";
import { UserSearchPicker } from "../../features/chat/user-search-picker";
import { HashIcon, LockIcon, LogoutIcon, MenuIcon, SendIcon, UsersIcon } from "../../components/ui/icons";

type CurrentUser = PublicUser & { email: string; emailVerified: boolean };

type RoomKind = "public" | "private";

function joinConversation(
  socket: Socket,
  conversationId: string,
  onError: (message: string) => void,
): void {
  socket.emit(
    "conversation.join",
    { conversationId },
    (result: SocketResult<{ conversationId: string }>) => {
      if (!result.success) onError(result.error.message);
    },
  );
}

type SocketResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

export default function ChatPage() {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeConversationRef = useRef("");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [publicName, setPublicName] = useState("");
  const [roomKind, setRoomKind] = useState<RoomKind>("public");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creatingPrivate, setCreatingPrivate] = useState(false);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

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
    // Socket.IO reconnects on its own after a network drop. Server-side rooms are
    // lost on reconnect, so the join has to be replayed or realtime delivery
    // silently stops until a full page reload.
    socket.on("connect", () => {
      setStatus("Terhubung");
      const conversationId = activeConversationRef.current;
      if (conversationId) joinConversation(socket, conversationId, setError);
    });
    socket.on("disconnect", () => setStatus("Terputus"));
    socket.on("connect_error", () => {
      setStatus("Terputus");
      setError("Tidak bisa terhubung ke server realtime. Coba muat ulang halaman.");
    });
    socket.on("message.created", (message: Message) => {
      if (message.conversationId !== activeConversationRef.current) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100),
      );
    });
    socket.on("typing.updated", (payload: { userId: string; isTyping: boolean }) => {
      setStatus(payload.isTyping ? "Seseorang sedang mengetik" : "Terhubung");
    });
    socket.connect();
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    activeConversationRef.current = selectedId;
    const socket = socketRef.current;
    if (!socket || !selectedId) return;
    let active = true;
    joinConversation(socket, selectedId, (message) => {
      if (active) setError(message);
    });
    void apiFetch<MessagePage>(`/api/conversations/${selectedId}/messages`)
      .then((history) => {
        if (active) setMessages(history.items);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Riwayat gagal dimuat");
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  async function createPublicRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const conversation = await apiFetch<ConversationSummary>(
        "/api/conversations/public",
        jsonBody({ name: publicName }),
      );
      setConversations((current) => [conversation, ...current]);
      setSelectedId(conversation.id);
      setPublicName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Public room gagal dibuat");
    }
  }

  async function startPrivateChat(target: PublicUser) {
    setError("");
    setCreatingPrivate(true);
    try {
      const conversation = await apiFetch<ConversationSummary>(
        "/api/conversations/private",
        jsonBody({ userId: target.id }),
      );
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setRoomKind("public");
      setDrawerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Private chat gagal dibuat");
    } finally {
      setCreatingPrivate(false);
    }
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    setDrawerOpen(false);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const socket = socketRef.current;
    if (!selectedId || !body.trim() || !socket) return;
    const text = body.trim();
    setBody("");
    socket.emit(
      "message.send",
      { conversationId: selectedId, clientMessageId: createClientMessageId(), body: text },
      (result: SocketResult<Message>) => {
        if (result.success) {
          // Clear a previous failure so a stale banner does not outlive the
          // message that caused it.
          setError("");
          return;
        }
        setBody(text);
        setError(result.error.message);
      },
    );
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

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface">
        <p className="text-sm text-muted">Memuat sesi...</p>
      </div>
    );
  }

  const connectionStatus = status === "Terhubung" ? "online" : status === "Terputus" ? "offline" : "idle";
  const connectionLabel = status === "Someone is typing" ? "Someone is typing" : status;
  const selectedTitle = selected
    ? selected.type === "PRIVATE"
      ? (selected.peer?.displayName ?? "Private chat")
      : (selected.name ?? "Public room")
    : "Pilih percakapan";

  const sidebar = (
    <aside className="flex h-full w-[290px] shrink-0 flex-col border-r border-hairline bg-sidebar">
      <div className="flex items-center gap-2 px-4 pb-3 pt-5">
        <Avatar name={user.displayName} seed={user.id} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-heading">{user.displayName}</p>
          <p className="truncate text-xs text-faint">@{user.username}</p>
        </div>
      </div>

          <div className="px-4 pb-3">
            <div className="mb-2 flex rounded-field bg-inset p-0.5">
              {(["public", "private"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setRoomKind(kind)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-[3px] py-2.5 text-xs font-medium transition-colors ${
                    roomKind === kind ? "bg-surface text-heading shadow-sm" : "text-faint hover:text-heading"
                  }`}
                >
                  {kind === "public" ? <HashIcon width={14} height={14} /> : <LockIcon width={14} height={14} />}
                  {kind === "public" ? "Public" : "Privat"}
                </button>
              ))}
            </div>

            {roomKind === "public" ? (
              <form onSubmit={createPublicRoom} className="flex gap-1.5">
                <TextInput
                  value={publicName}
                  onChange={(event) => setPublicName(event.target.value)}
                  placeholder="Nama room"
                  aria-label="Nama public room"
                  required
                />
                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  Buat
                </Button>
              </form>
            ) : (
              <UserSearchPicker
                currentUserId={user.id}
                onPick={startPrivateChat}
                disabled={creatingPrivate}
              />
            )}
          </div>

          <div className="px-4 pb-2">
            <span className="label-caps">Percakapan</span>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {conversations.length === 0 ? (
              <p className="px-2 py-3 text-xs text-faint">Belum ada percakapan. Buat room di atas.</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {conversations.map((conversation) => {
                const active = conversation.id === selectedId;
                const isPrivate = conversation.type === "PRIVATE";
                const title = isPrivate
                  ? (conversation.peer?.displayName ?? "Private chat")
                  : (conversation.name ?? "Public room");
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-field px-2 py-2 text-left transition-colors ${
                        active ? "bg-selected text-heading" : "text-muted hover:bg-hover hover:text-heading"
                      }`}
                    >
                      {isPrivate && conversation.peer ? (
                        <span className="relative shrink-0">
                          <Avatar
                            name={conversation.peer.displayName}
                            seed={conversation.peer.id}
                            size={30}
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-sidebar">
                            <StatusDot
                              status={conversation.peer.isOnline ? "online" : "offline"}
                              size={10}
                            />
                          </span>
                        </span>
                      ) : isPrivate ? (
                        <LockIcon width={15} height={15} className="shrink-0 text-faint" />
                      ) : (
                        <HashIcon width={15} height={15} className="shrink-0 text-faint" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{title}</span>
                        {conversation.lastMessage ? (
                          <span className="block truncate text-xs text-faint">
                            {conversation.lastMessage.sender.displayName}: {conversation.lastMessage.body}
                          </span>
                        ) : (
                          <span className="block text-xs text-faint">Belum ada pesan</span>
                        )}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-on-accent">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
    </aside>
  );

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <AppHeader
        status={connectionStatus}
        actions={
          <>
            <Link href="/game" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <span className="hidden sm:inline">Buka game</span>
              <span className="sm:hidden">Game</span>
            </Link>
            <Button variant="subtle" size="sm" onClick={() => void logout()}>
              <LogoutIcon width={16} height={16} />
              <span className="sr-only sm:not-sr-only">Logout</span>
            </Button>
          </>
        }
      />

      <div className="relative flex min-h-0 flex-1">
        <div
          id="chat-sidebar"
          className={`absolute inset-y-0 left-0 z-30 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        {drawerOpen ? (
          <button
            type="button"
            aria-label="Tutup daftar percakapan"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 z-20 bg-black/45 md:hidden"
          />
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 sm:px-5">
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka daftar percakapan"
              aria-expanded={drawerOpen}
              aria-controls="chat-sidebar"
              className="md:hidden"
            >
              <MenuIcon width={16} height={16} />
            </Button>
            {selected?.type === "PRIVATE" ? (
              <LockIcon width={17} height={17} className="shrink-0 text-faint" />
            ) : (
              <HashIcon width={17} height={17} className="shrink-0 text-faint" />
            )}
            <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{selectedTitle}</h1>
            {selected ? (
              <span className="hidden shrink-0 items-center gap-1.5 text-xs text-faint sm:inline-flex">
                <UsersIcon width={14} height={14} />
                {selected.memberCount} anggota
              </span>
            ) : null}
            {connectionLabel ? (
              <span className="shrink-0 text-xs text-faint md:ml-auto">{connectionLabel}</span>
            ) : null}
          </div>

          {error ? (
            <div className="px-4 pt-4 sm:px-5">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <HashIcon width={30} height={30} className="text-faint" />
                <p className="font-display text-lg font-semibold text-heading">
                  {selected ? "Belum ada pesan di sini" : "Pilih percakapan"}
                </p>
                <p className="max-w-sm text-sm text-muted">
                  {selected
                    ? "Kirim pesan pertama dan obrolan akan langsung masuk untuk anggota lain."
                    : "Buka daftar percakapan di kiri, lalu buat room baru untuk mulai."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const grouped =
                    previous != null &&
                    previous.sender.id === message.sender.id &&
                    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;

                  return (
                    <li
                      key={message.id}
                      className={`group flex gap-3 ${grouped ? "py-0.5" : "pt-4 first:pt-0"}`}
                    >
                      <div className="w-9 shrink-0">
                        {!grouped ? (
                          <Avatar name={message.sender.displayName} seed={message.sender.id} size={36} />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        {!grouped ? (
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-sm font-semibold text-heading">
                              {message.sender.displayName}
                            </span>
                            <span className="text-[11px] text-faint">{formatClock(message.createdAt)}</span>
                          </div>
                        ) : null}
                        <p className={`text-[13.5px] leading-relaxed text-body ${grouped ? "pl-0" : ""}`}>
                          {message.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <form onSubmit={sendMessage}>
              <Card className="flex items-end gap-2 bg-inset p-2">
                <label htmlFor="composer" className="sr-only">
                  Pesan
                </label>
                <TextInput
                  id="composer"
                  value={body}
                  onChange={(event) => updateBody(event.target.value)}
                  placeholder={selectedId ? "Tulis pesan..." : "Pilih percakapan dulu"}
                  disabled={!selectedId}
                  className="border-0 bg-transparent focus:outline-none"
                />
                <Button type="submit" variant="primary" size="md" disabled={!selectedId || !body.trim()} className="shrink-0">
                  <SendIcon width={16} height={16} />
                  <span className="sr-only">Kirim</span>
                </Button>
              </Card>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
