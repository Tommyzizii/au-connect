export const BASE_API_PATH = '/api/connect/v1';

// paths to to push to for OAuth sign-in
export const GOOGLE_AUTH_DIRECT_PATH = BASE_API_PATH + '/auth/google';
export const LINKEDIN_AUTH_DIRECT_PATH = BASE_API_PATH + '/auth/linkedin';

// OAuth URLs

// Google
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_ACCESS_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
// LinkedIn
export const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'; 
export const LINKEDIN_ACCESS_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'

// Cookie name
export const JWT_COOKIE = 'ac_auth_token';
// Number of days until the cookie expires (in days)
export const COOKIE_EXPIRATION_TIME = '7d';
