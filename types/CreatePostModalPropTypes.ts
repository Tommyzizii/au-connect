import User from "./User";
import PostType from "./Post";

type CreatePostModalPropTypes = {
  user: User;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialType?: string;
  editMode?: boolean;
  exisistingPost?: PostType;
};

export default CreatePostModalPropTypes;
