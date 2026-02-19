import JobDraft from "./JobDraft";
import LinkEmbed from "./LinkEmbeds";

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

  commentsDisabled?: boolean;
  mediaTypes?: string[];
  hasLinks?: boolean;
  media?:
    | {
        blobName: string;
        thumbnailBlobName?: string;
        url: string;
        type: string;
        name?: string;
        mimetype?: string;
        size?: number;
      }[]
    | null;

  links?: LinkEmbed[] | null;

  pollOptions: string[] | null;
  pollEndsAt: Date | undefined;
  pollVotes?: Record<string, string[]>;
  // pollSettings?: {
  //   multipleChoice?: boolean;
  // } | null;

  jobPost?: JobDraft;
  isLiked?: boolean;
  isSaved?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  numOfComments?: number;

  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default PostType;
