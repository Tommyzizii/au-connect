import PostType from "./Post";

type PostDetailsModalTypes = {
  currentUserId: string;
  postInfo: PostType;
  media?: { url: string; type: string }[] | null;
  title?: string | null;
  content: string | undefined;
  clickedIndex: number;
  onClose: () => void;
};

export default PostDetailsModalTypes;
