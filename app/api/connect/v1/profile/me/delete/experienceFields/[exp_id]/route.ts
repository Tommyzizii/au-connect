import { NextRequest } from "next/server";
import { deleteExperience } from "@/lib/experienceFunctions";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ exp_id: string }> }
) {
  const { exp_id } = await context.params; // ✅ MUST await

  if (!exp_id) {
    return new Response(
      JSON.stringify({ error: "Missing experience id" }),
      { status: 400 }
    );
  }

  return deleteExperience(req, exp_id);
}
