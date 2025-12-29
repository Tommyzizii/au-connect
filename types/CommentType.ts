type CommentType = {
  id: string;
  username: string;
  profilePic: string;
  content: string;
  createdAt: string;
  replyCount?: number;
  replies?: CommentType[];
};

export default CommentType;