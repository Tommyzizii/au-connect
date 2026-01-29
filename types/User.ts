import Experience from "./Experience";
import Education from "./Education";
import PostType from "./Post";
import { ProfilePicCrop } from "./ProfilePicCrop";
import { ProfileCoverCrop } from "./ProfileCoverCrop";

type User = {
  id: string;
  username: string;
  slug: string;

  title?: string;
  about?: string;
  location?: string;

  email?: string;
  phoneNo?: string;

  phonePublic?: boolean;
  emailPublic?: boolean;

  coverPhoto?: string;
  coverPhotoOriginal?: string;
  coverPhotoCrop?: ProfileCoverCrop | null;

  profilePic?: string;
  profilePicOriginal?: string;
  profilePicCrop?: ProfilePicCrop | null;

  createdAt?: string;

  connections?: number;

  experience?: Experience[];
  education?: Education[];
  posts?: PostType[];
};

export default User;
