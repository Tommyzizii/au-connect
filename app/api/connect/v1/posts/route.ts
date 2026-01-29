import { NextRequest } from "next/server";

import {
  createPost,
  deletePost,
  getPosts,
  editPost,
} from "@/lib/postFunctions";

// create post
export async function POST(req: NextRequest) {
  return await createPost(req);
}

// get all posts
export async function GET(req: NextRequest) {
  return await getPosts(req);
}

// modify posts
export async function PUT(req: NextRequest) {
  return await editPost(req);
}

// delte posts
export async function DELETE(req: NextRequest) {
  return await deletePost(req);
}
