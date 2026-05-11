const ONLINE_WINDOW_MS = 20_000;

export function isAdminOnline(lastSeenAt?: Date | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() <= ONLINE_WINDOW_MS;
}

export function getOfflineTimestamp(): Date {
  return new Date(0);
}
