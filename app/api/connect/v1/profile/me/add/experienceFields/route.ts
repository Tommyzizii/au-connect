import { NextRequest } from "next/server";
import { addExperience } from "@/lib/experienceFunctions";

export async function POST(req: NextRequest) {
  return addExperience(req);
}
