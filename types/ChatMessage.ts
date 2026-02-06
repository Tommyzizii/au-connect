export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
};

export default ChatMessage;
