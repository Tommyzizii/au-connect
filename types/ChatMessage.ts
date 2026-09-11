export type ChatMessage = {
  id: string;
  senderId: string | null;
  receiverId: string | null;
  senderActorType?: "USER" | "COMMUNITY";
  senderCommunityId?: string | null;
  receiverActorType?: "USER" | "COMMUNITY";
  receiverCommunityId?: string | null;
  text: string | null;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
};

export default ChatMessage;
