export type InboxPeer = {
  type: "USER" | "COMMUNITY";
  id: string;
  name: string;
  subtitle: string | null;
  profilePic: string | null;
  slug?: string;
};

export type InboxRow = {
  peer: InboxPeer;
  conversationId: string | null;
  lastMessageAt: string | null;   // ISO string from API
  lastMessageText: string | null;
  unreadCount: number;
  conversationUpdatedAt: string | null;
};
export default InboxRow;
