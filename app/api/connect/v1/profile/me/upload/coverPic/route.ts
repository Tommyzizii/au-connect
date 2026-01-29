import { NextRequest } from "next/server";
import { saveMyCoverPic } from "@/lib/coverPhotoFunctions";

export async function POST(req: NextRequest) {
  return saveMyCoverPic(req);
}
