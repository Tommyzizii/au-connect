import { NextRequest } from "next/server";
import { deleteMyCoverPic } from "@/lib/coverPhotoFunctions";

export async function DELETE(req: NextRequest) {
  return deleteMyCoverPic(req);
}
