type PostType = {
  // ---------- core ----------
  id: string; 

  // ---------- mock fields ----------
  author?: string;
  education?: string;
  avatar?: string;
  timestamp?: string;
  image?: string;

  // ---------- real post fields ----------
  userId?: string;
  username?: string;
  profilePic?: string | null;

  postType?: string;
  visibility?: string | null;

  title?: string | null;
  content?: string;

  media?: {
    blobName: string;
    url: string;
    type: string;
    name?: string;
    mimeType?: string;
    size?: number;
  }[] | null;

  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  numOfComments?: number;

  createdAt?: string | Date;
  updatedAt?: string | Date;

};

export default PostType;