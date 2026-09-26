export type ConversationType = "PRIVATE" | "PUBLIC";
export type ConversationRole = "OWNER" | "MODERATOR" | "MEMBER";
export type MessageKind = "TEXT" | "SYSTEM";
export const GameRoomStatus = {
  WAITING: "WAITING",
  COUNTDOWN: "COUNTDOWN",
  PLAYING: "PLAYING",
  FINISHED: "FINISHED",
  CLOSED: "CLOSED",
} as const;

export type GameRoomStatus = (typeof GameRoomStatus)[keyof typeof GameRoomStatus];
export type ParticipantStatus = "ACTIVE" | "LEFT" | "DISCONNECTED";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface ConversationMember {
  user: PublicUser;
  role: ConversationRole;
  joinedAt: string;
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  role: ConversationRole;
  lastMessage: Message | null;
  unreadCount: number;
  memberCount: number;
  peer: PublicUser | null;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: PublicUser;
  clientMessageId: string;
  body: string;
  kind: MessageKind;
  createdAt: string;
}

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

export interface GamePlayer {
  id: string;
  username: string;
  displayName: string;
  x: number;
  y: number;
  score: number;
  tokens: number;
  ready: boolean;
  connected: boolean;
}

export interface GameToken {
  id: string;
  x: number;
  y: number;
}

export interface GameHazard {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface GameState {
  roomCode: string;
  hostId: string;
  status: GameRoomStatus;
  roundDurationSeconds: number;
  remainingSeconds: number;
  players: GamePlayer[];
  tokens: GameToken[];
  hazards: GameHazard[];
}

export interface GameRoomSummary {
  id: string;
  code: string;
  status: GameRoomStatus;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
}

export interface GameResult {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  score: number;
  rank: number;
  tokensCollected: number;
  survivalTimeMs: number;
}

export interface GameInput {
  x: number;
  y: number;
  sequence: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const CHAT_NAMESPACE = "/chat";
export const GAME_NAMESPACE = "/game";
export const SESSION_COOKIE_NAME = "chating_session";
