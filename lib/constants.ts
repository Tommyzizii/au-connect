/*
 * GLOBAL VARIABLES USED ACROSS THE APP
 * contains routes, paths and other constants
 */

export const BASE_API_PATH = "/api/connect/v1";

export const MAIN_PAGE_PATH = "/";
export const POST_DETAIL_PAGE_PATH = (
  postId: string,
  index?: number,
  ref?: string,
) => {
  const params = new URLSearchParams();

  if (index !== undefined) {
    params.set("media", index.toString());
  }

  if (ref) {
    params.set("ref", ref);
  }

  const queryString = params.toString();
  return `/posts/${postId}${queryString ? `?${queryString}` : ""}`;
};
export const SIGNIN_PAGE_PATH = "/auth/register";
export const ONBOARD_PAGE_PATH = "/auth/onboarding";
export const CONNECT_PAGE_PATH = "/connect";
export const MESSAGES_PAGE_PATH = "/messages";

export const PROFILE_PAGE_PATH = "/profile";

export const NOTIFICATION_PAGE_PATH = "/notifications";

export const HEADER_HIDDEN_PAGES = [SIGNIN_PAGE_PATH, ONBOARD_PAGE_PATH];

// paths to to push to for OAuth sign-in
export const GOOGLE_AUTH_DIRECT_PATH = BASE_API_PATH + "/auth/google";
export const LINKEDIN_AUTH_DIRECT_PATH = BASE_API_PATH + "/auth/linkedin";
export const MICROSOFT_AUTH_DIRECT_PATH = BASE_API_PATH + "/auth/azure-ad";

// api routes
export const LOGOUT_API_PATH = BASE_API_PATH + "/auth/logout";
export const ME_API_PATH = BASE_API_PATH + "/profile/me";

// POST create comments/replies
export const COMMENT_API_PATH = (postId: string) =>
  BASE_API_PATH + `/posts/${postId}/comments`;

export const REPLIES_API_PATH = (postId: string, commentId: string) =>
  BASE_API_PATH + `/posts/${postId}/comments/${commentId}/replies`;
export const JOB_APPLICATION_API_PATH = (jobPostId: string) =>
  BASE_API_PATH + `/jobs/${jobPostId}/apply`;

export const SAVE_POST_API_PATH = (postId: string) =>
  BASE_API_PATH + `/posts/${postId}/save`;

export const LIKE_POST_API_PATH = (postId: string) =>
  BASE_API_PATH + `/posts/${postId}/like`;

export const VOTE_POST_API_PATH = (postId: string) =>
  BASE_API_PATH + `/posts/${postId}/vote`;

// api path for many posts
export const POST_API_PATH = BASE_API_PATH + "/posts";

// get single post api path
export const SINGLE_POST_API_PATH = (postId: string) => {
  return BASE_API_PATH + `/posts/${postId}`;
};
export const SHARE_POST_API_PATH = (postId: string) =>
  `${BASE_API_PATH}/posts/${postId}/share`;
export const LINK_PREVIEW_API_PATH = BASE_API_PATH + `/link-preview`;

// GET all my experiences
export const GET_EXPERIENCE_API_PATH = ME_API_PATH + "/get/experienceFields";

// ADD new experience
export const ADD_EXPERIENCE_API_PATH = ME_API_PATH + "/add/experienceFields";
export const UPDATE_GENERAL_PROFILE_FIELDS_API_PATH =
  ME_API_PATH + "/update/generalFields";

// UPDATE specific experience (/:exp_id)
export const UPDATE_EXPERIENCE_API_PATH =
  ME_API_PATH + "/update/experienceFields";

// DELETE specific experience (/:exp_id)
export const DELETE_EXPERIENCE_API_PATH =
  ME_API_PATH + "/delete/experienceFields";

// GET all my education
export const GET_EDUCATION_API_PATH = ME_API_PATH + "/get/educationFields";

// Upload profile cover image
export const UPLOAD_PROFILE_COVER_API_PATH = ME_API_PATH + "/upload/coverPic";

// Upload profile image
export const UPLOAD_PROFILE_PIC_API_PATH = ME_API_PATH + "/upload/profilePic";

//Delete profile cover image
export const DELETE_PROFILE_COVER_API_PATH = ME_API_PATH + "/delete/coverPic";

// Delete profile image
export const DELETE_PROFILE_PIC_API_PATH = ME_API_PATH + "/delete/profilePic";

//Update about field of profile
export const UPDATE_PROFILE_ABOUT_API_PATH = ME_API_PATH + "/update/about";

// ADD new education
export const ADD_EDUCATION_API_PATH = ME_API_PATH + "/add/educationFields";

// UPDATE specific education (/:edu_id)
export const UPDATE_EDUCATION_API_PATH =
  ME_API_PATH + "/update/educationFields";

// DELETE specific education (/:edu_id)
export const DELETE_EDUCATION_API_PATH =
  ME_API_PATH + "/delete/educationFields";

export const MEDIA_UPLOAD_API_PATH = BASE_API_PATH + "/upload-media";

// OAuth URLs

// Google
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_ACCESS_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL =
  "https://www.googleapis.com/oauth2/v3/userinfo";
// LinkedIn
export const LINKEDIN_AUTH_URL =
  "https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_ACCESS_TOKEN_URL =
  "https://www.linkedin.com/oauth/v2/accessToken";
export const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
// Microsoft/Azure AD
export const MICROSOFT_TENANT_ID = "common";
export const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`;
export const MICROSOFT_ACCESS_TOKEN_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
export const MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me";

// Cookies
export const JWT_COOKIE = "ac_auth_token";
export const OAUTH_STATE_COOKIE = "oauth_state_token";
// in seconds
export const JWT_COOKIE_EXPIRATION_TIME = 7 * 24 * 60 * 60; // 7 days
export const OAUTH_STATE_COOKIE_EXPIRATION_TIME = 600; // 10 minutes
export const OAUTH_STATE_RANDOM_BYTES_LENGTH = 32;

// accessable image url duration for SAS token
export const SAS_TOKEN_EXPIRE_DURATION = 10 * 60 * 1000; // 10 min

// number of posts displayed before needing a refresh/another fetch
export const POST_REFRESH_LIMIT = 10;
export const POSTS_PER_FETCH = 10;
export const TOP_LEVEL_COMMENTS_FETCH_LIMIT = 15;
export const REPLIES_PER_FETCH = 5;
export const REPLY_CHARACTER_LIMIT = 5000;

// file extensions for supported media types
export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",

  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

export const FILE_STYLES: Record<string, { label: string; className: string }> =
  {
    "application/pdf": {
      label: "PDF",
      className: "bg-red-100 text-red-700",
    },
    "application/msword": {
      label: "DOC",
      className: "bg-blue-100 text-blue-700",
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      label: "DOCX",
      className: "bg-blue-100 text-blue-700",
    },
    "application/vnd.ms-excel": {
      label: "XLS",
      className: "bg-green-100 text-green-700",
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      label: "XLSX",
      className: "bg-green-100 text-green-700",
    },
    "application/vnd.ms-powerpoint": {
      label: "PPT",
      className: "bg-orange-100 text-orange-700",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        label: "PPTX",
        className: "bg-orange-100 text-orange-700",
      },
    "application/zip": {
      label: "ZIP",
      className: "bg-purple-100 text-purple-700",
    },
  };
