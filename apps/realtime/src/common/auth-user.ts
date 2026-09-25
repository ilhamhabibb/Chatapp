export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  lastSeenAt: string | null;
}
