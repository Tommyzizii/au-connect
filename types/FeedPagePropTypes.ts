import User from "@/types/User";
import PostType from "@/types/Post";
import AC_Event from '@/types/AC_Event'
 
export type LeftProfilePropTypes = {
  user: User | null
  loading: boolean
};
 
export type MainFeedPropTypes = {
  user: User;
  userLoading: boolean;
  posts: PostType[];
  loading: boolean;
 
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};
 
 
export type RightEventsProfileTypes = {
  events: Array<AC_Event>
  loading: boolean
};