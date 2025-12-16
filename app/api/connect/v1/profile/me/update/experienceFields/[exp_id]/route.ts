import { NextRequest } from "next/server";
import { updateExperience } from "@/lib/experienceFunctions";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ exp_id: string }> }
) {
  const { exp_id } = await context.params; // ✅ REQUIRED

  if (!exp_id) {
    return new Response(
      JSON.stringify({ error: "Missing experience id" }),
      { status: 400 }
    );
  }

  return updateExperience(req, exp_id);
}
