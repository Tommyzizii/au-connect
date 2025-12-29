type PostDetailsModalTypes = {
  postInfo: {
    id: string;
    username: string | undefined;
    profilePic: string | undefined | null;
    createdAt: string | Date | undefined;
  };
  media?: { url: string; type: string }[] | null;
  title?: string | null;
  content: string | undefined;
  clickedIndex: number;
  onClose: () => void;
};

export default PostDetailsModalTypes;