import { NextRequest } from "next/server";
import { getMyExperience } from "@/lib/experienceFunctions";

export async function GET(req: NextRequest) {
  return getMyExperience(req);
}
