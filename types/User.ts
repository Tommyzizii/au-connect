// types/User.ts
import Experience from "./Experience";
import Education from "./Education";
import PostType from "./Post";

type User = {
  id: string;

  // required fields
  username: string; 
  slug: string;

  // optional fields
  title?: string;
  about?: string;
  location?: string;

  phoneNo?: string;
  phonePublic?: boolean;
  emailPublic?: boolean;

  coverPhoto?: string;
  profilePic?: string;
  createdAt?: string;

  experience?: Experience[];
  education?: Education[];
  posts?: PostType[];
  connections?: number;

  // name: string;
  // avatar: string;
  // followers: number
  // following: number
};

export default User;
