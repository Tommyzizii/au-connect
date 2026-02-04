export type InboxRow = {
  user: {
    id: string;
    username: string;
    title: string | null;
    profilePic: string | null; // blobName | "/..." | "http(s)..." | null
  };
  conversationId: string | null;
  lastMessageAt: string | null;   // ISO string from API
  lastMessageText: string | null;
  unreadCount: number;
};
export default InboxRow;