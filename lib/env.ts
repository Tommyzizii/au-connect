/**
 * file to put all environment variable related code
**/

import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  console.log('condition check: ' + !value)
  if (!value) {
    throw new Error(`Environment variable "${name}" is missing`);
  }
  return value;
}

export const GOOGLE_CLIENT_ID = required("GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = required("GOOGLE_CLIENT_SECRET");
export const GOOGLE_REDIRECT_URI = required("GOOGLE_REDIRECT_URI");
export const LINKEDIN_CLIENT_ID = required("LINKEDIN_CLIENT_ID");
export const LINKEDIN_CLIENT_SECRET = required("LINKEDIN_CLIENT_SECRET");
export const LINKEDIN_REDIRECT_URI = required("LINKEDIN_REDIRECT_URI");
export const JWT_SECRET = required("JWT_SECRET");
export const NEXT_PUBLIC_BASE_URL = required("NEXT_PUBLIC_BASE_URL");
export const NODE_ENV = process.env.NODE_ENV || 'development';

