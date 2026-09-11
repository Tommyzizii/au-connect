export type ChatMessage = {
  id: string;
  senderId: string | null;
  receiverId: string | null;
  senderActorType?: "USER" | "COMMUNITY";
  senderCommunityId?: string | null;
  receiverActorType?: "USER" | "COMMUNITY";
  receiverCommunityId?: string | null;
  text: string | null;
  kind?: "TEXT" | "SHARED_POST";
  sharedPostId?: string | null;
  sharedPost?: {
    id: string;
    username: string;
    profilePic: string | null;
    actorType: "USER" | "COMMUNITY";
    community?: { name: string; profilePic: string | null } | null;
    postType: string;
    title: string | null;
    content: string;
    mediaTypes: string[];
  } | null;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
};

export default ChatMessage;
