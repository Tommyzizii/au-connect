export type ShareRecipient = {
  id: string;
  username: string;
  title: string | null;
  profilePic: string | null;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : undefined;
}

export function getShareRecipients(connections: unknown, inbox: unknown): ShareRecipient[] {
  const candidates: unknown[] = Array.isArray(connections) ? [...connections] : [];
  for (const row of Array.isArray(inbox) ? inbox : []) {
    const peer = record(record(row)?.peer);
    if (peer?.type !== "USER") continue;
    candidates.push({
      id: peer.id,
      username: peer.name,
      title: peer.subtitle,
      profilePic: peer.profilePic,
    });
  }

  const recipients = new Map<string, ShareRecipient>();
  for (const candidate of candidates) {
    const user = record(candidate);
    if (!user || typeof user.id !== "string" || !user.id || typeof user.username !== "string") continue;
    recipients.set(user.id, {
      id: user.id,
      username: user.username,
      title: typeof user.title === "string" ? user.title : null,
      profilePic: typeof user.profilePic === "string" ? user.profilePic : null,
    });
  }
  return [...recipients.values()];
}
