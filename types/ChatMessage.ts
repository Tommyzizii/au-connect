export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  createdAt: string; // ISO string from API
};
export default ChatMessage;